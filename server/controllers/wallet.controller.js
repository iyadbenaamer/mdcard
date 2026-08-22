import crypto from "crypto";
import { Types } from "mongoose";

import DpayPayment from "../models/dpayPayment.model.js";
import PaymentMethod from "../models/paymentMethod.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";

import * as dpay from "../services/dpay.js";
import { handleError } from "../utils/errorHandler.js";
import { verifyDpayWebhookSignature } from "../utils/dpaySignature.js";

// Gateway top-ups are an individual-only feature - business accounts use
// admin-managed bank deposits / credit terms instead (see transaction.model.js).
const requireIndividual = (req, res) => {
  if (req.user.role !== "individual") {
    res.status(403).json({ code: "WALLET_INDIVIDUAL_ONLY" });
    return false;
  }
  return true;
};

// Atomically flips a DpayPayment from "pending" to "paid" and only the
// caller that wins the update actually credits the wallet. Both the
// synchronous OTP-verify response and the async webhook call this for the
// same session, so this is what stops a double credit when both arrive.
const creditWalletForSession = async ({ dpayPayment, txId, receiptUrl }) => {
  const claimed = await DpayPayment.findOneAndUpdate(
    { _id: dpayPayment._id, status: "pending" },
    {
      status: "paid",
      ...(txId ? { txId } : {}),
      ...(receiptUrl ? { receiptUrl } : {}),
    },
    { new: true },
  );

  if (!claimed) {
    const user = await User.findById(dpayPayment.userId);
    return { balance: user?.balance ?? null, alreadyCredited: true };
  }

  const user = await User.findById(claimed.userId);
  const balanceBefore = user.balance;
  user.balance = balanceBefore + claimed.amount;
  await user.save();

  const transaction = new Transaction({
    userId: user._id,
    type: "gateway_deposit",
    amount: claimed.amount,
    balanceBefore,
    balanceAfter: user.balance,
    paymentSessionId: claimed.sessionId,
  });
  await transaction.save();

  return { balance: user.balance, alreadyCredited: false };
};

// Falls back to asking Dpay directly for a session's status, instead of
// waiting on a webhook delivery - needed because Moamalat only confirms via
// webhook (no verify call), and lets polling resolve correctly even before
// a webhook endpoint is configured, or if a delivery is ever missed.
const reconcileSessionStatus = async (dpayPayment) => {
  let remoteSession;
  try {
    remoteSession = await dpay.getPaymentSession(dpayPayment.sessionId);
  } catch (err) {
    console.error("[wallet] failed to reconcile Dpay session", dpayPayment.sessionId, err);
    return dpayPayment.status;
  }

  const remoteStatus = remoteSession?.status;
  if (remoteStatus === "paid" || remoteStatus === "completed") {
    await creditWalletForSession({
      dpayPayment,
      txId: remoteSession.tx_id,
      receiptUrl: null,
    });
    return "paid";
  }
  if (["failed", "expired", "voided"].includes(remoteStatus)) {
    await DpayPayment.updateOne(
      { _id: dpayPayment._id, status: "pending" },
      { status: remoteStatus },
    );
    return remoteStatus;
  }
  if (remoteStatus === "refunded") {
    await DpayPayment.updateOne(
      { _id: dpayPayment._id },
      { status: "refunded" },
    );
    return "refunded";
  }
  return "pending";
};

const toWalletDpayError = (err, res) => {
  if (err.code === "DPAY_CREDENTIALS_MISSING") {
    return res.status(500).json({ code: "DPAY_CREDENTIALS_MISSING" });
  }
  if (err.code === "DPAY_REQUEST_FAILED") {
    return res
      .status(400)
      .json({ code: "WALLET_TOPUP_GATEWAY_ERROR", details: err.dpayErrors || null });
  }
  return null;
};

export const getPaymentMethods = async (req, res) => {
  try {
    if (!requireIndividual(req, res)) return;

    const paymentMethods = await PaymentMethod.find({ active: true }).sort({
      createdAt: -1,
    });
    return res.status(200).json({ paymentMethods });
  } catch (err) {
    return handleError(err, res);
  }
};

export const openTopupSession = async (req, res) => {
  try {
    if (!requireIndividual(req, res)) return;

    const { paymentMethodId, amount, fields, idempotencyKey } = req.body;

    if (!Types.ObjectId.isValid(paymentMethodId || "")) {
      return res.status(400).json({ code: "PAYMENT_METHOD_NOT_FOUND" });
    }
    
    const paymentMethod = await PaymentMethod.findById(paymentMethodId);
    if (!paymentMethod || !paymentMethod.active) {
      return res.status(404).json({ code: "PAYMENT_METHOD_NOT_FOUND" });
    }
    
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ code: "WALLET_TOPUP_AMOUNT_INVALID" });
    }
    if (
      parsedAmount < paymentMethod.minDeposit ||
      parsedAmount > paymentMethod.maxDeposit
    ) {
      return res
      .status(400)
      .json({ code: "WALLET_TOPUP_AMOUNT_OUT_OF_RANGE" });
    }
    
    const gatewayFields = {};
    for (const field of paymentMethod.fields) {
      const value = fields?.[field.key];
      if (
        field.required &&
        (value === undefined || value === null || value === "")
      ) {
        return res.status(400).json({
          code: "WALLET_TOPUP_FIELD_REQUIRED",
          field: field.key,
        });
      }
      if (value !== undefined && value !== null && value !== "") {
        gatewayFields[field.key] = value;
      }
    }

    let session;
    try {
      session = await dpay.openPaymentSession({
        payMethod: paymentMethod.name,
        amount: parsedAmount,
        fields: gatewayFields,
        idempotencyKey: idempotencyKey || crypto.randomUUID(),
      });
    } catch (err) {
      const handled = toWalletDpayError(err, res);
      if (handled) return handled;
      throw err;
    }

    const dpayPayment = new DpayPayment({
      userId: req.user._id,
      paymentMethodId: paymentMethod._id,
      payMethod: paymentMethod.name,
      sessionId: session.session_id,
      amount: session.amount,
      fee: session.fee_amount,
      total: session.total,
      status: "pending",
      idempotencyKey: idempotencyKey || null,
    });
    await dpayPayment.save();

    return res.status(200).json({
      sessionId: session.session_id,
      status: session.status,
      amount: session.amount,
      fee: session.fee_amount,
      total: session.total,
      payMethod: session.pay_method,
      expiredAt: session.expired_at,
      paymentLink: session.payment_link || null,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const verifyTopupSession = async (req, res) => {
  try {
    if (!requireIndividual(req, res)) return;

    const { sessionId, otp } = req.body;
    const parsedSessionId = Number(sessionId);
    if (!Number.isFinite(parsedSessionId) || !otp) {
      return res
        .status(400)
        .json({ code: "WALLET_TOPUP_VERIFY_FIELDS_REQUIRED" });
    }

    const dpayPayment = await DpayPayment.findOne({
      sessionId: parsedSessionId,
      userId: req.user._id,
    });
    if (!dpayPayment) {
      return res.status(404).json({ code: "WALLET_TOPUP_SESSION_NOT_FOUND" });
    }

    if (dpayPayment.status !== "pending") {
      // Already resolved - most likely the webhook beat us here. Report the
      // current state instead of calling Dpay again.
      const user = await User.findById(req.user._id);
      return res
        .status(200)
        .json({ status: dpayPayment.status, balance: user.balance });
    }

    let result;
    try {
      result = await dpay.verifyPaymentSession({
        sessionId: parsedSessionId,
        otp,
      });
    } catch (err) {
      const handled = toWalletDpayError(err, res);
      if (handled) return handled;
      throw err;
    }

    const isPaid =
      result?.payment?.status === "completed" || result?.status === "paid";

    if (!isPaid) {
      await DpayPayment.updateOne(
        { _id: dpayPayment._id, status: "pending" },
        { status: "failed" },
      );
      return res.status(200).json({ status: "failed" });
    }

    const { balance } = await creditWalletForSession({
      dpayPayment,
      txId: result.payment?.tx_id || result.tx_id,
      receiptUrl: result.receipt_url,
    });

    return res.status(200).json({ status: "paid", balance });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getTopupSession = async (req, res) => {
  try {
    if (!requireIndividual(req, res)) return;

    const parsedSessionId = Number(req.params.sessionId);
    if (!Number.isFinite(parsedSessionId)) {
      return res.status(400).json({ code: "WALLET_TOPUP_SESSION_NOT_FOUND" });
    }

    const dpayPayment = await DpayPayment.findOne({
      sessionId: parsedSessionId,
      userId: req.user._id,
    });
    if (!dpayPayment) {
      return res.status(404).json({ code: "WALLET_TOPUP_SESSION_NOT_FOUND" });
    }

    const status =
      dpayPayment.status === "pending"
        ? await reconcileSessionStatus(dpayPayment)
        : dpayPayment.status;

    return res.status(200).json({
      sessionId: dpayPayment.sessionId,
      status,
      amount: dpayPayment.amount,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

// Public endpoint - no verifyToken. Authenticated via HMAC signature instead
// (see utils/dpaySignature.js), same trust model as any other server-to-server
// webhook. Always resolves 2xx once the signature checks out, even for events
// we don't act on, so Dpay doesn't keep retrying.
export const handleDpayWebhook = async (req, res) => {
  try {
    const isValid = verifyDpayWebhookSignature({
      timestampHeader: req.header("X-DPAY-Timestamp"),
      signatureHeader: req.header("X-DPAY-Signature"),
      rawBody: req.rawBody,
      secret: process.env.DPAY_WEBHOOK_SECRET,
    });
    if (!isValid) {
      return res.status(401).json({ code: "DPAY_WEBHOOK_SIGNATURE_INVALID" });
    }

    const payload = req.body || {};

    // The event's `live` flag isn't itself covered by the signature's raw
    // body check being wrong, but sits in the signed payload - guard against
    // a live event reaching a sandbox deployment (or vice versa), since Dpay
    // webhook routing is configured on their dashboard, outside this codebase.
    const sandboxPayment = process.env.SANDBOX_PAYMENT === "true";
    if (
      typeof payload.live === "boolean" &&
      payload.live === sandboxPayment
    ) {
      return res.status(200).json({ received: true, ignored: "environment_mismatch" });
    }

    const sessionId = Number(payload.session_id);
    const dpayPayment = Number.isFinite(sessionId)
      ? await DpayPayment.findOne({ sessionId })
      : null;

    if (dpayPayment) {
      if (payload.event === "payment.paid" && dpayPayment.status === "pending") {
        await creditWalletForSession({
          dpayPayment,
          txId: payload.tx_id,
          receiptUrl: null,
        });
      } else if (
        ["payment.failed", "payment.expired", "payment.voided"].includes(
          payload.event,
        ) &&
        dpayPayment.status === "pending"
      ) {
        await DpayPayment.updateOne(
          { _id: dpayPayment._id, status: "pending" },
          { status: payload.event.replace("payment.", "") },
        );
      } else if (payload.event === "payment.refunded") {
        await DpayPayment.updateOne(
          { _id: dpayPayment._id },
          { status: "refunded" },
        );
      }

      await DpayPayment.updateOne(
        { _id: dpayPayment._id },
        { webhookReceivedAt: new Date() },
      );
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return handleError(err, res);
  }
};

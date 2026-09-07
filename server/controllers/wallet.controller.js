import crypto from "crypto";
import { Types } from "mongoose";

import PaynetPayment from "../models/paynetPayment.model.js";
import PaymentMethod from "../models/paymentMethod.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";

import * as paynet from "../services/paynet.js";
import { handleError } from "../utils/errorHandler.js";

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const roundToCents = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

// Matches the "scheme" in mdcard-mobile/app.json.
const RETURN_DEEP_LINK =
  process.env.PAYNET_RETURN_DEEP_LINK || "mdcard://topup-return";

// Gateway top-ups are an individual-only feature - business accounts use
// admin-managed bank deposits / credit terms instead (see transaction.model.js).
const requireIndividual = (req, res) => {
  if (req.user.role !== "individual") {
    res.status(403).json({ code: "WALLET_INDIVIDUAL_ONLY" });
    return false;
  }
  return true;
};

// Atomically flips a PaynetPayment from "pending" to "paid" and only the
// caller that wins the update actually credits the wallet. Both the async
// backend_url webhook and the client-driven status poll call this for the
// same payment, so this is what stops a double credit when both arrive.
const creditWalletForPayment = async ({
  paynetPayment,
  gatewayName,
  gatewayRef,
  receiptReference,
}) => {
  const claimed = await PaynetPayment.findOneAndUpdate(
    { _id: paynetPayment._id, status: "pending" },
    {
      status: "paid",
      ...(gatewayName ? { gatewayName } : {}),
      ...(gatewayRef ? { gatewayRef } : {}),
      ...(receiptReference ? { receiptReference } : {}),
    },
    { new: true },
  );

  if (!claimed) {
    const user = await User.findById(paynetPayment.userId);
    return { balance: user?.balance ?? null, alreadyCredited: true };
  }

  // Credit with an atomic $inc rather than reading the balance and writing a
  // sum derived from it. A top-up completing while the same user has a
  // checkout or an outgoing transfer in flight would otherwise persist a total
  // computed from a balance that had already moved, silently discarding
  // whichever of the two writes landed second.
  const user = await User.findOneAndUpdate(
    { _id: claimed.userId },
    { $inc: { balance: claimed.amount } },
    { new: true },
  );

  if (!user) {
    // The account disappeared between initiating the payment and confirming
    // it. Put the payment back in "pending" so the credit is retried (and is
    // visible as unresolved) instead of being recorded as done but never paid.
    await PaynetPayment.updateOne({ _id: claimed._id }, { status: "pending" });
    console.error(
      "[wallet] cannot credit pay.net.ly payment - user no longer exists",
      claimed.customRef,
      { userId: String(claimed.userId) },
    );
    return { balance: null, alreadyCredited: false };
  }

  const balanceAfter = roundToCents(user.balance);
  const balanceBefore = roundToCents(balanceAfter - claimed.amount);

  const transaction = new Transaction({
    userId: user._id,
    type: "gateway_deposit",
    amount: claimed.amount,
    balanceBefore,
    balanceAfter,
    paymentRef: claimed.customRef,
  });
  await transaction.save();

  return { balance: balanceAfter, alreadyCredited: false };
};

// Once a payment isn't obviously registered yet, don't fail it the instant a
// receipt lookup 404s - pay.net.ly may not have the reference indexed for a
// few seconds after the customer lands on the hosted page.
const FAIL_ON_404_AFTER_MS = 2 * 60 * 1000;

// Asks pay.net.ly directly for a payment's status via the Bearer-authenticated
// receipt endpoint. This - not the unsigned webhook body - is the authoritative
// confirmation before a wallet is credited. Returns the resolved status and
// never throws; a transient failure just leaves the payment "pending".
const reconcilePayment = async (paynetPayment) => {
  let receipt;
  try {
    receipt = await paynet.getReceipt({ customRef: paynetPayment.customRef });
  } catch (err) {
    if (
      err.code === "PAYNET_REQUEST_FAILED" &&
      err.status === 404 &&
      Date.now() - new Date(paynetPayment.createdAt).getTime() >
        FAIL_ON_404_AFTER_MS
    ) {
      await PaynetPayment.updateOne(
        { _id: paynetPayment._id, status: "pending" },
        { status: "failed" },
      );
      return "failed";
    }
    console.error(
      "[wallet] failed to reconcile pay.net.ly payment",
      paynetPayment.customRef,
      err,
    );
    return paynetPayment.status;
  }

  if (receipt?.result === "success" && receipt.data) {
    const paidAmount = Number(receipt.data.amount);
    if (
      Number.isFinite(paidAmount) &&
      Math.abs(paidAmount - paynetPayment.amount) > 0.01
    ) {
      // The provider reports a different amount than we initiated - don't
      // credit automatically, leave it for manual review.
      console.error(
        "[wallet] pay.net.ly receipt amount mismatch",
        paynetPayment.customRef,
        { expected: paynetPayment.amount, got: receipt.data.amount },
      );
      return paynetPayment.status;
    }

    await creditWalletForPayment({
      paynetPayment,
      gatewayName: receipt.data.gateway_name,
      gatewayRef: receipt.data.gateway_ref,
      receiptReference: receipt.data.reference,
    });
    return "paid";
  }

  // { result: "incomplete" } or anything unexpected - stay pending.
  return "pending";
};

// Test-mode fallback, used only when the receipt lookup still says pending:
// the webhook body is taken at face value so a manual POST can complete a
// top-up without paying. Still amount-checked and still idempotent via
// creditWalletForPayment's pending->paid guard.
const resolveFromWebhookPayload = async (paynetPayment, payload) => {
  const isSuccess = String(payload.result || "").toLowerCase() === "success";
  if (!isSuccess) {
    await PaynetPayment.updateOne(
      { _id: paynetPayment._id, status: "pending" },
      { status: "failed" },
    );
    return "failed";
  }

  const paidAmount = Number(payload.amount);
  if (
    Number.isFinite(paidAmount) &&
    Math.abs(paidAmount - paynetPayment.amount) > 0.01
  ) {
    console.error(
      "[wallet] test-mode webhook amount mismatch",
      paynetPayment.customRef,
      { expected: paynetPayment.amount, got: payload.amount },
    );
    return paynetPayment.status;
  }

  await creditWalletForPayment({
    paynetPayment,
    gatewayName: payload.payment_method,
    gatewayRef: payload.our_ref,
  });
  return "paid";
};

const toWalletPaynetError = (err, res) => {
  if (err.code === "PAYNET_CREDENTIALS_MISSING") {
    return res.status(500).json({ code: "PAYNET_CREDENTIALS_MISSING" });
  }
  if (err.code === "PAYNET_REQUEST_FAILED") {
    return res
      .status(400)
      .json({ code: "WALLET_TOPUP_GATEWAY_ERROR", details: err.paynetErrors || null });
  }
  return null;
};

export const getPaymentMethods = async (req, res) => {
  try {
    if (!requireIndividual(req, res)) return;

    const paymentMethods = await PaymentMethod.find({ active: true }).sort({
      createdAt: -1,
    });
    // testMode lets the client badge the top-up flow while the gateway is not
    // live yet (see services/paynet.js isSandbox).
    return res
      .status(200)
      .json({ paymentMethods, testMode: paynet.isSandbox() });
  } catch (err) {
    return handleError(err, res);
  }
};

export const openTopup = async (req, res) => {
  try {
    if (!requireIndividual(req, res)) return;

    const sandbox = paynet.isSandbox();
    const publicBaseUrl = trimTrailingSlash(process.env.PAYNET_PUBLIC_BASE_URL);
    if (!publicBaseUrl) {
      return res.status(500).json({ code: "PAYNET_CREDENTIALS_MISSING" });
    }

    const { paymentMethodId, amount } = req.body;

    if (!Types.ObjectId.isValid(paymentMethodId || "")) {
      return res.status(400).json({ code: "PAYMENT_METHOD_NOT_FOUND" });
    }

    const paymentMethod = await PaymentMethod.findById(paymentMethodId);
    if (!paymentMethod || !paymentMethod.active) {
      return res.status(404).json({ code: "PAYMENT_METHOD_NOT_FOUND" });
    }

    let parsedAmount;
    if (paymentMethod.amountEnabled === false) {
      // The method sets the amount; the app never asks the user for it.
      parsedAmount = Number(paymentMethod.fixedAmount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res
          .status(500)
          .json({ code: "PAYMENT_METHOD_FIXED_AMOUNT_MISSING" });
      }
    } else {
      parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ code: "WALLET_TOPUP_AMOUNT_INVALID" });
      }
      // Fail closed on an unbounded method. minDeposit/maxDeposit are not
      // schema-required, and comparing against an undefined bound is always
      // false in JS - so a method missing either one used to accept any amount
      // at all while looking like it was being range-checked.
      const { minDeposit, maxDeposit } = paymentMethod;
      if (!Number.isFinite(minDeposit) || !Number.isFinite(maxDeposit)) {
        return res
          .status(500)
          .json({ code: "PAYMENT_METHOD_DEPOSIT_RANGE_MISSING" });
      }
      if (parsedAmount < minDeposit || parsedAmount > maxDeposit) {
        return res
          .status(400)
          .json({ code: "WALLET_TOPUP_AMOUNT_OUT_OF_RANGE" });
      }
    }

    const user = await User.findById(req.user._id);
    const customRef = `mdcard_${crypto.randomBytes(18).toString("hex")}`;

    // The hosted page redirects here when the payment ends. A custom-scheme
    // deep link (not an https URL) is used deliberately: the WebView can never
    // load it, so onShouldStartLoadWithRequest always fires and the app closes
    // the page instantly instead of depending on a reachable web host.
    const returnUrl = `${RETURN_DEEP_LINK}?ref=${encodeURIComponent(customRef)}`;
    let initiateResult;
    try {
      initiateResult = await paynet.initiatePayment({
        amount: parsedAmount,
        // Only the amount is decided here. Email is deliberately omitted so
        // the customer types their own on the hosted page. Phone cannot be:
        // the gateway 422s without it and 501s ("Phone number Does Not Exist
        // in Local Operators") on anything that isn't a real Libyan mobile,
        // and it does pre-fill the page's phone field with it (normalised to
        // +218...), so there is no way to leave that field blank.
        phone: user.phone,
        customRef,
        backendUrl: `${publicBaseUrl}/api/webhooks/paynet`,
        frontendUrl: `${returnUrl}&status=success`,
        failedFrontendUrl: `${returnUrl}&status=failed`,
      });
    } catch (err) {
      const handled = toWalletPaynetError(err, res);
      if (handled) return handled;
      throw err;
    }

    if (initiateResult?.result !== "success" || !initiateResult?.url) {
      return res.status(400).json({ code: "WALLET_TOPUP_GATEWAY_ERROR" });
    }
    const paymentUrl = initiateResult.url;

    const paynetPayment = new PaynetPayment({
      userId: req.user._id,
      paymentMethodId: paymentMethod._id,
      payMethodLabel: paymentMethod.label,
      customRef,
      amount: parsedAmount,
      status: "pending",
      paymentUrl,
    });
    await paynetPayment.save();

    return res.status(200).json({
      paymentRef: customRef,
      paymentUrl,
      amount: parsedAmount,
      testMode: sandbox,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getTopup = async (req, res) => {
  try {
    if (!requireIndividual(req, res)) return;

    const paymentRef = String(req.params.ref || "");
    if (!paymentRef) {
      return res.status(404).json({ code: "WALLET_TOPUP_SESSION_NOT_FOUND" });
    }

    const paynetPayment = await PaynetPayment.findOne({
      customRef: paymentRef,
      userId: req.user._id,
    });
    if (!paynetPayment) {
      return res.status(404).json({ code: "WALLET_TOPUP_SESSION_NOT_FOUND" });
    }

    const status =
      paynetPayment.status === "pending"
        ? await reconcilePayment(paynetPayment)
        : paynetPayment.status;

    return res.status(200).json({
      paymentRef: paynetPayment.customRef,
      status,
      amount: paynetPayment.amount,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

// Public endpoint - no verifyToken. pay.net.ly's backend_url callback carries
// no signature, so it is treated only as a "check now" nudge: we look the
// payment up by the custom_ref we generated (unguessable) and then confirm the
// real state through the Bearer-authenticated receipt endpoint before
// crediting. The wallet credit itself is idempotent (see creditWalletForPayment).
// Always resolves 2xx once handled so the provider stops retrying.
export const handlePaynetWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    const customRef = String(payload.custom_ref || "");

    if (!customRef) {
      return res.status(200).json({ received: true, ignored: "no_custom_ref" });
    }

    const paynetPayment = await PaynetPayment.findOne({ customRef });

    if (paynetPayment) {
      if (paynetPayment.status === "pending") {
        const status = await reconcilePayment(paynetPayment);
        // In test mode a manual webhook POST is a legitimate way to complete a
        // top-up without actually paying, so trust the body as a fallback.
        if (status === "pending" && paynet.isSandbox()) {
          await resolveFromWebhookPayload(paynetPayment, payload);
        }
      }
      await PaynetPayment.updateOne(
        { _id: paynetPayment._id },
        { webhookReceivedAt: new Date() },
      );
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return handleError(err, res);
  }
};

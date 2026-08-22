import { Types } from "mongoose";

import Setting from "../models/setting.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";

import { handleError } from "../utils/errorHandler.js";
import { sendPushNotifications } from "../utils/pushNotifications.js";

const EXCHANGE_FEE_SETTING_KEY = "نسبة رسوم تحويل الرصيد";
const EXCHANGE_KEY_MAX_LENGTH = 100;

const roundToCents = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

const isValidExchangeKey = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= EXCHANGE_KEY_MAX_LENGTH;

// Missing/garbage setting values fall back to 0 ("no fee"), never to an
// error - a broken/unset setting must not block transfers.
const getExchangeFeePercentage = async () => {
  const setting = await Setting.findOne({ key: EXCHANGE_FEE_SETTING_KEY }).select("value");
  const parsed = Number(setting?.value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

// Shared by preview and send so both apply identical eligibility rules.
const resolveRecipient = async (phone, senderId) => {
  const recipient = await User.findOne({ phone: String(phone || "").trim() });
  if (!recipient) {
    return { error: { status: 404, code: "EXCHANGE_RECIPIENT_NOT_FOUND" } };
  }
  if (String(recipient._id) === String(senderId)) {
    return { error: { status: 400, code: "EXCHANGE_SELF_NOT_ALLOWED" } };
  }
  if (!recipient.isActive) {
    return { error: { status: 400, code: "EXCHANGE_RECIPIENT_INACTIVE" } };
  }
  return { recipient };
};

const notifyRecipientOfExchange = async ({ recipient, senderName, amount, transactionId }) => {
  try {
    if (!recipient.pushTokens || recipient.pushTokens.length === 0) return;
    await sendPushNotifications(recipient.pushTokens, {
      title: "MD Card",
      body: `استلمت ${amount} د.ل. من ${senderName}`,
      data: {
        type: "exchangeReceived",
        transactionId: String(transactionId),
        amount,
        senderName,
      },
    });
  } catch (err) {
    console.error("Failed to notify exchange recipient:", err);
  }
};

export const previewExchange = async (req, res) => {
  try {
    const { phone, amount } = req.body;
    if (!phone) {
      return res.status(400).json({ code: "EXCHANGE_PHONE_REQUIRED" });
    }

    const { recipient, error } = await resolveRecipient(phone, req.user._id);
    if (error) return res.status(error.status).json({ code: error.code });

    const feePercentage = await getExchangeFeePercentage();

    const parsedAmount = Number(amount);
    const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
    const fee = hasValidAmount ? roundToCents((parsedAmount * feePercentage) / 100) : null;
    const totalCharge = hasValidAmount ? roundToCents(parsedAmount + fee) : null;

    return res.status(200).json({
      recipient: { name: recipient.name, phone: recipient.phone },
      feePercentage,
      amount: hasValidAmount ? parsedAmount : null,
      fee,
      totalCharge,
      sufficientBalance: hasValidAmount ? req.user.balance >= totalCharge : null,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const sendExchange = async (req, res) => {
  try {
    const { phone, amount, exchangeKey } = req.body;

    if (!phone) {
      return res.status(400).json({ code: "EXCHANGE_PHONE_REQUIRED" });
    }
    if (!isValidExchangeKey(exchangeKey)) {
      return res.status(400).json({ code: "EXCHANGE_KEY_REQUIRED" });
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ code: "EXCHANGE_AMOUNT_INVALID" });
    }

    const { recipient, error } = await resolveRecipient(phone, req.user._id);
    if (error) return res.status(error.status).json({ code: error.code });

    const feePercentage = await getExchangeFeePercentage();
    const fee = roundToCents((parsedAmount * feePercentage) / 100);
    const totalCharge = roundToCents(parsedAmount + fee);

    const trimmedKey = exchangeKey.trim();
    const receiverTxId = new Types.ObjectId();

    // Claim the idempotency key before any balance mutation - a retried/
    // duplicated request replays this attempt's result instead of
    // debiting the sender twice.
    let senderTx;
    try {
      senderTx = await new Transaction({
        userId: req.user._id,
        type: "exchange_sent",
        amount: totalCharge,
        fee,
        feePercentage,
        exchangeKey: trimmedKey,
        counterpartyUserId: recipient._id,
        counterpartyName: recipient.name,
        counterpartyPhone: recipient.phone,
        linkedTransactionId: receiverTxId,
      }).save();
    } catch (err) {
      if (err?.code === 11000) {
        const existing = await Transaction.findOne({ userId: req.user._id, exchangeKey: trimmedKey });
        if (existing?.balanceAfter != null) {
          const currentUser = await User.findById(req.user._id);
          return res.status(200).json({
            balance: currentUser.balance,
            transaction: {
              _id: existing._id,
              type: existing.type,
              amount: existing.amount,
              fee: existing.fee,
              feePercentage: existing.feePercentage,
              balanceBefore: existing.balanceBefore,
              balanceAfter: existing.balanceAfter,
              counterpartyName: existing.counterpartyName,
              counterpartyPhone: existing.counterpartyPhone,
              createdAt: existing.createdAt,
            },
          });
        }
        return res.status(409).json({ code: "EXCHANGE_IN_PROGRESS" });
      }
      throw err;
    }

    const updatedSender = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: totalCharge } },
      { $inc: { balance: -totalCharge } },
      { new: true },
    );
    if (!updatedSender) {
      await Transaction.deleteOne({ _id: senderTx._id });
      return res.status(400).json({ code: "EXCHANGE_INSUFFICIENT_BALANCE" });
    }

    const updatedReceiver = await User.findOneAndUpdate(
      { _id: recipient._id },
      { $inc: { balance: parsedAmount } },
      { new: true },
    );
    if (!updatedReceiver) {
      // Extremely rare: recipient deleted between the lookup above and now.
      // Best-effort refund the sender and release the claimed transaction.
      await User.updateOne({ _id: req.user._id }, { $inc: { balance: totalCharge } });
      await Transaction.deleteOne({ _id: senderTx._id });
      console.error("[exchange] recipient vanished mid-transfer, sender refunded", {
        senderId: req.user._id,
        recipientId: recipient._id,
      });
      return res.status(404).json({ code: "EXCHANGE_RECIPIENT_VANISHED" });
    }

    const senderBalanceBefore = roundToCents(updatedSender.balance + totalCharge);
    await Transaction.updateOne(
      { _id: senderTx._id },
      { balanceBefore: senderBalanceBefore, balanceAfter: updatedSender.balance },
    );

    const receiverBalanceBefore = roundToCents(updatedReceiver.balance - parsedAmount);
    const receiverTx = await new Transaction({
      _id: receiverTxId,
      userId: recipient._id,
      type: "exchange_received",
      amount: parsedAmount,
      balanceBefore: receiverBalanceBefore,
      balanceAfter: updatedReceiver.balance,
      counterpartyUserId: req.user._id,
      counterpartyName: req.user.name,
      counterpartyPhone: req.user.phone,
      linkedTransactionId: senderTx._id,
    }).save();

    notifyRecipientOfExchange({
      recipient: updatedReceiver,
      senderName: req.user.name,
      amount: parsedAmount,
      transactionId: receiverTx._id,
    });

    return res.status(201).json({
      balance: updatedSender.balance,
      transaction: {
        _id: senderTx._id,
        type: "exchange_sent",
        amount: totalCharge,
        fee,
        feePercentage,
        balanceBefore: senderBalanceBefore,
        balanceAfter: updatedSender.balance,
        counterpartyName: recipient.name,
        counterpartyPhone: recipient.phone,
        createdAt: senderTx.createdAt,
      },
    });
  } catch (err) {
    return handleError(err, res);
  }
};

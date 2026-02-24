import mongoose from "mongoose";

import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";

import { handleError } from "../utils/errorHandler.js";
import parsePagination from "../utils/parsePagination.js";
import { decryptCardCode } from "../utils/cardCodeCrypto.js";

export const createDeposit = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId) {
      return res.status(400).json({ code: "TRANSACTION_USER_REQUIRED" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ code: "TRANSACTION_USER_INVALID" });
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ code: "TRANSACTION_AMOUNT_INVALID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }

    const balanceBefore = user.balance;
    user.balance = balanceBefore + parsedAmount;
    await user.save();

    const transaction = new Transaction({
      userId: user._id,
      type: "deposit",
      amount: parsedAmount,
      balanceBefore,
      balanceAfter: user.balance,
      createdByAdmin: req.admin?._id || undefined,
    });

    await transaction.save();

    return res.status(201).json({
      transaction,
      balance: user.balance,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const createRefund = async (req, res) => {
  try {
    const { transactionId, amount } = req.body;

    if (!transactionId) {
      return res.status(400).json({ code: "TRANSACTION_ORIGINAL_REQUIRED" });
    }

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({ code: "TRANSACTION_ORIGINAL_INVALID" });
    }

    const original = await Transaction.findById(transactionId);
    if (!original) {
      return res.status(404).json({ code: "TRANSACTION_ORIGINAL_NOT_FOUND" });
    }

    const parsedAmount =
      amount === undefined || amount === null
        ? original.amount
        : Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ code: "TRANSACTION_AMOUNT_INVALID" });
    }
    if (parsedAmount > original.amount) {
      return res.status(400).json({ code: "TRANSACTION_AMOUNT_EXCEEDS" });
    }

    const user = await User.findById(original.userId);
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }

    const balanceBefore = user.balance;
    user.balance = balanceBefore + parsedAmount;
    await user.save();

    const refund = new Transaction({
      userId: user._id,
      type: "refund",
      amount: parsedAmount,
      balanceBefore,
      balanceAfter: user.balance,
      cardId: original.cardId,
      tierId: original.tierId,
      createdByAdmin: req.admin?._id || undefined,
      originalTransactionId: original._id,
    });

    await refund.save();

    return res.status(201).json({
      transaction: refund,
      balance: user.balance,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getUserTransactions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ code: "AUTH_USER_REQUIRED" });
    }

    const { type, sortBy, sortOrder } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    const filter = { userId: req.user.id };

    if (type) {
      if (!["deposit", "purchase", "refund"].includes(type)) {
        return res.status(400).json({ code: "TRANSACTION_TYPE_INVALID" });
      }
      filter.type = type;
    }

    const sortFieldMap = {
      createdAt: "createdAt",
      type: "type",
      amount: "amount",
    };
    const resolvedSortField = sortFieldMap[sortBy] || "createdAt";
    const resolvedSortOrder = sortOrder === "asc" ? 1 : -1;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ [resolvedSortField]: resolvedSortOrder, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: "orderId",
          populate: [
            {
              path: "items.cards",
              model: "Card",
            },
            {
              path: "items.tierId",
              model: "CardTier",
              populate: {
                path: "typeId",
                model: "CardType",
              },
            },
          ],
        }),
      Transaction.countDocuments(filter),
    ]);

    // Decrypt the cards within the orders before sending
    const payload = transactions.map((tx) => {
      const txObj = tx.toObject();
      if (txObj.type === "purchase" && txObj.orderId) {
        txObj.orderId.items = txObj.orderId.items.map((item) => ({
          ...item,
          cards: item.cards.map((card) => {
            if (card && card.code) {
              return {
                ...card,
                code: decryptCardCode(card.code),
              };
            }
            return card;
          }),
        }));
      }
      return txObj;
    });

    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      transactions: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getAdminTransactions = async (req, res) => {
  try {
    const { userId, type, cardId, tierId } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    const filter = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ code: "TRANSACTION_USER_INVALID" });
      }
      filter.userId = userId;
    }

    if (cardId) {
      if (!mongoose.Types.ObjectId.isValid(cardId)) {
        return res.status(400).json({ code: "TRANSACTION_CARD_INVALID" });
      }
      filter.cardId = cardId;
    }

    if (tierId) {
      if (!mongoose.Types.ObjectId.isValid(tierId)) {
        return res.status(400).json({ code: "TRANSACTION_TIER_INVALID" });
      }
      filter.tierId = tierId;
    }

    if (type) {
      if (!["deposit", "purchase", "refund"].includes(type)) {
        return res.status(400).json({ code: "TRANSACTION_TYPE_INVALID" });
      }
      filter.type = type;
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json(transactions);
  } catch (err) {
    return handleError(err, res);
  }
};

import mongoose from "mongoose";

import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";

import { handleError } from "../utils/errorHandler.js";
import parsePagination from "../utils/parsePagination.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildUserSearchFilter = (searchTerm) => {
  const term = searchTerm.trim();
  const terms = term.split(/\s+/);

  const patterns = new Set();
  const addPattern = (item) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    patterns.add(escapeRegex(trimmed));
  };

  addPattern(term);
  terms.forEach(addPattern);

  const orConditions = [];
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, "i");
    orConditions.push({ name: regex }, { phone: regex });
  }

  return orConditions.length > 0 ? { $or: orConditions } : {};
};

const normalizeDate = (value, isEnd) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  if (typeof value === "string" && value.length <= 10) {
    if (isEnd) {
      parsed.setHours(23, 59, 59, 999);
    } else {
      parsed.setHours(0, 0, 0, 0);
    }
  }

  return parsed;
};

const parseAmount = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const get = async (req, res) => {
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

    const payload = transactions.map((tx) => {
      const txObj = tx.toObject();
      const result = {
        _id: txObj._id,
        type: txObj.type,
        amount: txObj.amount,
        balanceBefore: txObj.balanceBefore,
        balanceAfter: txObj.balanceAfter,
        createdAt: txObj.createdAt,
      };

      if (txObj.type === "purchase" && txObj.orderId) {
        const items = Array.isArray(txObj.orderId.items)
          ? txObj.orderId.items
          : [];

        result.orderId = {
          _id: txObj.orderId._id,
          items: items.map((item) => {
            const tier =
              item?.tierId && typeof item.tierId === "object"
                ? item.tierId
                : null;
            const type =
              tier?.typeId && typeof tier.typeId === "object"
                ? tier.typeId
                : null;

            return {
              tierId: tier
                ? {
                    _id: tier._id,
                    typeId: type
                      ? {
                          _id: type._id,
                          name: type.name,
                        }
                      : null,
                  }
                : null,
              title: item?.title,
              price: item?.price,
              quantity: item?.quantity,
            };
          }),
        };
      }

      return result;
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

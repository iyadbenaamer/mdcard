import { Types } from "mongoose";

import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import parsePagination from "../utils/parsePagination.js";
import { handleError } from "../utils/errorHandler.js";

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

export const getAdminOrders = async (req, res) => {
  try {
    const {
      userId,
      userQuery,
      provider,
      minTotal,
      maxTotal,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    const filter = {};

    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ code: "ORDER_USER_INVALID" });
      }
      filter.userId = userId;
    } else if (userQuery && userQuery.trim()) {
      const users = await User.find(buildUserSearchFilter(userQuery))
        .select("_id")
        .limit(200);
      const userIds = users.map((user) => user._id);
      if (userIds.length === 0) {
        return res.status(200).json({
          orders: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 1,
            hasMore: false,
          },
        });
      }
      filter.userId = { $in: userIds };
    }

    if (provider) {
      if (!["local", "bamboo"].includes(provider)) {
        return res.status(400).json({ code: "ORDER_PROVIDER_INVALID" });
      }
      filter["items.provider"] = provider;
    }

    const parsedMinTotal = parseAmount(minTotal);
    const parsedMaxTotal = parseAmount(maxTotal);
    if (parsedMinTotal !== null || parsedMaxTotal !== null) {
      if (
        (parsedMinTotal !== null && parsedMinTotal < 0) ||
        (parsedMaxTotal !== null && parsedMaxTotal < 0)
      ) {
        return res.status(400).json({ code: "ORDER_TOTAL_INVALID" });
      }
      filter.totalAmount = {};
      if (parsedMinTotal !== null) {
        filter.totalAmount.$gte = parsedMinTotal;
      }
      if (parsedMaxTotal !== null) {
        filter.totalAmount.$lte = parsedMaxTotal;
      }
    }

    const normalizedStart = normalizeDate(startDate, false);
    const normalizedEnd = normalizeDate(endDate, true);
    if ((startDate && !normalizedStart) || (endDate && !normalizedEnd)) {
      return res.status(400).json({ code: "ORDER_DATE_INVALID" });
    }
    if (normalizedStart || normalizedEnd) {
      filter.createdAt = {};
      if (normalizedStart) {
        filter.createdAt.$gte = normalizedStart;
      }
      if (normalizedEnd) {
        filter.createdAt.$lte = normalizedEnd;
      }
    }

    const sortFieldMap = {
      createdAt: "createdAt",
      totalAmount: "totalAmount",
    };
    const resolvedSortField = sortFieldMap[sortBy];
    const resolvedSortOrder = sortOrder === "asc" ? 1 : -1;

    let ordersQuery = Order.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "userId", select: "name phone" });

    if (resolvedSortField) {
      ordersQuery = ordersQuery.sort({
        [resolvedSortField]: resolvedSortOrder,
        _id: 1,
      });
    }

    const [orders, total] = await Promise.all([
      ordersQuery,
      Order.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const payload = orders.map((order) => {
      const orderObj = order.toObject();
      const user =
        orderObj.userId && typeof orderObj.userId === "object"
          ? orderObj.userId
          : null;
      const items = Array.isArray(orderObj.items)
        ? orderObj.items.map(({ cards, ...rest }) => rest)
        : [];

      return {
        ...orderObj,
        items,
        user,
        userId: user?._id ?? orderObj.userId,
      };
    });

    return res.status(200).json({
      orders: payload,
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

export const deleteAdminOrders = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const normalizedIds = [
      ...new Set(ids.map((id) => String(id).trim())),
    ].filter(Boolean);

    if (normalizedIds.length === 0) {
      return res.status(400).json({ code: "ORDER_IDS_REQUIRED" });
    }

    const invalidIds = normalizedIds.filter(
      (id) => !Types.ObjectId.isValid(id),
    );
    if (invalidIds.length) {
      return res.status(400).json({ code: "ORDER_ID_INVALID" });
    }

    const result = await Order.deleteMany({
      _id: { $in: normalizedIds },
    });

    return res.status(200).json({
      deleted: result.deletedCount || 0,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

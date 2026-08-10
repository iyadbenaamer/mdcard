import { Types } from "mongoose";

import User from "../models/user.model.js";
import CardType from "../models/cardType.model.js";
import Card from "../models/card.model.js";
import { decryptCardCode } from "../utils/cardCodeCrypto.js";
import { handleError } from "../utils/errorHandler.js";
import parsePagination from "../utils/parsePagination.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildUserSearchFilter = (searchTerm) => {
  const term = searchTerm.trim();
  const terms = term.split(/\s+/);

  const patterns = new Set();
  const addPattern = (t) => {
    const trimmed = t.trim();
    if (!trimmed) return;
    patterns.add(escapeRegex(trimmed));
  };

  addPattern(term);
  terms.forEach(addPattern);

  const orConditions = [];
  for (const p of patterns) {
    const regex = new RegExp(p, "i");
    orConditions.push({ name: regex }, { phone: regex });
  }

  return orConditions.length > 0 ? { $or: orConditions } : {};
};

const buildCardTypeSearchFilter = (searchTerm) => {
  const term = searchTerm.trim();
  const terms = term.split(/\s+/);

  const patterns = new Set();
  const addPattern = (t) => {
    const trimmed = t.trim();
    if (!trimmed) return;
    patterns.add(escapeRegex(trimmed));
  };

  addPattern(term);
  terms.forEach(addPattern);

  const orConditions = [];
  for (const p of patterns) {
    const regex = new RegExp(p, "i");
    orConditions.push({ name: regex });
  }

  return orConditions.length > 0 ? { $or: orConditions } : {};
};

// Main search endpoint
export const search = async (req, res) => {
  try {
    let { query } = req.query;
    query = query?.trim();
    if (!query) {
      return res.status(400).json({ code: "SEARCH_QUERY_REQUIRED" });
    }

    if (query.length > 1000) {
      return res.status(400).json({ code: "SEARCH_QUERY_TOO_LONG" });
    }

    const users = await User.find(buildUserSearchFilter(query))
      .select("name phone role createdAt isActive")
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(
      users.map((user) => ({
        ...user.toObject(),
        role: user.role || "business",
      })),
    );
  } catch (err) {
    return handleError(err, res);
  }
};

// Card type search endpoint
export const searchCardTypes = async (req, res) => {
  try {
    let { query } = req.query;
    query = query?.trim();
    if (!query) {
      return res.status(400).json({ code: "SEARCH_QUERY_REQUIRED" });
    }

    if (query.length > 1000) {
      return res.status(400).json({ code: "SEARCH_QUERY_TOO_LONG" });
    }

    const filter = buildCardTypeSearchFilter(query);
    filter.isActive = true;

    const cardTypes = await CardType.find(filter)
      .select("name image createdAt")
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(cardTypes);
  } catch (err) {
    return handleError(err, res);
  }
};

export const searchCards = async (req, res) => {
  try {
    let { query, categoryId, sortBy, sortOrder } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);
    query = query?.trim();

    if (!query) {
      return res.status(400).json({ code: "SEARCH_QUERY_REQUIRED" });
    }

    if (query.length > 1000) {
      return res.status(400).json({ code: "SEARCH_QUERY_TOO_LONG" });
    }

    if (categoryId && !Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ code: "CARD_CATEGORY_ID_INVALID" });
    }

    const allowedSortFields = new Set([
      "serialNumber",
      "status",
      "createdAt",
      "typeName",
      "tierTitle",
    ]);
    const sortField = allowedSortFields.has(sortBy) ? sortBy : "serialNumber";
    const sortDirection = sortOrder === "desc" ? -1 : 1;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const serialMatch = { serialNumber: { $regex: escaped, $options: "i" } };

    const pipeline = [
      { $match: serialMatch },
      {
        $lookup: {
          from: "card_tiers",
          localField: "tierId",
          foreignField: "_id",
          as: "tier",
        },
      },
      { $unwind: "$tier" },
      {
        $lookup: {
          from: "card_types",
          localField: "tier.typeId",
          foreignField: "_id",
          as: "type",
        },
      },
      { $unwind: "$type" },
    ];

    if (categoryId) {
      pipeline.push({
        $match: { "type.categoryId": new Types.ObjectId(categoryId) },
      });
    }

    pipeline.push(
      {
        $project: {
          serialNumber: 1,
          code: 1,
          status: 1,
          createdAt: 1,
          tierTitle: "$tier.title",
          typeName: "$type.name",
        },
      },
      { $sort: { [sortField]: sortDirection, _id: 1 } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    );

    const [result] = await Card.aggregate(pipeline);
    const total = result?.total?.[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const cards = (result?.data ?? []).map((card) => ({
      ...card,
      code: decryptCardCode(card.code),
    }));

    return res.status(200).json({
      cards,
      total,
      totalPages,
      page,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

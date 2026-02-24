import { Types } from "mongoose";

import User from "../models/user.model.js";
import CardType from "../models/cardType.model.js";
import Card from "../models/card.model.js";
import { decryptCardCode } from "../utils/cardCodeCrypto.js";

import { client } from "../services/elasticsearch.js";
import { handleError } from "../utils/errorHandler.js";
import parsePagination from "../utils/parsePagination.js";

const USER_INDEX_NAME = "users";
const CARD_TYPE_INDEX_NAME = "card_types";

// Build search query for partial and fuzzy matching
const buildSearchQuery = (searchTerm) => {
  const term = searchTerm.trim().toLowerCase();
  const terms = term.split(/\s+/); // Split by one or more spaces

  return {
    bool: {
      should: [
        // Full name search using multi_match
        {
          multi_match: {
            query: term,
            fields: ["name^3", "phone^1.5"],
            type: "best_fields",
            operator: "or",
            boost: 4,
          },
        },
        // Individual term search
        ...terms.map((t) => ({
          multi_match: {
            query: t,
            fields: ["name^2", "phone^1.5"],
            type: "best_fields",
            operator: "or",
            boost: 2,
          },
        })),
        // Wildcard matches for partial text
        {
          bool: {
            should: [
              { wildcard: { name: { value: `*${term}*`, boost: 1 } } },
              { wildcard: { phone: { value: `*${term}*`, boost: 1.2 } } },
            ],
          },
        },
        // Fuzzy matches for typo tolerance
        {
          bool: {
            should: [
              {
                fuzzy: {
                  name: { value: term, fuzziness: "AUTO", boost: 0.7 },
                },
              },
              {
                fuzzy: {
                  phone: { value: term, fuzziness: "AUTO", boost: 0.6 },
                },
              },
            ],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
};

// Build search query for card types (name only)
const buildCardTypeSearchQuery = (searchTerm) => {
  const term = searchTerm.trim().toLowerCase();
  const terms = term.split(/\s+/);

  return {
    bool: {
      should: [
        {
          match: {
            name: {
              query: term,
              boost: 4,
            },
          },
        },
        ...terms.map((t) => ({
          match: {
            name: {
              query: t,
              boost: 2,
            },
          },
        })),
        {
          wildcard: {
            name: {
              value: `*${term}*`,
              boost: 1.5,
            },
          },
        },
        {
          fuzzy: {
            name: {
              value: term,
              fuzziness: "AUTO",
              boost: 0.8,
            },
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
};

// Build prefix query for card type autocomplete
const buildCardTypePrefixQuery = (searchTerm) => {
  const term = searchTerm.trim().toLowerCase();
  return {
    bool: {
      should: [
        {
          prefix: {
            name: {
              value: term,
              boost: 2.0,
            },
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
};

// Process search results and fetch full user data using aggregation
const processSearchResults = async (searchResults, userId) => {
  const ids = searchResults.hits.hits.map((hit) => hit._id);
  if (!ids || ids.length === 0) return [];

  const objectIds = ids.map((id) => new Types.ObjectId(id));

  // Build aggregation pipeline to preserve ES order and compute counts
  const pipeline = [
    { $match: { _id: { $in: objectIds } } },
    {
      $project: {
        name: 1,
        phone: 1,
        createdAt: 1,
        isActive: 1,
      },
    },
  ];

  // Sort by the original Elasticsearch order
  pipeline.push({ $sort: { __order: 1 } });

  pipeline.push({
    $project: {
      _id: 1,
      name: 1,
      phone: 1,
      createdAt: 1,
      isActive: 1,
    },
  });

  const users = await User.aggregate(pipeline);
  return users;
};

// Process card type search results and fetch full data
const processCardTypeSearchResults = async (searchResults) => {
  const ids = searchResults.hits.hits.map((hit) => hit._id);
  if (!ids || ids.length === 0) return [];

  const objectIds = ids.map((id) => new Types.ObjectId(id));

  const pipeline = [
    { $match: { _id: { $in: objectIds } } },
    {
      $addFields: {
        __order: { $indexOfArray: [ids, { $toString: "$_id" }] },
      },
    },
    {
      $project: {
        name: 1,
        image: 1,
        isActive: 1,
        createdAt: 1,
        __order: 1,
      },
    },
    { $sort: { __order: 1 } },
    {
      $project: {
        _id: 1,
        name: 1,
        image: 1,
        isActive: 1,
        createdAt: 1,
      },
    },
  ];

  const cardTypes = await CardType.aggregate(pipeline);
  return cardTypes;
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

    const searchResults = await client.search({
      index: USER_INDEX_NAME,
      query: buildSearchQuery(query),
    });

    const userId = req.user?._id || req.user?.id;
    const users = await processSearchResults(searchResults, userId);
    return res.json(users);
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

    const searchResults = await client.search({
      index: CARD_TYPE_INDEX_NAME,
      query: buildCardTypeSearchQuery(query),
    });

    const cardTypes = await processCardTypeSearchResults(searchResults);
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

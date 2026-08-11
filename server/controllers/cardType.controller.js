import mongoose from "mongoose";

import CardType from "../models/cardType.model.js";
import CardCategory from "../models/cardCategory.model.js";
import Setting from "../models/setting.model.js";

import { handleError } from "../utils/errorHandler.js";
import { getTierPriceForUser } from "../utils/priceCalculator.js";
import parsePagination from "../utils/parsePagination.js";
import { isSandboxMode } from "../utils/sandbox.js";

const isSandbox = isSandboxMode();

export const getPaginated = async (req, res) => {
  try {
    const { isActive } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    const filter = { isActive: true };

    const cardTypes = await CardType.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          categoryId: 1,
          name: 1,
          image: 1,
          order: 1,
          notes: 1,
          redeemFormat: 1,
          printImage: 1,
          showExpiryDateDay: 1,
        },
      },
    ]);
    return res.status(200).json(cardTypes);
  } catch (err) {
    return handleError(err, res);
  }
};

export const getByCategory = async (req, res) => {
  try {
    const { isActive, categoryId } = req.query;
    const isLimited = req.query.limit !== undefined;
    const isPaginated =
      req.query.page !== undefined && req.query.limit !== undefined;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ code: "CARD_CATEGORY_ID_INVALID" });
    }

    const filter = { isActive: true };

    const category = await CardCategory.findById(categoryId).select("name");
    if (!category) {
      return res.status(404).json({ code: "CARD_CATEGORY_NOT_FOUND" });
    }

    const cardTypes = await CardCategory.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(categoryId) },
      },
      {
        $lookup: {
          from: "card_types",
          localField: "_id",
          foreignField: "categoryId",
          as: "types",
        },
      },
      { $unwind: "$types" },
      {
        $match: {
          "types.isActive":
            filter.isActive !== undefined ? filter.isActive : { $exists: true },
        },
      },
      { $replaceRoot: { newRoot: "$types" } },
      { $sort: { order: 1, createdAt: -1 } },
      {
        $project: {
          _id: 1,
          categoryId: 1,
          name: 1,
          image: 1,
          order: 1,
          notes: 1,
          redeemFormat: 1,
          printImage: 1,
          showExpiryDateDay: 1,
        },
      },
      ...(isPaginated
        ? [{ $skip: (page - 1) * limit }, { $limit: limit }]
        : []),
      ...(!isPaginated && isLimited ? [{ $limit: limit }] : []),
    ]);
    return res.status(200).json({
      name: category.name,
      cardTypes,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getOne = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: "CARD_TYPE_ID_INVALID" });
    }

    // Fetch dollarRate setting for calculating effective buyPrice
    const dollarRateSetting = await Setting.findOne({
      key: "سعر الدولار",
    }).select("value");
    const dollarRate = Number(dollarRateSetting?.value) || 1;

    // Custom pricing only applies to business accounts - individual users
    // always pay sellPrice, so skip the lookup for them entirely rather
    // than fetching it and discarding it later.
    const isIndividualUser = req.user?.role === "individual";

    const tierPipeline = [
      {
        $match: {
          $expr: { $eq: ["$typeId", "$$typeId"] },
        },
      },
      { $match: { isActive: true } },
      ...(isIndividualUser
        ? []
        : [
            {
              $lookup: {
                from: "custom_pricing",
                let: { tierId: "$_id" },
                pipeline: [
                  {
                    $lookup: {
                      from: "card_tiers",
                      localField: "_id",
                      foreignField: "typeId",
                      as: "tiers",
                    },
                  },
                  {
                    $addFields: {
                      tiersCount: { $size: "$tiers" },
                    },
                  },
                  { $unset: "tiers" },
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$tierId", "$$tierId"] },
                          {
                            $eq: [
                              "$userId",
                              new mongoose.Types.ObjectId(req.user.id),
                            ],
                          },
                        ],
                      },
                    },
                  },
                  { $limit: 1 },
                ],
                as: "customPricing",
              },
            },
            {
              $addFields: {
                customBuyPrice: { $first: "$customPricing.buyPrice" },
                customBuyPriceUsd: { $first: "$customPricing.buyPriceUsd" },
              },
            },
            { $unset: "customPricing" },
          ]),
      {
        $lookup: {
          from: "cards",
          let: { tierId: "$_id", fulfillmentSource: "$$fulfillmentSource" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$tierId", "$$tierId"] },
                    { $eq: ["$soldTo", null] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "availableCards",
        },
      },
      {
        $addFields: {
          isAvailable: {
            $cond: [
              { $literal: isSandbox },
              true,
              {
                $cond: [
                  { $eq: ["$$fulfillmentSource", "bamboo"] },
                  true,
                  { $gt: [{ $size: "$availableCards" }, 0] },
                ],
              },
            ],
          },
        },
      },
      { $unset: "availableCards" },
      { $sort: { sellPrice: 1 } },
    ];

    const cardTypes = await CardType.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          isActive: true,
        },
      },
      {
        $lookup: {
          from: "card_tiers",
          let: { typeId: "$_id", fulfillmentSource: "$fulfillmentSource" },
          pipeline: tierPipeline,
          as: "tiers",
        },
      },
    ]);

    if (!cardTypes.length) {
      return res.status(404).json({ code: "CARD_TYPE_NOT_FOUND" });
    }

    // Calculate effective buyPrice for each tier (for API response - end user
    // sees this). Uses the same priority order as checkout (custom price >
    // effective buy price > sellPrice for individuals) so the price shown
    // while browsing always matches what gets charged.
    let result = cardTypes[0];
    if (Array.isArray(result.tiers)) {
      // End users see calculated effective price only (hide buyPriceUsd)
      result.tiers = result.tiers.map((tier) => {
        const effectiveBuyPrice = getTierPriceForUser({
          userRole: req.user?.role,
          buyPrice: tier.buyPrice,
          buyPriceUsd: tier.buyPriceUsd,
          sellPrice: tier.sellPrice,
          customBuyPrice: tier.customBuyPrice,
          customBuyPriceUsd: tier.customBuyPriceUsd,
          dollarRate,
        });
        // Return tier with calculated buyPrice, hide internal buyPriceUsd
        const {
          buyPriceUsd,
          bambooProductId,
          value,
          isActive,
          createdAt,
          updatedAt,
          customBuyPrice,
          customBuyPriceUsd,
          ...tierWithoutPrivate
        } = tier;
        return {
          ...tierWithoutPrivate,
          buyPrice: effectiveBuyPrice,
        };
      });
    }

    const { fulfillmentSource, ...responseResult } = result;

    return res.status(200).json(responseResult);
  } catch (err) {
    return handleError(err, res);
  }
};

import mongoose from "mongoose";

import CustomePricing from "../models/customePricing.model.js";
import CardTier from "../models/cardTier.model.js";
import User from "../models/user.model.js";

import { handleError } from "../utils/errorHandler.js";

const buildPricingPipeline = (match) => [
  { $match: match },
  {
    $lookup: {
      from: "card_tiers",
      localField: "tierId",
      foreignField: "_id",
      as: "tier",
    },
  },
  { $unwind: { path: "$tier", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "card_types",
      localField: "tier.typeId",
      foreignField: "_id",
      as: "type",
    },
  },
  { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "card_categories",
      localField: "type.categoryId",
      foreignField: "_id",
      as: "category",
    },
  },
  { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 1,
      userId: 1,
      tierId: 1,
      buyPrice: 1,
      createdAt: 1,
      tierTitle: "$tier.title",
      typeId: "$type._id",
      typeName: "$type.name",
      categoryId: "$category._id",
      categoryName: "$category.name",
    },
  },
];

export const getUserCustomPricing = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ code: "CUSTOM_PRICING_USER_ID_INVALID" });
    }

    const pricingRules = await CustomePricing.aggregate([
      ...buildPricingPipeline({
        userId: new mongoose.Types.ObjectId(userId),
      }),
      { $sort: { createdAt: -1, _id: -1 } },
    ]);

    return res.status(200).json(pricingRules);
  } catch (err) {
    return handleError(err, res);
  }
};

export const createUserCustomPricing = async (req, res) => {
  try {
    const { userId, tierId, buyPrice } = req.body;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ code: "CUSTOM_PRICING_USER_ID_INVALID" });
    }
    if (!tierId || !mongoose.Types.ObjectId.isValid(tierId)) {
      return res.status(400).json({ code: "CUSTOM_PRICING_TIER_ID_INVALID" });
    }

    const parsedBuyPrice = Number(buyPrice);
    if (Number.isNaN(parsedBuyPrice) || parsedBuyPrice < 0) {
      return res.status(400).json({ code: "CUSTOM_PRICING_BUY_PRICE_INVALID" });
    }

    const [user, tier] = await Promise.all([
      User.findById(userId).select("_id"),
      CardTier.findById(tierId).select("_id typeId title"),
    ]);

    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }

    if (!tier) {
      return res.status(404).json({ code: "CARD_TIER_NOT_FOUND" });
    }

    const existingRule = await CustomePricing.findOne({
      userId,
      tierId,
    }).select("_id");
    if (existingRule) {
      return res.status(409).json({ code: "CUSTOM_PRICING_EXISTS" });
    }

    const rule = new CustomePricing({
      userId,
      tierId,
      buyPrice: parsedBuyPrice,
    });

    await rule.save();

    const enriched = await CustomePricing.aggregate([
      ...buildPricingPipeline({ _id: rule._id }),
    ]);

    return res.status(201).json(enriched[0] ?? rule);
  } catch (err) {
    return handleError(err, res);
  }
};

export const deleteUserCustomPricing = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: "CUSTOM_PRICING_ID_INVALID" });
    }

    const rule = await CustomePricing.findById(id);
    if (!rule) {
      return res.status(404).json({ code: "CUSTOM_PRICING_NOT_FOUND" });
    }

    await rule.deleteOne();
    return res.status(200).json({ code: "CUSTOM_PRICING_DELETED" });
  } catch (err) {
    return handleError(err, res);
  }
};

import mongoose from "mongoose";

import Favorite from "../models/favorite.model.js";
import CardType from "../models/cardType.model.js";

import { handleError } from "../utils/errorHandler.js";

const buildFavoritePipeline = (match) => [
  { $match: match },
  {
    $lookup: {
      from: "card_types",
      localField: "cardTypeId",
      foreignField: "_id",
      as: "cardType",
    },
  },
  { $unwind: "$cardType" },
  {
    $lookup: {
      from: "card_categories",
      localField: "cardType.categoryId",
      foreignField: "_id",
      as: "category",
    },
  },
  { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 1,
      userId: 1,
      cardTypeId: 1,
      createdAt: 1,
      cardTypeName: "$cardType.name",
      cardTypeImage: "$cardType.image",
      cardTypeIsActive: "$cardType.isActive",
      categoryId: "$category._id",
      categoryName: "$category.name",
    },
  },
];

export const getFavorites = async (req, res) => {
  try {
    const userId = req.user._id;
    const favorites = await Favorite.aggregate([
      ...buildFavoritePipeline({
        userId: new mongoose.Types.ObjectId(userId),
      }),
      { $sort: { createdAt: -1, _id: -1 } },
    ]);

    return res.status(200).json(favorites);
  } catch (err) {
    return handleError(err, res);
  }
};

export const addFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cardTypeId } = req.body;

    if (!cardTypeId || !mongoose.Types.ObjectId.isValid(cardTypeId)) {
      return res.status(400).json({ code: "FAVORITE_CARD_TYPE_ID_INVALID" });
    }

    const cardType = await CardType.findById(cardTypeId).select("_id");
    if (!cardType) {
      return res.status(404).json({ code: "CARD_TYPE_NOT_FOUND" });
    }

    const existing = await Favorite.findOne({ userId, cardTypeId }).select(
      "_id",
    );
    if (existing) {
      return res.status(409).json({ code: "FAVORITE_EXISTS" });
    }

    const favorite = new Favorite({ userId, cardTypeId });
    await favorite.save();

    const enriched = await Favorite.aggregate([
      ...buildFavoritePipeline({ _id: favorite._id }),
    ]);

    return res.status(201).json(enriched[0] ?? favorite);
  } catch (err) {
    return handleError(err, res);
  }
};

export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cardTypeId } = req.query;

    if (!cardTypeId || !mongoose.Types.ObjectId.isValid(cardTypeId)) {
      return res.status(400).json({ code: "FAVORITE_CARD_TYPE_ID_INVALID" });
    }

    const favorite = await Favorite.findOneAndDelete({ userId, cardTypeId });
    if (!favorite) {
      return res.status(404).json({ code: "FAVORITE_NOT_FOUND" });
    }

    return res.status(200).json({ code: "FAVORITE_DELETED" });
  } catch (err) {
    return handleError(err, res);
  }
};

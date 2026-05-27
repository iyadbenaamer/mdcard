import mongoose from "mongoose";

import path from "path";
import CardType from "../models/cardType.model.js";
import CardTier from "../models/cardTier.model.js";
import CardCategory from "../models/cardCategory.model.js";
import Setting from "../models/setting.model.js";

import { safeDelete } from "../middleware/media.middleware.js";

import { handleError } from "../utils/errorHandler.js";
import { getEffectiveBuyPrice } from "../utils/priceCalculator.js";
import parsePagination from "../utils/parsePagination.js";
import { isSandboxMode } from "../utils/sandbox.js";

const normalizeFulfillmentSource = (value) =>
  value === "bamboo" ? "bamboo" : "local";

const normalizeBoolean = (value) =>
  value === "true" ? true : value === "false" ? false : value;

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

export const updateOrderList = async (req, res) => {
  try {
    const types = Array.isArray(req.body?.types) ? req.body.types : req.body;

    if (!Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ code: "CARD_TYPE_LIST_REQUIRED" });
    }

    const operations = [];
    const ids = [];

    for (const item of types) {
      const id = item?.id ?? item?._id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ code: "CARD_TYPE_ID_INVALID" });
      }

      const nextOrder = Number(item.order);
      if (Number.isNaN(nextOrder)) {
        return res.status(400).json({ code: "CARD_TYPE_ORDER_INVALID" });
      }

      operations.push({
        updateOne: {
          filter: { _id: id },
          update: { $set: { order: nextOrder } },
        },
      });
      ids.push(id);
    }

    if (operations.length > 0) {
      await CardType.bulkWrite(operations);
    }

    const updated = await CardType.find({ _id: { $in: ids } })
      .select("_id name order categoryId")
      .sort({ order: 1 });

    return res.status(200).json(updated);
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

    const tierPipeline = [
      {
        $match: {
          $expr: { $eq: ["$typeId", "$$typeId"] },
        },
      },
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "custome_pricing",
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
          buyPrice: {
            $ifNull: [{ $first: "$customPricing.buyPrice" }, "$buyPrice"],
          },
        },
      },
      { $unset: "customPricing" },
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
                    { $eq: ["$status", "available"] },
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

    // Calculate effective buyPrice for each tier (for API response - end user sees this)
    let result = cardTypes[0];
    if (Array.isArray(result.tiers)) {
      // End users see calculated effective price only (hide buyPriceUsd)
      result.tiers = result.tiers.map((tier) => {
        const effectiveBuyPrice = getEffectiveBuyPrice(
          tier.buyPrice,
          tier.buyPriceUsd,
          dollarRate,
        );
        // Return tier with calculated buyPrice, hide internal buyPriceUsd
        const {
          buyPriceUsd,
          bambooProductId,
          value,
          isActive,
          createdAt,
          updatedAt,
          ...tierWithoutPrivate
        } = tier;
        return {
          ...tierWithoutPrivate,
          buyPrice: effectiveBuyPrice,
        };
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res);
  }
};

export const createOne = async (req, res) => {
  try {
    let {
      name,
      isActive,
      categoryId,
      order,
      fulfillmentSource,
      showExpiryDateDay,
      notes,
    } = req.body;
    const image = req.filePath;
    const printImage = req.printFilePath ?? req.body.printImage;
    const redeemFormat = req.body.redeemFormat?.trim();
    name = name?.trim();
    notes = notes?.trim();
    if (!name) {
      return res.status(400).json({ code: "CARD_TYPE_NAME_REQUIRED" });
    }

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ code: "CARD_CATEGORY_ID_INVALID" });
    }

    const cardCategory = await CardCategory.findById(categoryId);
    if (!cardCategory) {
      return res.status(404).json({ code: "CARD_CATEGORY_NOT_FOUND" });
    }

    const nextFulfillmentSource = normalizeFulfillmentSource(fulfillmentSource);
    const normalizedShowExpiryDateDay = normalizeBoolean(showExpiryDateDay);

    let nextOrder;
    if (order !== undefined) {
      nextOrder = Number(order);
      if (Number.isNaN(nextOrder)) {
        return res.status(400).json({ code: "CARD_TYPE_ORDER_INVALID" });
      }
    } else {
      const lastType = await CardType.find({ categoryId })
        .sort({ order: -1 })
        .limit(1)
        .select("order")
        .lean();
      nextOrder = lastType.length ? (lastType[0].order ?? 0) + 1 : 1;
    }

    const normalizedIsActive =
      isActive === "true" ? true : isActive === "false" ? false : isActive;

    const cardType = new CardType({
      categoryId,
      name,
      fulfillmentSource: nextFulfillmentSource,
      image,
      printImage,
      redeemFormat,
      showExpiryDateDay:
        typeof normalizedShowExpiryDateDay === "boolean"
          ? normalizedShowExpiryDateDay
          : undefined,
      notes: notes || undefined,
      order: nextOrder,
      isActive:
        typeof normalizedIsActive === "boolean"
          ? normalizedIsActive
          : undefined,
    });

    await cardType.save();
    return res.status(201).json(cardType);
  } catch (err) {
    return handleError(err, res);
  }
};

export const updateOne = async (req, res) => {
  try {
    const { id } = req.query;
    let {
      name,
      categoryId,
      isActive,
      fulfillmentSource,
      showExpiryDateDay,
      notes,
    } = req.body;
    const image = req.filePath ?? req.body.image;
    const printImage = req.printFilePath ?? req.body.printImage;
    const redeemFormat = req.body.redeemFormat;

    const cardType = await CardType.findById(id);
    if (!cardType) {
      return res.status(404).json({ code: "CARD_TYPE_NOT_FOUND" });
    }

    if (name !== undefined) {
      name = name?.trim();
      if (!name) {
        return res.status(400).json({ code: "CARD_TYPE_NAME_REQUIRED" });
      }
      cardType.name = name;
    }

    if (categoryId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ code: "CARD_CATEGORY_ID_INVALID" });
      }

      const cardCategory = await CardCategory.findById(categoryId);
      if (!cardCategory) {
        return res.status(404).json({ code: "CARD_CATEGORY_NOT_FOUND" });
      }

      cardType.categoryId = categoryId;
    }

    if (fulfillmentSource !== undefined) {
      const nextFulfillmentSource =
        normalizeFulfillmentSource(fulfillmentSource);
      cardType.fulfillmentSource = nextFulfillmentSource;
    }

    const normalizedShowExpiryDateDay = normalizeBoolean(showExpiryDateDay);
    if (typeof normalizedShowExpiryDateDay === "boolean") {
      cardType.showExpiryDateDay = normalizedShowExpiryDateDay;
    }

    if (image !== undefined) {
      // If updating image, delete the old one if it exists and is different
      if (cardType.image && cardType.image !== image) {
        const oldImagePath = path.join(process.env.UPLOAD_DIR, cardType.image);
        await safeDelete(oldImagePath);
      }
      cardType.image = image;
    }

    if (printImage !== undefined) {
      if (cardType.printImage && cardType.printImage !== printImage) {
        const oldPrintPath = path.join(
          process.env.UPLOAD_DIR,
          cardType.printImage,
        );
        await safeDelete(oldPrintPath);
      }
      cardType.printImage = printImage;
    }

    if (redeemFormat !== undefined) {
      cardType.redeemFormat = redeemFormat?.trim() || "";
    }

    if (notes !== undefined) {
      cardType.notes = notes?.trim() || undefined;
    }

    const normalizedIsActive =
      isActive === "true" ? true : isActive === "false" ? false : isActive;

    if (typeof normalizedIsActive === "boolean") {
      cardType.isActive = normalizedIsActive;
    }

    await cardType.save();
    return res.status(200).json(cardType);
  } catch (err) {
    // If update failed but we uploaded files, clean them up
    if (req.filePath) {
      const newImagePath = path.join(process.env.UPLOAD_DIR, req.filePath);
      await safeDelete(newImagePath);
    }
    if (req.printFilePath) {
      const newPrintPath = path.join(process.env.UPLOAD_DIR, req.printFilePath);
      await safeDelete(newPrintPath);
    }
    return handleError(err, res);
  }
};

export const deleteOne = async (req, res) => {
  try {
    const { id } = req.query;
    const cardType = await CardType.findById(id);
    if (!cardType) {
      return res.status(404).json({ code: "CARD_TYPE_NOT_FOUND" });
    }

    const hasTiers = await CardTier.exists({ typeId: id });
    if (hasTiers) {
      return res.status(409).json({ code: "CARD_TYPE_HAS_TIERS" });
    }

    if (cardType.image) {
      const imagePath = path.join(process.env.UPLOAD_DIR, cardType.image);
      console.log(imagePath);
      await safeDelete(imagePath);
    }
    if (cardType.printImage) {
      const printPath = path.join(process.env.UPLOAD_DIR, cardType.printImage);
      await safeDelete(printPath);
    }

    await cardType.deleteOne();
    return res.status(200).json({ code: "CARD_TYPE_DELETED" });
  } catch (err) {
    return handleError(err, res);
  }
};

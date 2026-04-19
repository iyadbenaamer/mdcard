import mongoose from "mongoose";

import path from "path";
import CardType from "../models/cardType.model.js";
import CardTier from "../models/cardTier.model.js";
import CardCategory from "../models/cardCategory.model.js";

import { safeDelete } from "../middleware/media.middleware.js";

import { handleError } from "../utils/errorHandler.js";
import parsePagination from "../utils/parsePagination.js";

const normalizeFulfillmentSource = (value) =>
  value === "bamboo" ? "bamboo" : "local";

export const getPaginated = async (req, res) => {
  try {
    const { isActive } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    const filter = {};
    if (isActive === "true") {
      filter.isActive = true;
    }
    if (isActive === "false") {
      filter.isActive = false;
    }

    const cardTypes = await CardType.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json(cardTypes);
  } catch (err) {
    return handleError(err, res);
  }
};

export const getByCategory = async (req, res) => {
  try {
    const { isActive, categoryId } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ code: "CARD_CATEGORY_ID_INVALID" });
    }

    const filter = {};
    if (isActive === "true") {
      filter.isActive = true;
    }
    if (isActive === "false" && req.admin) {
      filter.isActive = false;
    }

    if (isActive === undefined && !req.admin) {
      return res.status(400).json({ code: "CARD_TYPE_ISACTIVE_REQUIRED" });
    }

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
      { $skip: (page - 1) * limit },
      { $limit: limit },
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

    const tierPipeline = [
      {
        $match: {
          $expr: { $eq: ["$typeId", "$$typeId"] },
        },
      },
    ];

    if (!req.admin) {
      tierPipeline.push({ $match: { isActive: true } });
    }

    tierPipeline.push(
      ...(req.admin || !req.user
        ? []
        : [
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
              { $eq: ["$$fulfillmentSource", "bamboo"] },
              true,
              { $gt: [{ $size: "$availableCards" }, 0] },
            ],
          },
        },
      },
      { $unset: "availableCards" },
      { $sort: { sellPrice: 1 } },
    );

    const cardTypes = await CardType.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
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

    return res.status(200).json(cardTypes[0]);
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
    } = req.body;
    const image = req.filePath;
    const printImage = req.printFilePath ?? req.body.printImage;
    const redeemFormat = req.body.redeemFormat?.trim();
    name = name?.trim();
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
      const nextFulfillmentSource = normalizeFulfillmentSource(fulfillmentSource);
      cardType.fulfillmentSource = nextFulfillmentSource;
    }

    if (image !== undefined) {
      // If updating image, delete the old one if it exists and is different
      if (cardType.image && cardType.image !== image) {
        const oldImagePath = path.join(process.cwd(), "public", cardType.image);
        await safeDelete(oldImagePath);
      }
      cardType.image = image;
    }

    if (printImage !== undefined) {
      if (cardType.printImage && cardType.printImage !== printImage) {
        const oldPrintPath = path.join(process.cwd(), "public", cardType.printImage);
        await safeDelete(oldPrintPath);
      }
      cardType.printImage = printImage;
    }

    if (redeemFormat !== undefined) {
      cardType.redeemFormat = redeemFormat?.trim() || "";
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
      const newImagePath = path.join(process.cwd(), "public", req.filePath);
      await safeDelete(newImagePath);
    }
    if (req.printFilePath) {
      const newPrintPath = path.join(process.cwd(), "public", req.printFilePath);
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
      const imagePath = path.join(process.cwd(), "public", cardType.image);
      await safeDelete(imagePath);
    }
    if (cardType.printImage) {
      const printPath = path.join(process.cwd(), "public", cardType.printImage);
      await safeDelete(printPath);
    }

    await cardType.deleteOne();
    return res.status(200).json({ code: "CARD_TYPE_DELETED" });
  } catch (err) {
    return handleError(err, res);
  }
};

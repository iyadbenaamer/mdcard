import { Types } from "mongoose";

import CardCategory from "../models/cardCategory.model.js";
import CardType from "../models/cardType.model.js";

import { handleError } from "../utils/errorHandler.js";

export const getAll = async (req, res) => {
  try {
    const cardCategories = await CardCategory.aggregate([
      {
        $lookup: {
          from: "card_types",
          localField: "_id",
          foreignField: "categoryId",
          as: "types",
        },
      },
      {
        $addFields: {
          count: { $size: "$types" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          order: 1,
          count: 1,
        },
      },
      { $sort: { order: 1 } },
    ]);

    return res.status(200).json(cardCategories);
  } catch (err) {
    return handleError(err, res);
  }
};

export const createOne = async (req, res) => {
  try {
    let { name, order } = req.body;

    name = name?.trim();
    if (!name) {
      return res.status(400).json({ code: "CARD_CATEGORY_NAME_REQUIRED" });
    }

    const cardCategory = new CardCategory({ name, order });

    await cardCategory.save();
    return res.status(201).json(cardCategory);
  } catch (err) {
    return handleError(err, res);
  }
};

export const updateAll = async (req, res) => {
  try {
    const categories = Array.isArray(req.body?.categories)
      ? req.body.categories
      : req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ code: "CARD_CATEGORY_LIST_REQUIRED" });
    }

    const operations = [];
    const ids = [];

    for (const item of categories) {
      const id = item?.id ?? item?._id;
      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ code: "CARD_CATEGORY_ID_INVALID" });
      }

      const update = {};
      if (item.name !== undefined) {
        const nextName = item.name?.trim();
        if (!nextName) {
          return res.status(400).json({ code: "CARD_CATEGORY_NAME_REQUIRED" });
        }
        update.name = nextName;
      }

      if (item.order !== undefined) {
        const nextOrder = Number(item.order);
        if (Number.isNaN(nextOrder)) {
          return res.status(400).json({ code: "CARD_CATEGORY_ORDER_INVALID" });
        }
        update.order = nextOrder;
      }

      if (Object.keys(update).length > 0) {
        operations.push({
          updateOne: {
            filter: { _id: id },
            update: { $set: update },
          },
        });
      }

      ids.push(id);
    }

    if (operations.length > 0) {
      await CardCategory.bulkWrite(operations);
    }

    const updated = await CardCategory.find({ _id: { $in: ids } })
      .select("_id name order")
      .sort({ order: 1 });

    return res.status(200).json(updated);
  } catch (err) {
    return handleError(err, res);
  }
};

export const deleteOne = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: "CARD_CATEGORY_ID_INVALID" });
    }

    const cardCategory = await CardCategory.findById(id);
    if (!cardCategory) {
      return res.status(404).json({ code: "CARD_CATEGORY_NOT_FOUND" });
    }

    const hasTypes = await CardType.exists({ categoryId: id });
    if (hasTypes) {
      return res.status(409).json({ code: "CARD_CATEGORY_HAS_TYPES" });
    }
    await cardCategory.deleteOne();
    return res.status(200).json({ code: "CARD_CATEGORY_DELETED" });
  } catch (err) {
    return handleError(err, res);
  }
};

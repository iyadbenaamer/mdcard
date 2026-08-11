import CardCategory from "../models/cardCategory.model.js";

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

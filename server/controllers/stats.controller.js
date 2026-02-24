import Card from "../models/card.model.js";
import CardTier from "../models/cardTier.model.js";
import CardType from "../models/cardType.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";

import { handleError } from "../utils/errorHandler.js";

export const getStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [
      totalUsers,
      newUsersLast7Days,
      totalCards,
      availableCards,
      soldCards,
      totalCardTypes,
      activeCardTypes,
      purchasesLast7Days,
      refundsLast7Days,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Card.countDocuments(),
      Card.countDocuments({ status: "available" }),
      Card.countDocuments({ status: "sold" }),
      CardType.countDocuments(),
      CardType.countDocuments({ isActive: true }),
      Transaction.countDocuments({
        type: "purchase",
        createdAt: { $gte: sevenDaysAgo },
      }),
      Transaction.countDocuments({
        type: "refund",
        createdAt: { $gte: sevenDaysAgo },
      }),
    ]);

    const topSoldTypeAgg = await Card.aggregate([
      { $match: { status: "sold", tierId: { $ne: null } } },
      { $group: { _id: "$tierId", soldCount: { $sum: 1 } } },
      { $sort: { soldCount: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: CardTier.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "tier",
        },
      },
      { $unwind: "$tier" },
      {
        $lookup: {
          from: CardType.collection.name,
          localField: "tier.typeId",
          foreignField: "_id",
          as: "type",
        },
      },
      { $unwind: "$type" },
      {
        $project: {
          _id: 0,
          typeId: "$type._id",
          name: "$type.name",
          soldCount: 1,
        },
      },
    ]);

    const topSoldType = topSoldTypeAgg?.[0] || null;

    const [purchaseTotals, refundTotals] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: "purchase" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { type: "refund" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalRevenue = purchaseTotals?.[0]?.total || 0;
    const totalRefunds = refundTotals?.[0]?.total || 0;
    const netRevenue = totalRevenue - totalRefunds;

    return res.status(200).json({
      serverTime: now.toISOString(),
      stats: {
        totalUsers,
        newUsersLast7Days,
        totalCards,
        availableCards,
        soldCards,
        totalCardTypes,
        activeCardTypes,
        topSoldType,
        totalRevenue,
        totalRefunds,
        netRevenue,
        purchasesLast7Days,
        refundsLast7Days,
      },
    });
  } catch (err) {
    return handleError(err, res);
  }
};

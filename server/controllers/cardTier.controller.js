import Card from "../models/card.model.js";
import CardCategory from "../models/cardCategory.model.js";
import CardType from "../models/cardType.model.js";
import CardTier from "../models/cardTier.model.js";
import CustomPricing from "../models/customPricing.model.js";
import Discount from "../models/discount.model.js";

import { handleError } from "../utils/errorHandler.js";
import parsePagination from "../utils/parsePagination.js";
import { isSandboxMode } from "../utils/sandbox.js";

export const getPaginated = async (req, res) => {
  try {
    const { isActive, typeId } = req.query;
    const isLimited = req.query.limit !== undefined;
    const isPaginated =
      req.query.page !== undefined && req.query.limit !== undefined;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    let typeName = null;
    let categoryName = null;
    if (typeId) {
      const cardType =
        await CardType.findById(typeId).select("name categoryId");
      if (!cardType) {
        return res.status(404).json({ code: "CARD_TYPE_NOT_FOUND" });
      }
      typeName = cardType.name ?? null;

      if (cardType.categoryId) {
        const category = await CardCategory.findById(
          cardType.categoryId,
        ).select("name");
        categoryName = category?.name ?? null;
      }
    }

    const filter = { isActive: true };
    if (typeId) {
      filter.typeId = typeId;
    }

    let tiersQuery = CardTier.find(filter).sort({ order: 1, createdAt: -1 });
    if (isPaginated) {
      tiersQuery = tiersQuery.skip((page - 1) * limit).limit(limit);
    } else if (isLimited) {
      tiersQuery = tiersQuery.limit(limit);
    }
    const tiers = await tiersQuery.lean();

    if (req.user && tiers.length) {
      const tierIds = tiers.map((tier) => tier._id);
      const customPrices = await CustomPricing.find({
        userId: req.user.id,
        tierId: { $in: tierIds },
      }).select("tierId buyPrice");

      const customPriceByTier = new Map(
        customPrices.map((price) => [price.tierId.toString(), price.buyPrice]),
      );

      const normalizedTiers = tiers.map((tier) => {
        const customBuyPrice = customPriceByTier.get(tier._id.toString());
        if (customBuyPrice === undefined) {
          return tier;
        }
        return { ...tier, buyPrice: customBuyPrice };
      });

      if (typeId) {
        return res.status(200).json({
          name: typeName,
          categoryName,
          tiers: normalizedTiers,
        });
      }
      return res.status(200).json(normalizedTiers);
    }

    if (typeId) {
      return res.status(200).json({
        name: typeName,
        categoryName,
        tiers,
      });
    }

    return res.status(200).json(tiers);
  } catch (err) {
    return handleError(err, res);
  }
};

export const checkAvailability = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) {
      return res.status(400).json({ code: "CART_ITEMS_REQUIRED" });
    }

    const results = await Promise.all(
      items.map(async ({ tierId, quantity }) => {
        const requested = Math.max(1, Number(quantity) || 1);
        const tier = await CardTier.findById(tierId).populate({
          path: "typeId",
          select: "fulfillmentSource isActive",
        });
        if (!tier || tier.isActive === false || tier.isAvailable === false) {
          return { tierId, requested, available: 0 };
        }

        const available =
          isSandboxMode() || tier.typeId?.fulfillmentSource === "bamboo"
            ? requested
            : await Card.countDocuments({
                tierId,
                soldTo: null,
              });
        return { tierId, requested, available: Math.min(requested, available) };
      }),
    );

    return res.status(200).json(results);
  } catch (err) {
    return handleError(err, res);
  }
};

export const getTopDiscounted = async (req, res) => {
  try {
    // Discounts only ever apply to individual pricing - business accounts
    // never see discounted tiers.
    if (req.user?.role !== "individual") {
      return res.status(200).json([]);
    }

    const topDiscounts = await Discount.find({ isActive: true })
      .sort({ percentage: -1 })
      .limit(10)
      .populate({
        path: "tierId",
        select: "title sellPrice typeId isActive",
        match: { isActive: true },
        populate: {
          path: "typeId",
          select: "name image isActive",
          match: { isActive: true },
        },
      });

    const tiers = topDiscounts
      .filter((discount) => discount.tierId && discount.tierId.typeId)
      .map((discount) => {
        const tier = discount.tierId;
        const type = tier.typeId;
        const sellPrice = Number(tier.sellPrice) || 0;
        const discountedPrice =
          Math.round(
            (sellPrice * (1 - discount.percentage / 100) + Number.EPSILON) *
              100,
          ) / 100;

        return {
          tierId: tier._id,
          tierTitle: tier.title,
          typeId: type._id,
          typeName: type.name,
          image: type.image,
          sellPrice,
          discountedPrice,
          percentage: discount.percentage,
        };
      });

    return res.status(200).json(tiers);
  } catch (err) {
    return handleError(err, res);
  }
};

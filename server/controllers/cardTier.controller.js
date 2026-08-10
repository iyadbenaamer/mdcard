import Card from "../models/card.model.js";
import CardCategory from "../models/cardCategory.model.js";
import CardType from "../models/cardType.model.js";
import CardTier from "../models/cardTier.model.js";
import CustomPricing from "../models/customPricing.model.js";

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

    let typeName = "";
    let categoryName = "";
    if (typeId) {
      const cardType =
        await CardType.findById(typeId).select("name categoryId");
      if (!cardType) {
        return res.status(404).json({ code: "CARD_TYPE_NOT_FOUND" });
      }
      typeName = cardType.name ?? "";

      if (cardType.categoryId) {
        const category = await CardCategory.findById(
          cardType.categoryId,
        ).select("name");
        categoryName = category?.name ?? "";
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

export const createOne = async (req, res) => {
  try {
    const {
      typeId,
      title,
      buyPrice,
      buyPriceUsd,
      sellPrice,
      bambooProductId,
      value,
      isActive,
      order,
    } = req.body;

    const nextBuyPrice =
      buyPrice === undefined || buyPrice === null || buyPrice === ""
        ? null
        : Number(buyPrice);
    const nextBuyPriceUsd =
      buyPriceUsd === undefined || buyPriceUsd === null || buyPriceUsd === ""
        ? null
        : Number(buyPriceUsd);

    if (
      !typeId ||
      (nextBuyPrice === null && nextBuyPriceUsd === null) ||
      sellPrice === undefined
    ) {
      return res
        .status(400)
        .json({ code: "CARD_TIER_REQUIRED_FIELDS_MISSING" });
    }

    const cardType = await CardType.findById(typeId);
    if (!cardType) {
      return res.status(404).json({ code: "CARD_TYPE_NOT_FOUND" });
    }

    const nextBambooProductId = bambooProductId?.trim() ?? "";
    const nextBambooValue =
      value === undefined || value === null || value === ""
        ? null
        : Number(value);
    if (cardType.fulfillmentSource === "bamboo") {
      if (!nextBambooProductId) {
        return res
          .status(400)
          .json({ code: "CARD_TIER_BAMBOO_PRODUCT_ID_REQUIRED" });
      }
      if (
        nextBambooValue === null ||
        Number.isNaN(nextBambooValue) ||
        nextBambooValue <= 0
      ) {
        return res
          .status(400)
          .json({ code: "CARD_TIER_BAMBOO_VALUE_REQUIRED" });
      }
    }

    let nextOrder;
    if (order !== undefined) {
      nextOrder = Number(order);
      if (Number.isNaN(nextOrder)) {
        return res.status(400).json({ code: "CARD_TIER_ORDER_INVALID" });
      }
    } else {
      const lastTier = await CardTier.find({ typeId })
        .sort({ order: -1 })
        .limit(1)
        .select("order")
        .lean();
      nextOrder = lastTier.length ? (lastTier[0].order ?? 0) + 1 : 1;
    }

    const normalizedIsActive =
      isActive === "true" ? true : isActive === "false" ? false : isActive;

    const tier = new CardTier({
      typeId,
      order: nextOrder,
      title,
      buyPrice: Number.isNaN(nextBuyPrice) ? null : nextBuyPrice,
      buyPriceUsd: Number.isNaN(nextBuyPriceUsd) ? null : nextBuyPriceUsd,
      sellPrice,
      bambooProductId:
        cardType.fulfillmentSource === "bamboo" ? nextBambooProductId : "",
      value: cardType.fulfillmentSource === "bamboo" ? nextBambooValue : null,
      isActive:
        typeof normalizedIsActive === "boolean"
          ? normalizedIsActive
          : undefined,
    });

    await tier.save();
    return res.status(201).json(tier);
  } catch (err) {
    return handleError(err, res);
  }
};

export const updateOne = async (req, res) => {
  try {
    const { id } = req.query;
    const {
      typeId,
      title,
      buyPrice,
      buyPriceUsd,
      sellPrice,
      bambooProductId,
      value,
      isActive,
    } = req.body;

    const tier = await CardTier.findById(id);
    if (!tier) {
      return res.status(404).json({ code: "CARD_TIER_NOT_FOUND" });
    }

    if (typeId !== undefined) {
      const cardType = await CardType.findById(typeId);
      if (!cardType) {
        return res.status(404).json({ code: "CARD_TYPE_NOT_FOUND" });
      }
      tier.typeId = typeId;
    }

    const targetType = await CardType.findById(typeId ?? tier.typeId);
    const nextBambooProductId =
      bambooProductId?.trim() ?? tier.bambooProductId ?? "";
    const nextBambooValue =
      value === undefined || value === null || value === ""
        ? (tier.value ?? null)
        : Number(value);
    if (targetType?.fulfillmentSource === "bamboo") {
      if (!nextBambooProductId) {
        return res
          .status(400)
          .json({ code: "CARD_TIER_BAMBOO_PRODUCT_ID_REQUIRED" });
      }
      if (
        nextBambooValue === null ||
        Number.isNaN(nextBambooValue) ||
        nextBambooValue <= 0
      ) {
        return res
          .status(400)
          .json({ code: "CARD_TIER_BAMBOO_VALUE_REQUIRED" });
      }
      tier.bambooProductId = nextBambooProductId;
      tier.value = nextBambooValue;
    } else {
      tier.bambooProductId = "";
      tier.value = null;
    }

    if (title !== undefined) {
      tier.title = title;
    }

    if (buyPrice !== undefined) {
      if (buyPrice === null || buyPrice === "") {
        tier.buyPrice = null;
      } else {
        const parsed = Number(buyPrice);
        tier.buyPrice = Number.isNaN(parsed) ? null : parsed;
      }
    }

    if (buyPriceUsd !== undefined) {
      if (buyPriceUsd === null || buyPriceUsd === "") {
        tier.buyPriceUsd = null;
      } else {
        const parsed = Number(buyPriceUsd);
        tier.buyPriceUsd = Number.isNaN(parsed) ? null : parsed;
      }
    }

    if (sellPrice !== undefined) {
      tier.sellPrice = sellPrice;
    }

    if (typeof isActive === "boolean") {
      tier.isActive = isActive;
    }

    await tier.save();
    return res.status(200).json(tier);
  } catch (err) {
    return handleError(err, res);
  }
};

export const deleteOne = async (req, res) => {
  try {
    const { id } = req.query;

    const tier = await CardTier.findById(id);
    if (!tier) {
      return res.status(404).json({ code: "CARD_TIER_NOT_FOUND" });
    }

    const hasCards = await Card.exists({ tierId: id });
    if (hasCards) {
      return res.status(409).json({ code: "CARD_TIER_HAS_CARDS" });
    }

    await tier.deleteOne();
    return res.status(200).json({ code: "CARD_TIER_DELETED" });
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

export const updateOrderList = async (req, res) => {
  try {
    const tiers = Array.isArray(req.body?.tiers) ? req.body.tiers : req.body;

    if (!Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({ code: "CARD_TIER_LIST_REQUIRED" });
    }

    const operations = [];
    const ids = [];

    for (const item of tiers) {
      const id = item?.id ?? item?._id;
      if (!id) {
        return res.status(400).json({ code: "CARD_TIER_ID_INVALID" });
      }

      const nextOrder = Number(item.order);
      if (Number.isNaN(nextOrder)) {
        return res.status(400).json({ code: "CARD_TIER_ORDER_INVALID" });
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
      await CardTier.bulkWrite(operations);
    }

    const updated = await CardTier.find({ _id: { $in: ids } })
      .select("_id title buyPrice sellPrice order typeId")
      .sort({ order: 1 });

    return res.status(200).json(updated);
  } catch (err) {
    return handleError(err, res);
  }
};

import { Types } from "mongoose";
import crypto from "crypto";
import { decryptCardCode, encryptCardCode } from "../utils/cardCodeCrypto.js";

import Card from "../models/card.model.js";
import CardTier from "../models/cardTier.model.js";
import CustomPricing from "../models/customPricing.model.js";
import Order from "../models/order.model.js";
import Setting from "../models/setting.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";
import { placeAndResolveBambooOrder } from "../services/bambooCard.js";

import { handleError } from "../utils/errorHandler.js";
import { getEffectiveBuyPrice } from "../utils/priceCalculator.js";
import parsePagination from "../utils/parsePagination.js";
import generateRandomSerialNumber from "../utils/generateRandomSerialNumber.js";
import { isSandboxMode } from "../utils/sandbox.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildUserSearchFilter = (searchTerm) => {
  const term = searchTerm.trim();
  const terms = term.split(/\s+/);

  const patterns = new Set();
  const addPattern = (item) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    patterns.add(escapeRegex(trimmed));
  };

  addPattern(term);
  terms.forEach(addPattern);

  const orConditions = [];
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, "i");
    orConditions.push({ name: regex }, { phone: regex });
  }

  return orConditions.length > 0 ? { $or: orConditions } : {};
};

const normalizeDate = (value, isEnd) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  if (typeof value === "string" && value.length <= 10) {
    if (isEnd) {
      parsed.setHours(23, 59, 59, 999);
    } else {
      parsed.setHours(0, 0, 0, 0);
    }
  }

  return parsed;
};

const parseAmount = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const SANDBOX_CARD_CODE_LENGTH = 12;
const SANDBOX_TOPUP_AMOUNT = 1000;
const isSandbox = isSandboxMode();

const hashCardCode = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const generateSandboxCardCode = () => {
  let code = "";
  while (code.length < SANDBOX_CARD_CODE_LENGTH) {
    const bytes = crypto.randomBytes(SANDBOX_CARD_CODE_LENGTH);
    for (const byte of bytes) {
      if (code.length >= SANDBOX_CARD_CODE_LENGTH) {
        break;
      }
      code += (byte % 10).toString();
    }
  }
  return code;
};

const normalizeOptionalDate = (value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: true };
  }

  return parsedDate;
};

const withDecryptedCode = (card) => {
  const data = card.toObject();
  data.code = decryptCardCode(data.code);
  return data;
};

const findDuplicateCodeInType = async (tierId, codeHash, excludeCardId) => {
  const tier = await CardTier.findById(tierId).select("typeId");
  if (!tier) {
    return null;
  }

  const relatedTierIds = await CardTier.find({
    typeId: tier.typeId,
  }).select("_id");

  return Card.findOne({
    ...(excludeCardId ? { _id: { $ne: excludeCardId } } : {}),
    tierId: { $in: relatedTierIds.map((item) => item._id) },
    codeHash,
  });
};

const createSandboxCardDocument = async ({ tierId, userId }) => {
  if (!userId) {
    throw Object.assign(new Error("CARD_SOLD_USER_REQUIRED"), {
      code: "CARD_SOLD_USER_REQUIRED",
    });
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateSandboxCardCode();
    const codeHash = hashCardCode(code);
    const duplicate = await findDuplicateCodeInType(tierId, codeHash);
    if (duplicate) {
      continue;
    }

    for (let serialAttempt = 0; serialAttempt < 5; serialAttempt += 1) {
      const card = new Card({
        tierId,
        serialNumber: generateRandomSerialNumber(),
        code: encryptCardCode(code),
        codeHash,
        status: "sold",
        soldTo: userId,
        soldAt: new Date(),
      });

      try {
        await card.save();
        return card;
      } catch (err) {
        if (err?.code === 11000) {
          continue;
        }
        throw err;
      }
    }
  }

  throw Object.assign(new Error("CARD_SANDBOX_CREATE_FAILED"), {
    code: "CARD_SANDBOX_CREATE_FAILED",
  });
};

const createExternalCardDocument = async ({
  tierId,
  userId,
  bambooCard,
  bambooOrderId,
}) => {
  if (!userId) {
    throw Object.assign(new Error("CARD_SOLD_USER_REQUIRED"), {
      code: "CARD_SOLD_USER_REQUIRED",
    });
  }
  const code = bambooCard?.code?.trim();
  if (!code) {
    throw Object.assign(new Error("CARD_CODE_MISSING"), {
      code: "CARD_CODE_MISSING",
    });
  }

  const codeHash = hashCardCode(code);
  const duplicate = await findDuplicateCodeInType(tierId, codeHash);
  if (duplicate) {
    throw Object.assign(new Error("CARD_CODE_DUPLICATE"), {
      code: "CARD_CODE_DUPLICATE",
    });
  }

  const externalSerialNumber = bambooCard?.serialNumber?.trim() || null;
  const externalPin =
    bambooCard?.pin === undefined || bambooCard?.pin === null
      ? null
      : String(bambooCard.pin).trim() || null;
  const externalExpiryDate = normalizeOptionalDate(bambooCard?.expiryDate);
  if (externalExpiryDate && externalExpiryDate.error) {
    throw Object.assign(new Error("CARD_EXPIRY_DATE_INVALID"), {
      code: "CARD_EXPIRY_DATE_INVALID",
    });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const cardPayload = {
      tierId,
      serialNumber: generateRandomSerialNumber(),
      code: encryptCardCode(code),
      codeHash,
      pin: externalPin,
      expiryDate: externalExpiryDate,
      externalSerialNumber,
      externalOrderId: bambooOrderId ?? null,
      status: "sold",
      soldTo: userId,
      soldAt: new Date(),
    };

    const card = new Card(cardPayload);

    try {
      await card.save();
      return card;
    } catch (err) {
      if (err?.code === 11000) {
        continue;
      }
      throw err;
    }
  }

  throw Object.assign(new Error("CARD_SERIAL_NUMBER_TAKEN"), {
    code: "CARD_SERIAL_NUMBER_TAKEN",
  });
};

export const checkoutCart = async (req, res) => {
  const reservedCardIds = [];
  const reservedCards = [];
  const sandboxCreatedIdSet = new Set();

  const trackReserved = (cards) => {
    for (const card of cards) {
      const cardId = card._id;
      reservedCardIds.push(cardId);
      reservedCards.push(card);
      if (isSandbox) {
        sandboxCreatedIdSet.add(String(cardId));
      }
    }
  };

  const releaseReservedCards = async () => {
    if (reservedCardIds.length === 0) return;

    if (isSandbox && sandboxCreatedIdSet.size > 0) {
      await Card.deleteMany({
        _id: { $in: [...sandboxCreatedIdSet] },
      });
    }

    const remainingIds = reservedCardIds.filter(
      (id) => !sandboxCreatedIdSet.has(String(id)),
    );
    if (remainingIds.length === 0) return;

    await Card.updateMany(
      { _id: { $in: remainingIds } },
      { status: "available", soldTo: null, soldAt: null },
    );
  };

  const cancelCheckout = async (
    details,
    code = "CART_AVAILABILITY_CHANGED",
  ) => {
    try {
      await releaseReservedCards();
    } catch (releaseError) {
      // Best effort rollback before sending the cancellation response.
    }
    return res.status(409).json({ code, details });
  };

  try {
    const { items } = req.body;

    if (!req.user) {
      return res.status(403).json({ code: "AUTH_USER_REQUIRED" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: "CART_ITEMS_REQUIRED" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ code: "USER_INACTIVE" });
    }
    if (user.canBuy === false) {
      return res.status(403).json({ code: "USER_CANNOT_BUY" });
    }

    // Helper to avoid floating-point rounding issues for currency (cents precision)
    const roundToCents = (v) =>
      Math.round((Number(v) + Number.EPSILON) * 100) / 100;

    // Fetch dollarRate setting for calculating effective buyPrice
    const dollarRateSetting = await Setting.findOne({
      key: "سعر الدولار",
    }).select("value");
    const dollarRate = Number(dollarRateSetting?.value) || 1;

    const requestedItems = [];
    const availabilityIssues = [];
    let totalCost = 0;

    // Step 1: validate items, check local-only stock, and compute total price
    for (const item of items) {
      const tierId = item?.tierId;
      const requested = Math.max(1, Number(item?.quantity) || 1);

      if (!Types.ObjectId.isValid(tierId)) {
        return res.status(400).json({ code: "CARD_TIER_ID_INVALID" });
      }

      const tier = await CardTier.findById(tierId).populate({
        path: "typeId",
        select: "fulfillmentSource name isActive",
      });
      if (!tier || tier.isActive === false || tier.isAvailable === false) {
        availabilityIssues.push({ tierId, requested, available: 0 });
        continue;
      }

      const fulfillmentSource = tier.typeId?.fulfillmentSource || "local";
      if (fulfillmentSource === "local" && !isSandbox) {
        const localAvailable = await Card.countDocuments({
          tierId,
          status: "available",
        });
        if (localAvailable < requested) {
          availabilityIssues.push({
            tierId,
            requested,
            available: localAvailable,
          });
          continue;
        }
      }

      const customPriceRecord = await CustomPricing.findOne({
        userId: user._id,
        tierId,
      });

      // Calculate effective buyPrice: custom price > calculated USD price > regular buyPrice
      let buyPrice;
      if (customPriceRecord && customPriceRecord.buyPrice !== undefined) {
        buyPrice = Number(customPriceRecord.buyPrice);
      } else {
        buyPrice = getEffectiveBuyPrice(
          tier.buyPrice,
          tier.buyPriceUsd,
          dollarRate,
        );
      }

      if (Number.isNaN(buyPrice) || buyPrice <= 0) {
        return res.status(400).json({ code: "CARD_TIER_PRICE_INVALID" });
      }

      totalCost = roundToCents(totalCost + buyPrice * requested);

      requestedItems.push({
        tierId,
        tierTitle: tier.title,
        buyPrice,
        requested,
        fulfillmentSource,
        bambooProductId: tier.bambooProductId || "",
        bambooValue: tier.value,
      });
    }

    if (availabilityIssues.length > 0) {
      return res.status(409).json({
        code: "CART_AVAILABILITY_CHANGED",
        details: availabilityIssues,
      });
    }

    // Step 2: ensure user balance covers the full checkout
    if (user.balance < totalCost) {
      if (isSandbox) {
        const balanceBefore = roundToCents(user.balance);
        const balanceAfter = roundToCents(balanceBefore + SANDBOX_TOPUP_AMOUNT);
        user.balance = balanceAfter;
        await user.save();

        const deposit = new Transaction({
          userId: user._id,
          type: "deposit",
          amount: SANDBOX_TOPUP_AMOUNT,
          balanceBefore,
          balanceAfter,
        });
        await deposit.save();
      }
      return res.status(400).json({ code: "USER_BALANCE_INSUFFICIENT" });
    }

    const reserveLocalCards = async (tierId, quantity) => {
      const reserved = [];
      const soldAt = new Date();

      for (let i = 0; i < quantity; i += 1) {
        const card = await Card.findOneAndUpdate(
          { tierId, status: "available" },
          { status: "sold", soldTo: user._id, soldAt },
          { returnDocument: "after", sort: { createdAt: 1 } },
        );
        if (!card) {
          break;
        }
        reserved.push(card);
      }

      return reserved;
    };

    const orderItems = [];
    const failureDetails = [];

    if (isSandbox) {
      for (const item of requestedItems) {
        const createdCards = [];
        for (let i = 0; i < item.requested; i += 1) {
          const createdCard = await createSandboxCardDocument({
            tierId: item.tierId,
            userId: user._id,
          });
          createdCards.push(createdCard);
          trackReserved([createdCard]);
        }

        orderItems.push({
          tierId: item.tierId,
          title: item.tierTitle,
          price: item.buyPrice,
          quantity: item.requested,
          externalOrderId: null,
          cards: createdCards.map((card) => card._id),
        });
      }
    } else {
      // Step 3: reserve local-only items (must fully succeed or cancel)
      for (const item of requestedItems.filter(
        (entry) => entry.fulfillmentSource === "local",
      )) {
        const reserved = await reserveLocalCards(item.tierId, item.requested);
        trackReserved(reserved);

        if (reserved.length < item.requested) {
          failureDetails.push({
            tierId: item.tierId,
            requested: item.requested,
            available: reserved.length,
            code: "LOCAL_OUT_OF_STOCK",
          });
          return await cancelCheckout(failureDetails);
        }

        orderItems.push({
          tierId: item.tierId,
          title: item.tierTitle,
          price: item.buyPrice,
          quantity: item.requested,
          provider: "local",
          externalOrderId: null,
          cards: reserved.map((card) => card._id),
        });
      }

      // Step 4: handle bamboo items (use local inventory first, then Bamboo API)
      for (const item of requestedItems.filter(
        (entry) => entry.fulfillmentSource === "bamboo",
      )) {
        const localReserved = await reserveLocalCards(
          item.tierId,
          item.requested,
        );
        trackReserved(localReserved);

        const remainingRequested = item.requested - localReserved.length;
        let externalOrderId = null;
        const bambooCreated = [];

        if (remainingRequested > 0) {
          if (!item.bambooProductId) {
            failureDetails.push({
              tierId: item.tierId,
              requested: remainingRequested,
              available: 0,
              code: "PRODUCT_MISSING",
            });
            return await cancelCheckout(failureDetails);
          }
          if (
            item.bambooValue === null ||
            item.bambooValue === undefined ||
            Number.isNaN(Number(item.bambooValue))
          ) {
            failureDetails.push({
              tierId: item.tierId,
              requested: remainingRequested,
              available: 0,
              code: "VALUE_INVALID",
            });
            return await cancelCheckout(failureDetails);
          }

          let bambooOrder;
          try {
            // Bamboo sequence: POST orders/checkout then GET orders/:id for cards.
            bambooOrder = await placeAndResolveBambooOrder({
              productId: item.bambooProductId,
              value: item.bambooValue,
              quantity: remainingRequested,
              reference: `${user._id}:${item.tierId}:${Date.now()}`,
              metadata: {
                userId: user._id.toString(),
                tierId: item.tierId.toString(),
                tierTitle: item.tierTitle,
              },
            });
          } catch (err) {
            if (err?.code === "OUT_OF_STOCK") {
              failureDetails.push({
                tierId: item.tierId,
                requested: remainingRequested,
                available: Number(err.available ?? 0),
                code: "OUT_OF_STOCK",
                message: err.providerMessage || null,
              });
              return await cancelCheckout(failureDetails);
            }
            throw err;
          }

          externalOrderId =
            bambooOrder?.orderId || bambooOrder?.requestId || null;

          const bambooCards = Array.isArray(bambooOrder?.cards)
            ? bambooOrder.cards.slice(0, remainingRequested)
            : [];
          if (bambooCards.length < remainingRequested) {
            failureDetails.push({
              tierId: item.tierId,
              requested: remainingRequested,
              available: bambooCards.length,
              code: "INCOMPLETE_ORDER",
            });
            return await cancelCheckout(failureDetails);
          }

          try {
            for (const bambooCard of bambooCards) {
              const createdCard = await createExternalCardDocument({
                tierId: item.tierId,
                userId: user._id,
                bambooCard,
                bambooOrderId: externalOrderId,
              });
              bambooCreated.push(createdCard);
              trackReserved([createdCard]);
            }
          } catch (err) {
            failureDetails.push({
              tierId: item.tierId,
              requested: remainingRequested,
              available: 0,
              code: "CARD_PERSIST_FAILED",
            });
            return await cancelCheckout(failureDetails);
          }
        }

        const itemCardIds = [
          ...localReserved.map((card) => card._id),
          ...bambooCreated.map((card) => card._id),
        ];

        if (itemCardIds.length !== item.requested) {
          failureDetails.push({
            tierId: item.tierId,
            requested: item.requested,
            available: itemCardIds.length,
            code: "INCOMPLETE_ORDER",
          });
          return await cancelCheckout(failureDetails);
        }

        orderItems.push({
          tierId: item.tierId,
          title: item.tierTitle,
          price: item.buyPrice,
          quantity: item.requested,
          provider:
            localReserved.length > 0
              ? bambooCreated.length > 0
                ? "local"
                : "local"
              : "bamboo",
          externalOrderId,
          cards: itemCardIds,
        });
      }
    }

    // Step 5: finalize checkout (charge balance, create order, record transaction)
    const balanceBefore = roundToCents(user.balance);
    const balanceAfter = roundToCents(balanceBefore - totalCost);

    user.balance = balanceAfter;
    await user.save();

    const order = new Order({
      userId: user._id,
      totalAmount: totalCost,
      items: orderItems,
    });
    let savedOrder = await order.save();

    const transaction = new Transaction({
      userId: user._id,
      type: "purchase",
      amount: totalCost,
      balanceBefore,
      balanceAfter,
      orderId: savedOrder._id,
    });
    await transaction.save();

    const purchasedCards = reservedCards.map(withDecryptedCode);

    savedOrder = {
      ...savedOrder.toObject(),
      items: savedOrder.items.map((item) => {
        const { provider, externalOrderId, cards, ...rest } = item.toObject();
        return {
          ...rest,
        };
      }),
    };

    return res.status(201).json({
      cards: purchasedCards,
      order: savedOrder,
      balance: user.balance,
      partialFailure: false,
      failedItems: [],
    });
  } catch (err) {
    try {
      await releaseReservedCards();
    } catch (releaseError) {
      // Best effort rollback for unexpected errors.
    }
    return handleError(err, res);
  }
};

export const getOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ code: "AUTH_USER_REQUIRED" });
    }

    const { page, limit } = parsePagination(req.query.page, req.query.limit);
    const filter = { userId: req.user.id };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate([
          {
            path: "items.cards",
            model: "Card",
          },
          {
            path: "items.tierId",
            model: "CardTier",
            populate: {
              path: "typeId",
              model: "CardType",
            },
          },
        ]),
      Order.countDocuments(filter),
    ]);

    const payload = orders.map((order) => {
      const orderObj = order.toObject();
      const items = Array.isArray(orderObj.items) ? orderObj.items : [];

      return {
        _id: orderObj._id,
        totalAmount: orderObj.totalAmount,
        createdAt: orderObj.createdAt,
        items: items.map((item) => {
          const tier =
            item?.tierId && typeof item.tierId === "object"
              ? item.tierId
              : null;
          const type =
            tier?.typeId && typeof tier.typeId === "object"
              ? tier.typeId
              : null;

          return {
            tierId: tier
              ? {
                  _id: tier._id,
                  typeId: type
                    ? {
                        _id: type._id,
                        name: type.name,
                      }
                    : null,
                }
              : null,
            title: item?.title,
            price: item?.price,
            quantity: item?.quantity,
          };
        }),
      };
    });

    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      orders: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(403).json({ code: "AUTH_USER_REQUIRED" });
    }
    const order = await Order.findOne({
      _id: id,
      userId: req.user.id,
    }).populate([
      {
        path: "items.cards",
        model: "Card",
      },
      {
        path: "items.tierId",
        model: "CardTier",
        populate: {
          path: "typeId",
          model: "CardType",
        },
      },
    ]);

    if (!order) {
      return res.status(404).json({ code: "ORDER_NOT_FOUND" });
    }

    const orderObj = order.toObject();
    const items = Array.isArray(orderObj.items) ? orderObj.items : [];

    const payload = {
      _id: orderObj._id,
      totalAmount: orderObj.totalAmount,
      createdAt: orderObj.createdAt,
      items: items.map((item) => {
        const tier =
          item?.tierId && typeof item.tierId === "object" ? item.tierId : null;
        const type =
          tier?.typeId && typeof tier.typeId === "object" ? tier.typeId : null;
        const cards = Array.isArray(item?.cards) ? item.cards : [];

        return {
          tierId: tier
            ? {
                _id: tier._id,
                title: tier.title,
                typeId: type
                  ? {
                      _id: type._id,
                      name: type.name,
                      redeemFormat: type.redeemFormat ?? null,
                      image: type.image ?? null,
                      printImage: type.printImage ?? null,
                      showExpiryDateDay: type.showExpiryDateDay ?? null,
                    }
                  : null,
              }
            : null,
          title: item?.title,
          price: item?.price,
          quantity: item?.quantity,
          cards: cards.map((card) => {
            if (!card || typeof card !== "object") {
              return card ? { _id: card } : card;
            }

            const decryptedCode = card.code
              ? decryptCardCode(card.code)
              : (card.code ?? null);

            return {
              _id: card._id,
              serialNumber: card.serialNumber ?? null,
              code: decryptedCode,
              pin: card.pin ?? null,
              expiryDate: card.expiryDate ?? null,
              redeemFormat: type?.redeemFormat || null,
            };
          }),
        };
      }),
    };

    return res.status(200).json(payload);
  } catch (err) {
    return handleError(err, res);
  }
};

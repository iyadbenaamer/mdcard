import mongoose from "mongoose";
import fs from "fs";
import ExcelJS from "exceljs";

import Card from "../models/card.model.js";
import CardTier from "../models/cardTier.model.js";
import CardType from "../models/cardType.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import CustomePricing from "../models/customePricing.model.js";
import { placeAndResolveBambooOrder } from "../services/bambooCard.js";

import { handleError } from "../utils/errorHandler.js";
import parsePagination from "../utils/parsePagination.js";
import crypto from "crypto";
import { decryptCardCode, encryptCardCode } from "../utils/cardCodeCrypto.js";

const SERIAL_LENGTH = 15;
const SERIAL_MODULO = 10n ** BigInt(SERIAL_LENGTH);

const isValidSerialNumber = (value) => /^\d{15}$/.test(value);

const generateRandomSerialNumber = () => {
  const bytes = crypto.randomBytes(8);
  const value = BigInt(`0x${bytes.toString("hex")}`) % SERIAL_MODULO;
  return value.toString().padStart(SERIAL_LENGTH, "0");
};

const hashCardCode = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const parseExcelCodes = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets?.[0];
  if (!sheet) return [];

  const codes = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cellValue = row.getCell(1)?.value;
    if (cellValue == null) return;

    let normalizedValue = cellValue;
    if (typeof cellValue === "object") {
      if (cellValue.text) {
        normalizedValue = cellValue.text;
      } else if (Array.isArray(cellValue.richText)) {
        normalizedValue = cellValue.richText.map((part) => part.text).join("");
      } else if ("result" in cellValue) {
        normalizedValue = cellValue.result;
      }
    }

    const trimmed = String(normalizedValue).trim();
    if (trimmed.length > 0) {
      codes.push(trimmed);
    }
  });

  return codes;
};

const sanitizeCardForPublic = (card) => {
  const data = card.toObject();
  delete data.code;
  return data;
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

const createExternalCardDocument = async ({
  tierId,
  userId,
  bambooCard,
  bambooOrderId,
}) => {
  const code = bambooCard?.code?.trim();
  if (!code) {
    throw Object.assign(new Error("BAMBOO_CARD_CODE_MISSING"), {
      code: "BAMBOO_CARD_CODE_MISSING",
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

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const card = new Card({
      tierId,
      serialNumber: generateRandomSerialNumber(),
      code: encryptCardCode(code),
      codeHash,
      provider: "bamboo",
      externalSerialNumber,
      externalOrderId: bambooOrderId ?? null,
      externalStatus: bambooCard?.status ?? null,
      externalPayload: bambooCard?.raw ?? null,
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

  throw Object.assign(new Error("CARD_SERIAL_NUMBER_TAKEN"), {
    code: "CARD_SERIAL_NUMBER_TAKEN",
  });
};

export const getPaginated = async (req, res) => {
  try {
    const { tierId, status, soldTo, serialNumber } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    const filter = {};

    if (tierId) {
      if (!mongoose.Types.ObjectId.isValid(tierId)) {
        return res.status(400).json({ code: "CARD_TIER_ID_INVALID" });
      }
      filter.tierId = tierId;
    }

    if (status) {
      if (!["available", "sold"].includes(status)) {
        return res.status(400).json({ code: "CARD_STATUS_INVALID" });
      }
      filter.status = status;
    }

    if (soldTo) {
      if (!mongoose.Types.ObjectId.isValid(soldTo)) {
        return res.status(400).json({ code: "CARD_SOLD_TO_INVALID" });
      }
      filter.soldTo = soldTo;
    }

    if (serialNumber) {
      filter.serialNumber = serialNumber.trim();
    }

    if (!req.admin) {
      filter.status = "available";
    }

    const total = await Card.countDocuments(filter);
    const cards = await Card.find(filter)
      .sort({ serialNumber: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const payload = req.admin
      ? cards.map(withDecryptedCode)
      : cards.map(sanitizeCardForPublic);

    return res.status(200).json({
      cards: payload,
      total,
      totalPages,
      page,
      limit,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getByCategory = async (req, res) => {
  try {
    const { categoryId, status, sortBy, sortOrder, serialNumber } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ code: "CARD_CATEGORY_ID_INVALID" });
    }

    if (status && !["available", "sold"].includes(status)) {
      return res.status(400).json({ code: "CARD_STATUS_INVALID" });
    }

    const allowedSortFields = new Set([
      "serialNumber",
      "status",
      "createdAt",
      "typeName",
      "tierTitle",
    ]);
    const sortField = allowedSortFields.has(sortBy) ? sortBy : "serialNumber";
    const sortDirection = sortOrder === "desc" ? -1 : 1;

    const matchStatus = status ? { status } : {};
    const matchSerial = serialNumber
      ? { serialNumber: serialNumber.trim() }
      : {};

    const pipeline = [
      { $match: { ...matchStatus, ...matchSerial } },
      {
        $lookup: {
          from: "card_tiers",
          localField: "tierId",
          foreignField: "_id",
          as: "tier",
        },
      },
      { $unwind: "$tier" },
      {
        $lookup: {
          from: "card_types",
          localField: "tier.typeId",
          foreignField: "_id",
          as: "type",
        },
      },
      { $unwind: "$type" },
      {
        $match: {
          "type.categoryId": new mongoose.Types.ObjectId(categoryId),
        },
      },
      {
        $project: {
          serialNumber: 1,
          code: 1,
          status: 1,
          tierTitle: "$tier.title",
          typeName: "$type.name",
          createdAt: 1,
        },
      },
      { $sort: { [sortField]: sortDirection, _id: 1 } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Card.aggregate(pipeline);
    const total = result?.total?.[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const cards = (result?.data ?? []).map((card) => ({
      ...card,
      code: decryptCardCode(card.code),
    }));

    return res.status(200).json({
      cards,
      total,
      totalPages,
      page,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getOne = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ code: "CARD_ID_REQUIRED" });
    }

    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ code: "CARD_NOT_FOUND" });
    }

    if (!req.admin && card.status === "sold") {
      if (!req.user || !card.soldTo || card.soldTo.toString() !== req.user.id) {
        return res.status(404).json({ code: "CARD_NOT_FOUND" });
      }
      return res.status(200).json(withDecryptedCode(card));
    }

    if (!req.admin) {
      return res.status(200).json(sanitizeCardForPublic(card));
    }

    return res.status(200).json(withDecryptedCode(card));
  } catch (err) {
    return handleError(err, res);
  }
};

export const updateOne = async (req, res) => {
  try {
    const { id } = req.query;
    let { tierId, serialNumber, code, status, soldTo, soldAt } = req.body;

    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ code: "CARD_NOT_FOUND" });
    }

    const resolveTargetTier = async () => {
      const targetTierId = tierId ?? card.tierId;
      return CardTier.findById(targetTierId);
    };

    if (tierId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(tierId)) {
        return res.status(400).json({ code: "CARD_TIER_ID_INVALID" });
      }
      const tierExists = await CardTier.findById(tierId);
      if (!tierExists) {
        return res.status(404).json({ code: "CARD_TIER_NOT_FOUND" });
      }
      card.tierId = tierId;
    }

    if (serialNumber !== undefined) {
      serialNumber = serialNumber?.trim();
      if (!serialNumber) {
        return res.status(400).json({ code: "CARD_SERIAL_NUMBER_REQUIRED" });
      }
      if (!isValidSerialNumber(serialNumber)) {
        return res.status(400).json({ code: "CARD_SERIAL_NUMBER_INVALID" });
      }
      if (await Card.findOne({ serialNumber, _id: { $ne: card._id } })) {
        return res.status(409).json({ code: "CARD_SERIAL_NUMBER_TAKEN" });
      }
      card.serialNumber = serialNumber;
    }

    if (code !== undefined) {
      code = code?.trim();
      if (!code) {
        return res.status(400).json({ code: "CARD_CODE_REQUIRED" });
      }
      const targetTier = await resolveTargetTier();
      if (!targetTier) {
        return res.status(404).json({ code: "CARD_TIER_NOT_FOUND" });
      }
      const relatedTierIds = await CardTier.find({
        typeId: targetTier.typeId,
      }).select("_id");
      const codeHash = hashCardCode(code);
      const duplicate = await Card.findOne({
        _id: { $ne: card._id },
        tierId: { $in: relatedTierIds.map((tier) => tier._id) },
        codeHash,
      });
      if (duplicate) {
        return res.status(409).json({ code: "CARD_CODE_DUPLICATE" });
      }
      card.code = encryptCardCode(code);
      card.codeHash = codeHash;
    }

    if (tierId !== undefined && code === undefined && card.codeHash) {
      const targetTier = await resolveTargetTier();
      if (!targetTier) {
        return res.status(404).json({ code: "CARD_TIER_NOT_FOUND" });
      }
      const relatedTierIds = await CardTier.find({
        typeId: targetTier.typeId,
      }).select("_id");
      const duplicate = await Card.findOne({
        _id: { $ne: card._id },
        tierId: { $in: relatedTierIds.map((tier) => tier._id) },
        codeHash: card.codeHash,
      });
      if (duplicate) {
        return res.status(409).json({ code: "CARD_CODE_DUPLICATE" });
      }
    }

    if (status !== undefined) {
      if (!["available", "sold"].includes(status)) {
        return res.status(400).json({ code: "CARD_STATUS_INVALID" });
      }
      card.status = status;
    }

    if (soldTo !== undefined) {
      if (soldTo === null || soldTo === "") {
        card.soldTo = null;
      } else if (!mongoose.Types.ObjectId.isValid(soldTo)) {
        return res.status(400).json({ code: "CARD_SOLD_TO_INVALID" });
      } else {
        card.soldTo = soldTo;
      }
    }

    if (soldAt !== undefined) {
      const parsedSoldAt = soldAt ? new Date(soldAt) : null;
      if (parsedSoldAt && Number.isNaN(parsedSoldAt.getTime())) {
        return res.status(400).json({ code: "CARD_SOLD_AT_INVALID" });
      }
      card.soldAt = parsedSoldAt;
    }

    await card.save();
    return res.status(200).json(withDecryptedCode(card));
  } catch (err) {
    return handleError(err, res);
  }
};

export const createOne = async (req, res) => {
  try {
    let { tierId, serialNumber, code, status, soldTo, soldAt } = req.body;

    if (!tierId || !code) {
      return res.status(400).json({ code: "CARD_REQUIRED_FIELDS_MISSING" });
    }

    if (!mongoose.Types.ObjectId.isValid(tierId)) {
      return res.status(400).json({ code: "CARD_TIER_ID_INVALID" });
    }

    const tierExists = await CardTier.findById(tierId);
    if (!tierExists) {
      return res.status(404).json({ code: "CARD_TIER_NOT_FOUND" });
    }

    serialNumber = serialNumber?.trim();
    if (serialNumber) {
      if (!isValidSerialNumber(serialNumber)) {
        return res.status(400).json({ code: "CARD_SERIAL_NUMBER_INVALID" });
      }
      if (await Card.findOne({ serialNumber })) {
        return res.status(409).json({ code: "CARD_SERIAL_NUMBER_TAKEN" });
      }
    }

    code = code?.trim();
    if (!code) {
      return res.status(400).json({ code: "CARD_CODE_REQUIRED" });
    }

    const codeHash = hashCardCode(code);
    const relatedTierIds = await CardTier.find({
      typeId: tierExists.typeId,
    }).select("_id");
    const duplicate = await Card.findOne({
      tierId: { $in: relatedTierIds.map((tier) => tier._id) },
      codeHash,
    });
    if (duplicate) {
      return res.status(409).json({ code: "CARD_CODE_DUPLICATE" });
    }

    if (status !== undefined) {
      if (!["available", "sold"].includes(status)) {
        return res.status(400).json({ code: "CARD_STATUS_INVALID" });
      }
    }

    if (soldTo !== undefined) {
      if (soldTo === null || soldTo === "") {
        soldTo = null;
      } else if (!mongoose.Types.ObjectId.isValid(soldTo)) {
        return res.status(400).json({ code: "CARD_SOLD_TO_INVALID" });
      }
    }

    if (soldAt !== undefined) {
      const parsedSoldAt = soldAt ? new Date(soldAt) : null;
      if (parsedSoldAt && Number.isNaN(parsedSoldAt.getTime())) {
        return res.status(400).json({ code: "CARD_SOLD_AT_INVALID" });
      }
      soldAt = parsedSoldAt;
    }

    const shouldAutoGenerateSerial = !serialNumber;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const nextSerial = shouldAutoGenerateSerial
        ? generateRandomSerialNumber()
        : serialNumber;

      const card = new Card({
        tierId,
        serialNumber: nextSerial,
        code: encryptCardCode(code),
        codeHash,
        status,
        soldTo,
        soldAt,
      });

      try {
        await card.save();
        return res.status(201).json(withDecryptedCode(card));
      } catch (err) {
        if (err?.code === 11000 && shouldAutoGenerateSerial) {
          continue;
        }
        if (err?.code === 11000) {
          return res.status(409).json({ code: "CARD_SERIAL_NUMBER_TAKEN" });
        }
        throw err;
      }
    }

    return res.status(409).json({ code: "CARD_SERIAL_NUMBER_TAKEN" });
  } catch (err) {
    return handleError(err, res);
  }
};

export const deleteOne = async (req, res) => {
  try {
    const { id } = req.query;

    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ code: "CARD_NOT_FOUND" });
    }

    await card.deleteOne();
    return res.status(200).json({ code: "CARD_DELETED" });
  } catch (err) {
    return handleError(err, res);
  }
};

export const importFromExcel = async (req, res) => {
  const filePath = req.file?.path;
  try {
    const { tierId } = req.body;

    if (!filePath) {
      return res.status(400).json({ code: "CARD_IMPORT_FILE_REQUIRED" });
    }

    if (!tierId || !mongoose.Types.ObjectId.isValid(tierId)) {
      return res.status(400).json({ code: "CARD_TIER_ID_INVALID" });
    }

    const tierExists = await CardTier.findById(tierId);
    if (!tierExists) {
      return res.status(404).json({ code: "CARD_TIER_NOT_FOUND" });
    }

    const relatedTierIds = await CardTier.find({
      typeId: tierExists.typeId,
    }).select("_id");
    const relatedTierIdList = relatedTierIds.map((tier) => tier._id);

    const codes = await parseExcelCodes(filePath);
    if (codes.length === 0) {
      return res.status(400).json({ code: "CARD_IMPORT_EMPTY" });
    }

    let created = 0;
    const failed = [];

    for (const code of codes) {
      const normalizedCode = code?.trim();
      if (!normalizedCode) {
        continue;
      }

      const codeHash = hashCardCode(normalizedCode);
      const duplicate = await Card.findOne({
        tierId: { $in: relatedTierIdList },
        codeHash,
      });
      if (duplicate) {
        failed.push({ code: normalizedCode, reason: "CARD_CODE_DUPLICATE" });
        continue;
      }

      let createdCard = false;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const serialNumber = generateRandomSerialNumber();
        const card = new Card({
          tierId,
          serialNumber,
          code: encryptCardCode(normalizedCode),
          codeHash,
          status: "available",
        });
        try {
          await card.save();
          created += 1;
          createdCard = true;
          break;
        } catch (err) {
          if (err?.code === 11000) {
            continue;
          }
          failed.push({ code: normalizedCode, reason: "CARD_CREATE_FAILED" });
          break;
        }
      }

      if (!createdCard) {
        failed.push({
          code: normalizedCode,
          reason: "CARD_SERIAL_NUMBER_TAKEN",
        });
      }
    }

    return res.status(201).json({
      created,
      failedCount: failed.length,
      failed,
    });
  } catch (err) {
    return handleError(err, res);
  } finally {
    if (filePath) {
      fs.promises.unlink(filePath).catch(() => null);
    }
  }
};

export const checkoutCart = async (req, res) => {
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

    let totalCost = 0;
    const availabilityResults = [];
    let hasAvailabilityIssue = false;
    const processList = [];

    // 1. Verify availability and calculate costs
    for (const item of items) {
      const { tierId, quantity } = item;
      const requested = Math.max(1, Number(quantity) || 1);

      if (!mongoose.Types.ObjectId.isValid(tierId)) {
        return res.status(400).json({ code: "CARD_TIER_ID_INVALID" });
      }

      const tier = await CardTier.findById(tierId).populate({
        path: "typeId",
        select: "fulfillmentSource name isActive",
      });
      if (!tier || tier.isActive === false || tier.isAvailable === false) {
        availabilityResults.push({ tierId, requested, available: 0 });
        hasAvailabilityIssue = true;
        continue;
      }

      const fulfillmentSource = tier.typeId?.fulfillmentSource || "local";
      const availableCount =
        fulfillmentSource === "bamboo"
          ? requested
          : await Card.countDocuments({
              tierId,
              status: "available",
            });

      availabilityResults.push({
        tierId,
        requested,
        available: Math.min(requested, availableCount),
      });

      if (availableCount < requested) {
        hasAvailabilityIssue = true;
      } else {
        // Check for custom pricing for this user and tier
        const customPriceRecord = await CustomePricing.findOne({
          userId: user._id,
          tierId,
        });

        const buyPrice =
          customPriceRecord && customPriceRecord.buyPrice !== undefined
            ? Number(customPriceRecord.buyPrice)
            : Number(tier.buyPrice);

        if (Number.isNaN(buyPrice) || buyPrice <= 0) {
          return res.status(400).json({ code: "CARD_TIER_PRICE_INVALID" });
        }
        totalCost += buyPrice * requested;

        processList.push({
          tierId,
          tierTitle: tier.title,
          buyPrice,
          requested,
          fulfillmentSource,
          bambooProductId: tier.bambooProductId || "",
          bambooValue: tier.value,
        });
      }
    }

    // If any item changed availability, halt and return exact availability structure to update Redux warning state
    if (hasAvailabilityIssue) {
      return res.status(409).json({
        code: "CART_AVAILABILITY_CHANGED",
        details: availabilityResults,
      });
    }

    // 2. Check user balance
    if (user.balance < totalCost) {
      return res.status(400).json({ code: "USER_BALANCE_INSUFFICIENT" });
    }

    // 3. Process exactly as requested, sequentially updating cards and saving transactions
    const purchasedCards = [];
    const balanceBeforeWholeOrder = user.balance;
    let currentBalance = user.balance;
    let partialFailure = false;
    const orderItems = [];
    const failureDetails = [];

    for (const item of processList) {
      const fulfilledCards = [];
      let externalOrderId = null;

      if (item.fulfillmentSource === "bamboo") {
        if (!item.bambooProductId) {
          partialFailure = true;
          continue;
        }
        if (item.bambooValue === null || item.bambooValue === undefined || Number.isNaN(Number(item.bambooValue))) {
          partialFailure = true;
          continue;
        }

        let bambooOrder;
        try {
          bambooOrder = await placeAndResolveBambooOrder({
            productId: item.bambooProductId,
            value: item.bambooValue,
            quantity: item.requested,
            reference: `${user._id}:${item.tierId}:${Date.now()}`,
            metadata: {
              userId: user._id.toString(),
              tierId: item.tierId.toString(),
              tierTitle: item.tierTitle,
            },
          });
        } catch (err) {
          if (err?.code === "BAMBOO_OUT_OF_STOCK") {
            failureDetails.push({
              tierId: item.tierId,
              requested: item.requested,
              available: Number(err.available ?? 0),
              provider: "bamboo",
              code: "BAMBOO_OUT_OF_STOCK",
              message: err.providerMessage || null,
            });
          }
          partialFailure = true;
          continue;
        }

        externalOrderId = bambooOrder?.orderId || null;

        const bambooCards = Array.isArray(bambooOrder?.cards) ? bambooOrder.cards : [];
        if (bambooCards.length < item.requested) {
          failureDetails.push({
            tierId: item.tierId,
            requested: item.requested,
            available: bambooCards.length,
            provider: "bamboo",
            code: "BAMBOO_INCOMPLETE_ORDER",
          });
          partialFailure = true;
          continue;
        }

        try {
          for (let i = 0; i < item.requested; i += 1) {
            const createdCard = await createExternalCardDocument({
              tierId: item.tierId,
              userId: user._id,
              bambooCard: bambooCards[i],
              bambooOrderId: bambooOrder.orderId,
            });
            fulfilledCards.push(createdCard._id);
            purchasedCards.push(withDecryptedCode(createdCard));
          }
        } catch (err) {
          failureDetails.push({
            tierId: item.tierId,
            requested: item.requested,
            available: 0,
            provider: "bamboo",
            code: "BAMBOO_CARD_PERSIST_FAILED",
          });
          partialFailure = true;
          continue;
        }
      } else {
        for (let i = 0; i < item.requested; i++) {
          const card = await Card.findOneAndUpdate(
            { tierId: item.tierId, status: "available" },
            {
              status: "sold",
              soldTo: user._id,
              soldAt: new Date(),
            },
            { returnDocument: "after", sort: { createdAt: 1 } },
          );

          // If card was bought by someone else between our check and our update
          if (!card) {
            partialFailure = true;
            break;
          }

          currentBalance -= item.buyPrice;
          currentBalance = roundToCents(currentBalance);

          fulfilledCards.push(card._id);
          purchasedCards.push(withDecryptedCode(card));
        }
      }

      if (item.fulfillmentSource === "bamboo" && fulfilledCards.length > 0) {
        currentBalance -= item.buyPrice * fulfilledCards.length;
        currentBalance = roundToCents(currentBalance);
      }

      if (fulfilledCards.length > 0) {
        orderItems.push({
          tierId: item.tierId,
          title: item.tierTitle,
          price: item.buyPrice,
          quantity: fulfilledCards.length,
          provider: item.fulfillmentSource,
          externalOrderId,
          cards: fulfilledCards,
        });
      }
    }

    if (orderItems.length === 0 && partialFailure) {
      return res.status(409).json({
        code: "CART_AVAILABILITY_CHANGED",
        details: failureDetails.length > 0 ? failureDetails : availabilityResults,
      });
    }

    // 4. Update the user balance to reflect whatever was successfully charged
    user.balance = roundToCents(currentBalance);
    await user.save();

    let savedOrder = null;
    if (orderItems.length > 0) {
      const actualTotalCost = roundToCents(
        balanceBeforeWholeOrder - currentBalance,
      );
      const order = new Order({
        userId: user._id,
        totalAmount: actualTotalCost,
        items: orderItems,
      });
      savedOrder = await order.save();

      const transaction = new Transaction({
        userId: user._id,
        type: "purchase",
        amount: actualTotalCost,
        balanceBefore: roundToCents(balanceBeforeWholeOrder),
        balanceAfter: roundToCents(currentBalance),
        orderId: savedOrder._id,
      });
      await transaction.save();
    }
    return res.status(201).json({
      cards: purchasedCards,
      order: savedOrder,
      balance: user.balance,
      partialFailure,
      failedItems: failureDetails,
    });
  } catch (err) {
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

    // Decrypt the cards within the orders before sending
    const payload = orders.map((order) => {
      const orderObj = order.toObject();
      orderObj.items = orderObj.items.map((item) => ({
        ...item,
        cards: item.cards.map((card) => {
          if (card && card.code) {
            return {
              ...card,
              code: decryptCardCode(card.code),
              // include type-level print fields so mobile can print directly
              redeemFormat: item.tierId?.typeId?.redeemFormat || null,
              printImage: item.tierId?.typeId?.printImage || null,
            };
          }
          return card;
        }),
      }));
      return orderObj;
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

    // Decrypt the cards within the order before sending
    const orderObj = order.toObject();
    orderObj.items = orderObj.items.map((item) => ({
      ...item,
      cards: item.cards.map((card) => {
        if (card && card.code) {
          return {
            ...card,
            code: decryptCardCode(card.code),
            // include type-level print fields so mobile can print directly
            redeemFormat: item.tierId?.typeId?.redeemFormat || null,
            printImage: item.tierId?.typeId?.printImage || null,
          };
        }
        return card;
      }),
    }));

    return res.status(200).json(orderObj);
  } catch (err) {
    return handleError(err, res);
  }
};

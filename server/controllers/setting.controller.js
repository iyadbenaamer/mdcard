import { Types } from "mongoose";

import Setting from "../models/setting.model.js";
import { handleError } from "../utils/errorHandler.js";

const DOLLAR_RATE_KEYS = ["سعر الدولار", "dollarRate"];
const isDollarRateKey = (key) =>
  DOLLAR_RATE_KEYS.includes((key ?? "").toString().trim());
const isNumericDollarRate = (value) => {
  if (value === undefined || value === null) return false;
  const strValue = value.toString().trim();
  if (!strValue) return false;
  return !Number.isNaN(Number(strValue));
};

export const getAll = async (req, res) => {
  try {
    const settings = await Setting.find().sort({ key: 1 });
    return res.status(200).json(settings);
  } catch (err) {
    return handleError(err, res);
  }
};

export const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: "SETTING_ID_INVALID" });
    }
    const setting = await Setting.findById(id);
    if (!setting) return res.status(404).json({ code: "SETTING_NOT_FOUND" });
    return res.status(200).json(setting);
  } catch (err) {
    return handleError(err, res);
  }
};

export const createOne = async (req, res) => {
  try {
    const { key, value, description, group } = req.body;
    if (!key) return res.status(400).json({ code: "SETTING_KEY_REQUIRED" });

    const trimmedKey = key?.toString().trim();
    if (!trimmedKey)
      return res.status(400).json({ code: "SETTING_KEY_REQUIRED" });

    if (isDollarRateKey(trimmedKey) && !isNumericDollarRate(value)) {
      return res.status(400).json({
        code: "SETTING_DOLLAR_RATE_VALUE_INVALID",
        message: "Dollar rate value must be numeric",
      });
    }

    // Prevent creating protected settings
    if (["support", "سعر الدولار"].includes(trimmedKey)) {
      return res.status(403).json({
        code: "SETTING_CANNOT_CREATE",
        message: "Cannot create protected setting",
      });
    }

    const exists = await Setting.findOne({ key: trimmedKey });
    if (exists) return res.status(409).json({ code: "SETTING_KEY_EXISTS" });

    const setting = new Setting({ key: trimmedKey, value, description, group });
    await setting.save();
    return res.status(201).json(setting);
  } catch (err) {
    return handleError(err, res);
  }
};

export const updateOne = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: "SETTING_ID_INVALID" });
    }

    // load existing so we can protect support key
    const existingSetting = await Setting.findById(id);
    if (!existingSetting)
      return res.status(404).json({ code: "SETTING_NOT_FOUND" });

    const update = {};
    const { key, value, description, group } = req.body;
    if (key !== undefined) update.key = key?.toString().trim();
    if (value !== undefined) update.value = value;
    if (description !== undefined) update.description = description;
    if (group !== undefined) update.group = group;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ code: "SETTING_NO_UPDATE_FIELDS" });
    }

    const targetKey = update.key ?? existingSetting.key;
    if (
      isDollarRateKey(targetKey) &&
      update.value !== undefined &&
      !isNumericDollarRate(update.value)
    ) {
      return res.status(400).json({
        code: "SETTING_DOLLAR_RATE_VALUE_INVALID",
        message: "Dollar rate value must be numeric",
      });
    }

    // do not allow renaming the protected keys (support, dollarRate)
    if (
      ["support", "سعر الدولار"].includes(existingSetting.key) &&
      update.key &&
      !["support", "سعر الدولار"].includes(update.key)
    ) {
      return res.status(403).json({
        code: "SETTING_CANNOT_RENAME",
        message: "Cannot rename protected setting",
      });
    }

    // If key is being updated, ensure uniqueness
    if (update.key) {
      const exists = await Setting.findOne({
        key: update.key,
        _id: { $ne: id },
      });
      if (exists) return res.status(409).json({ code: "SETTING_KEY_EXISTS" });
    }

    const updated = await Setting.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );
    return res.status(200).json(updated);
  } catch (err) {
    return handleError(err, res);
  }
};

export const updateMany = async (req, res) => {
  try {
    const updates = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ code: "SETTING_NO_UPDATES" });
    }

    const results = [];
    for (const u of updates) {
      const { id, key, value, description, group } = u;
      if (id && !Types.ObjectId.isValid(id)) {
        continue; // skip invalid id entries
      }

      if (id) {
        // protect support and dollarRate keys from being renamed via bulk edit
        const existing = await Setting.findById(id);
        const update = {};
        if (key !== undefined) update.key = key?.toString().trim();
        if (value !== undefined) update.value = value;
        if (description !== undefined) update.description = description;
        if (group !== undefined) update.group = group;
        if (Object.keys(update).length === 0) continue;

        if (
          existing &&
          ["support", "سعر الدولار"].includes(existing.key) &&
          update.key &&
          !["support", "سعر الدولار"].includes(update.key)
        ) {
          // skip attempts to rename protected settings
          delete update.key;
        }

        const targetKey = update.key ?? existing?.key;
        if (
          isDollarRateKey(targetKey) &&
          update.value !== undefined &&
          !isNumericDollarRate(update.value)
        ) {
          return res.status(400).json({
            code: "SETTING_DOLLAR_RATE_VALUE_INVALID",
            message: "Dollar rate value must be numeric",
          });
        }

        if (update.key) {
          const exists = await Setting.findOne({
            key: update.key,
            _id: { $ne: id },
          });
          if (exists) {
            return res.status(409).json({
              code: "SETTING_KEY_EXISTS",
              message: `Key ${update.key} already exists`,
            });
          }
        }

        const updated = await Setting.findByIdAndUpdate(
          id,
          { $set: update },
          { new: true },
        );
        if (updated) results.push(updated);
      } else {
        const trimmedKey = key?.toString().trim();
        if (!trimmedKey) continue;
        if (isDollarRateKey(trimmedKey) && !isNumericDollarRate(value)) {
          return res.status(400).json({
            code: "SETTING_DOLLAR_RATE_VALUE_INVALID",
            message: "Dollar rate value must be numeric",
          });
        }
        const exists = await Setting.findOne({ key: trimmedKey });
        if (exists) continue;
        const newSetting = new Setting({
          key: trimmedKey,
          value,
          description,
          group,
        });
        await newSetting.save();
        results.push(newSetting);
      }
    }

    return res.status(200).json(results);
  } catch (err) {
    return handleError(err, res);
  }
};

export const deleteOne = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: "SETTING_ID_INVALID" });
    }
    const setting = await Setting.findById(id);
    if (!setting) return res.status(404).json({ code: "SETTING_NOT_FOUND" });
    if (["support", "سعر الدولار"].includes(setting.key)) {
      return res.status(403).json({
        code: "SETTING_CANNOT_DELETE",
        message: "Cannot delete protected setting",
      });
    }
    const deleted = await Setting.findByIdAndDelete(id);
    return res.status(200).json({ message: "SETTING_DELETED" });
  } catch (err) {
    return handleError(err, res);
  }
};

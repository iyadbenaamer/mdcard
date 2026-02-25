import bcrypt from "bcrypt";

import User from "../models/user.model.js";
import { handleError } from "../utils/errorHandler.js";
import Setting from "../models/setting.model.js";

export const getOne = async (req, res) => {
  try {
    const { id } = req.query;

    const profile = await User.findById(id).select(
      "name phone balance isActive canBuy canSendCode createdAt updatedAt",
    );
    if (!profile) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }
    const support = await Setting.findOne({ key: "support" }).select("value");
    return res.status(200).json({ profile, support: support?.value || "" });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getAll = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
    const sortBy = req.query.sortBy === "status" ? "status" : "name";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
    const sortField = sortBy === "status" ? "isActive" : "name";

    const total = await User.countDocuments();
    const users = await User.find()
      .select("name phone isActive createdAt")
      .sort({ [sortField]: sortOrder, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      users,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return handleError(err, res);
  }
};

/*UPDATE*/

export const updateOne = async (req, res) => {
  try {
    const { id } = req.user;
    let { name, password } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }

    if (name !== undefined) {
      name = name?.trim();
      if (!name) {
        return res.status(400).json({ code: "USER_NAME_REQUIRED" });
      }
      user.name = name;
    }
    if (password) {
      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(password, salt);
    }
    await user.save();
    return res.status(200).json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      balance: user.balance,
      isActive: user.isActive,
      canBuy: user.canBuy,
      createdAt: user.createdAt,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

import bcrypt from "bcrypt";

import User from "../models/user.model.js";
import { handleError } from "../utils/errorHandler.js";
import Setting from "../models/setting.model.js";

export const get = async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }
    const support = await Setting.findOne({ key: "support" }).select("value");
    return res.status(200).json({
      profile: {
        name: user.name,
        phone: user.phone,
        role: user.role || "business",
        balance: user.balance,
        isActive: user.isActive,
        canBuy: user.canBuy,
        canSendCode: user.canSendCode,
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      support: support?.value || "",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

/*UPDATE*/

export const update = async (req, res) => {
  try {
    const { id } = req.user;
    let { password } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
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
      role: user.role || "business",
      balance: user.balance,
      isActive: user.isActive,
      canBuy: user.canBuy,
      createdAt: user.createdAt,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

/*PUSH TOKENS*/

export const registerPushToken = async (req, res) => {
  try {
    const { id } = req.user;
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ code: "PUSH_TOKEN_REQUIRED" });
    }

    await User.findByIdAndUpdate(id, { $addToSet: { pushTokens: token } });
    return res.status(200).json({ code: "PUSH_TOKEN_REGISTERED" });
  } catch (err) {
    return handleError(err, res);
  }
};

export const unregisterPushToken = async (req, res) => {
  try {
    const { id } = req.user;
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ code: "PUSH_TOKEN_REQUIRED" });
    }

    await User.findByIdAndUpdate(id, { $pull: { pushTokens: token } });
    return res.status(200).json({ code: "PUSH_TOKEN_UNREGISTERED" });
  } catch (err) {
    return handleError(err, res);
  }
};

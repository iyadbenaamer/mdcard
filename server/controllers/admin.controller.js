import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";

import { handleError } from "../utils/errorHandler.js";
import Setting from "../models/setting.model.js";

const REMEMBER_ME_EXPIRATION = "90d";
const ACCESS_TOKEN_EXPIRATION = "14d";
const ACCESS_TOKEN_COOKIE = "admin_token";

const parseDurationToMs = (duration) => {
  if (typeof duration !== "string") {
    return null;
  }
  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[unit];
};

const setAuthCookies = (res, { accessToken, rememberMe }) => {
  const isProduction = process.env.NODE_ENV === "production";
  const accessMaxAge = parseDurationToMs(
    rememberMe ? REMEMBER_ME_EXPIRATION : ACCESS_TOKEN_EXPIRATION,
  );

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: isProduction,
    ...(accessMaxAge ? { maxAge: accessMaxAge } : {}),
  });
};

const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie(ACCESS_TOKEN_COOKIE, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: isProduction,
  });
};

const createAccessToken = (adminId, expiresIn = ACCESS_TOKEN_EXPIRATION) =>
  jwt.sign({ adminId, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn,
  });

const createAuthTokens = (adminId, { rememberMe = false } = {}) => ({
  accessToken: createAccessToken(
    adminId,
    rememberMe ? REMEMBER_ME_EXPIRATION : ACCESS_TOKEN_EXPIRATION,
  ),
});

// POST /api/admin/login
export const login = async (req, res) => {
  try {
    let { username, password, rememberMe } = req.body;
    if (!(username && password)) {
      return res.status(400).json({ code: "ADMIN_CREDENTIALS_REQUIRED" });
    }
    username = username.trim();
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(404).json({ code: "ADMIN_NOT_FOUND" });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ code: "ADMIN_INCORRECT_PASSWORD" });
    }
    const { accessToken } = createAuthTokens(admin.id, {
      rememberMe: Boolean(rememberMe),
    });
    setAuthCookies(res, {
      accessToken,
      rememberMe: Boolean(rememberMe),
    });
    return res.status(200).json({
      admin: { id: admin.id, username: admin.username },
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const logout = async (req, res) => {
  try {
    clearAuthCookies(res);
    return res.status(200).json({ code: "ADMIN_LOGOUT_SUCCESS" });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.query;

    const profile = await User.findById(id).select(
      "name phone balance isActive canBuy canSendCode verificationStatus createdAt updatedAt",
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

export const updateUser = async (req, res) => {
  try {
    const { id } = req.query;
    let {
      phone,
      password,
      name,
      username,
      balance,
      verificationStatus,
      isActive,
      canBuy,
      canSendCode,
    } = req.body;

    if (!id) {
      return res.status(400).json({ code: "USER_ID_REQUIRED" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }

    if (phone !== undefined) {
      phone = phone?.trim().toLowerCase();
      if (!phone) {
        return res.status(400).json({ code: "USER_PHONE_REQUIRED" });
      }
      if (await User.findOne({ phone, _id: { $ne: id } })) {
        return res.status(409).json({ code: "USER_PHONE_TAKEN" });
      }
      user.phone = phone;
    }

    if (username !== undefined) {
      username = username?.trim();
      if (!username) {
        return res.status(400).json({ code: "USER_USERNAME_REQUIRED" });
      }
      if (await User.findOne({ username, _id: { $ne: id } })) {
        return res.status(409).json({ code: "USER_USERNAME_TAKEN" });
      }
      user.username = username;
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

    if (balance !== undefined) {
      const parsedBalance = Number(balance);
      if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
        return res.status(400).json({ code: "USER_BALANCE_INVALID" });
      }
      user.balance = parsedBalance;
    }

    if (verificationStatus?.isVerified !== undefined) {
      user.verificationStatus.isVerified =
        verificationStatus.isVerified === true;
    }

    if (typeof isActive === "boolean") {
      user.isActive = isActive;
    }

    if (typeof canBuy === "boolean") {
      user.canBuy = canBuy;
    }

    if (typeof canSendCode === "boolean") {
      user.canSendCode = canSendCode;
    }

    await user.save();
    return res.status(200).json(user);
  } catch (err) {
    return handleError(err, res);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ code: "USER_ID_REQUIRED" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }

    await user.deleteOne();
    return res.status(200).json({ code: "USER_DELETED" });
  } catch (err) {
    return handleError(err, res);
  }
};

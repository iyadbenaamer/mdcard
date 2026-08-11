import { Types } from "mongoose";
import axios from "axios";

import { handleError } from "../utils/errorHandler.js";
import { isSandboxMode } from "../utils/sandbox.js";

const isSandbox = isSandboxMode();

export const verifyCaptcha = async (req, res, next) => {
  if (isSandbox) {
    return next();
  }

  try {
    const { turnstileToken } = req.body;
    if (!turnstileToken) {
      return res.status(400).json({ code: "AUTH_CAPTCHA_REQUIRED" });
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      throw new Error("TURNSTILE_SECRET_KEY_MISSING");
    }

    const remoteIp = String(
      req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.ip || "",
    )
      .split(",")[0]
      .trim();

    const { data } = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        secret,
        response: turnstileToken,
        remoteip: remoteIp || undefined,
      },
    );

    if (!data?.success) {
      return res.status(400).json({ code: "AUTH_CAPTCHA_INVALID" });
    }

    next();
  } catch (err) {
    return handleError(err, res);
  }
};

export const verifyId = async (req, res, next) => {
  try {
    const id = req.params.id ?? req.query.id;
    const { userId } = req.query;
    if (id) {
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ code: "CHECK_INVALID_CARD_TYPE_ID" });
      }
    }
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ code: "CHECK_INVALID_USER_ID" });
      }
    }
    next();
  } catch (err) {
    return handleError(err, res);
  }
};

export const verifyFields = async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;
    const regex = {
      phone: /^09\d{8}$/,
      name: /^[^!|@|#|$|%|^|&|*|(|)|_|-|=|+|<|>|/|\\|'|"|:|;|\[|\]|\{|\}]{2,50}$/i,
      password: /^(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,50}$/,
    };
    if (name) {
      if (!regex.name.test(name)) {
        return res.status(400).json({ code: "CHECK_INVALID_NAME" });
      }
    }
    if (phone) {
      if (!regex.phone.test(phone)) {
        return res.status(400).json({ code: "CHECK_INVALID_PHONE" });
      }
    }
    if (password) {
      if (!regex.password.test(password)) {
        return res.status(400).json({ code: "CHECK_INVALID_PASSWORD_FORMAT" });
      }
    }
    next();
  } catch (err) {
    return handleError(err, res);
  }
};

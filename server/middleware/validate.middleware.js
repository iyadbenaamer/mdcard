import { Types } from "mongoose";

import { handleError } from "../utils/errorHandler.js";

export const verifyId = async (req, res, next) => {
  try {
    const { id, userId } = req.query;
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

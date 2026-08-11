import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";

import { generateCode } from "../utils/generateCode.js";
import { sendCode } from "../services/sendCode.js";
import { handleError } from "../utils/errorHandler.js";
import Setting from "../models/setting.model.js";
import { isSandboxMode } from "../utils/sandbox.js";
import {
  MAX_DAILY_RESENDS,
  evaluateResend,
  registerCodeSent,
  resetCodeState,
} from "../utils/otpPolicy.js";

const CODE_EXPIRATION = process.env.CODE_EXPIRATION || "1h";
const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION || "14d";
const REMEMBER_ME_ACCESS_EXPIRATION =
  process.env.REMEMBER_ME_ACCESS_EXPIRATION || "90d";
const isSandbox = isSandboxMode();

const checkCanSendCode = (user) => user?.canSendCode !== false;

// Runs the shared resend policy against a status subdocument (verificationStatus
// or resetPassword) and, if allowed, marks a code as sent on it. Returns the
// decision so callers can short-circuit with the right 429 code + resendAfter.
const trySendCode = (status) => {
  const decision = evaluateResend(status);
  if (!decision.allowed) {
    return decision;
  }
  registerCodeSent(status, decision);
  return decision;
};

const resendRejectionResponse = (decision, notAllowedCode, dailyLimitCode) => ({
  code: decision.reason === "DAILY_LIMIT" ? dailyLimitCode : notAllowedCode,
  resendAfter: decision.resendAfter,
});

const createAccessToken = (userId, expiresIn = ACCESS_TOKEN_EXPIRATION) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn,
  });

const createAuthToken = (userId, { rememberMe = false } = {}) =>
  createAccessToken(
    userId,
    rememberMe ? REMEMBER_ME_ACCESS_EXPIRATION : ACCESS_TOKEN_EXPIRATION,
  );

export const signup = async (req, res) => {
  try {
    let { name, phone, password, role } = req.body;
    name = name?.trim();
    phone = phone?.trim().toLowerCase();
    role = role?.trim().toLowerCase();
    if (isSandbox) {
      role = "business";
    }
    if (!(name && phone && password && role)) {
      return res.status(400).json({ code: "AUTH_REQUIRED_FIELDS_MISSING" });
    }
    if (!["business", "individual"].includes(role)) {
      return res.status(400).json({ code: "AUTH_INVALID_ROLE" });
    }
    const isPhoneUsed = (await User.findOne({ phone })) ? true : false;
    if (isPhoneUsed) {
      return res.status(409).json({ code: "AUTH_PHONE_ALREADY_REGISTERED" });
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      phone,
      name,
      role,
      password: hashedPassword,
      isActive: isSandbox || role === "individual",
    });

    const verificationCode = generateCode(6);
    const verificationToken = jwt.sign(
      { id: newUser._id, verificationCode },
      process.env.JWT_SECRET,
      {
        expiresIn: CODE_EXPIRATION,
      },
    );
    // sends the verification code to the user's phone number
    let sendDecision = null;
    if (!isSandbox) {
      console.log("Verification Code:", verificationCode);
      // await sendCode(phone, verificationCode);
      sendDecision = trySendCode(newUser.verificationStatus);
      newUser.verificationStatus.token = verificationToken;
    } else {
      /*
      if it's sandbox mode, the phone verification will be bypassed and
      the code will be sent in the response for testing purposes
      */
      newUser.verificationStatus.isVerified = true;
      newUser.isActive = true;
    }
    await newUser.save();

    const responsePayload = { code: "AUTH_USER_CREATED" };
    if (sendDecision?.allowed) {
      responsePayload.resendAfter = newUser.verificationStatus.resendAfter;
      responsePayload.maxDailyResends = MAX_DAILY_RESENDS;
    }
    return res.status(201).json(responsePayload);
  } catch (err) {
    return handleError(err, res);
  }
};

export const verifyAccessToken = async (req, res) => {
  return res.status(200).json({
    valid: true,
    role: req.user?.role || "business",
    id: req.user?.id,
  });
};
export const checkPhoneForRegister = async (req, res) => {
  try {
    const { phone } = req.params;
    const user = await User.exists({ phone });
    if (user) {
      res
        .status(200)
        .json({ success: false, code: "AUTH_PHONE_ALREADY_REGISTERED" });
    } else {
      res.status(200).json({ success: true, code: "AUTH_PHONE_AVAILABLE" });
    }
  } catch (err) {
    return handleError(err, res);
  }
};

export const checkPhoneForResetPassword = async (req, res) => {
  try {
    const { phone } = req.params;
    const user = await User.findOne({ phone });
    if (user) {
      res.status(200).json({
        success: true,
        code: "AUTH_PHONE_ASSOCIATED_WITH_ACCOUNT",
      });
    } else {
      res.status(200).json({
        success: false,
        code: "AUTH_PHONE_NOT_REGISTERED",
      });
    }
  } catch (err) {
    return handleError(err, res);
  }
};

/*LOGIN USER*/
export const login = async (req, res) => {
  try {
    let { phone, password, rememberMe } = req.body;
    phone = phone.trim();
    if (!password || !phone) {
      return res.status(400).json({ code: "AUTH_INVALID_LOGIN" });
    }
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ code: "AUTH_INVALID_LOGIN" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ code: "AUTH_INVALID_LOGIN" });
    }
    const isVerified = user.verificationStatus.isVerified;
    if (!isVerified) {
      if (!checkCanSendCode(user)) {
        return res.status(403).json({ code: "AUTH_CODE_SENDING_DISABLED" });
      }
      const sendDecision = trySendCode(user.verificationStatus);
      if (!sendDecision.allowed) {
        return res
          .status(429)
          .json(
            resendRejectionResponse(
              sendDecision,
              "AUTH_VERIFICATION_RESEND_NOT_ALLOWED",
              "AUTH_VERIFICATION_DAILY_LIMIT_REACHED",
            ),
          );
      }
      const verificationCode = generateCode(6);
      const verificationToken = jwt.sign(
        { id: user.id, verificationCode },
        process.env.JWT_SECRET,
        {
          expiresIn: CODE_EXPIRATION,
        },
      );
      // send phone with verification code if the phone isn't verified
      if (!isSandbox) {
        await sendCode(phone, verificationCode);
      }
      console.log(verificationCode);
      user.verificationStatus.token = verificationToken;
      await user.save();
      const responsePayload = {
        isVerified,
        code: "AUTH_VERIFICATION_REQUIRED",
        resendAfter: user.verificationStatus.resendAfter,
        maxDailyResends: MAX_DAILY_RESENDS,
      };
      if (isSandbox) {
        responsePayload.verificationCode = verificationCode;
      }
      return res.status(401).json(responsePayload);
    }
    /*
    if the phone is verified and it's correct as well as the password,
    then a token will be created and returned to the user
    */
    const accessToken = createAuthToken(user.id, {
      rememberMe: Boolean(rememberMe),
    });

    const support = await Setting.findOne({ key: "support" }).select("value");

    return res.status(200).json({
      profile: {
        id: user.id,
        phone: user.phone,
        profile: user.profile,
        name: user.name,
        role: user.role || "business",
        balance: user.balance,
        isActive: user.isActive,
        canBuy: user.canBuy,
        canSendCode: user.canSendCode,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      support: support?.value || "",
      isVerified,
      accessToken,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const verifyAccount = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!code || !phone) {
      return res.status(400).json({ code: "INVALID_REQUEST" });
    }
    const user = await User.findOne({ phone: phone.trim() });
    if (!user) {
      return res.status(404).json({ code: "AUTH_USER_NOT_FOUND" });
    }
    if (user.verificationStatus.isVerified) {
      return res.status(400).json({
        code: "AUTH_ALREADY_VERIFIED",
        alreadyVerified: true,
      });
    }
    if (user.verificationStatus.remainingAttempts <= 0) {
      return res.status(429).json({
        code: "AUTH_VERIFICATION_ATTEMPTS_EXCEEDED",
        resendAfter: user.verificationStatus.resendAfter,
      });
    }
    if (!user.verificationStatus.token) {
      return res.status(400).json({ code: "AUTH_VERIFICATION_TOKEN_MISSING" });
    }
    /*
      verify the verification code by the token that was created and associated with the code 
      and stored in the database "user.verificationStatus.token"
      when the user requested for phone verification
      */
    try {
      const userInfo = jwt.verify(
        user.verificationStatus.token,
        process.env.JWT_SECRET,
      );
      if (userInfo.verificationCode !== code) {
        user.verificationStatus.remainingAttempts -= 1;
        await user.save();
        return res.status(401).json({ code: "AUTH_INVALID_CODE" });
      }
      user.verificationStatus.isVerified = true;
      user.verificationStatus.token = null;
      resetCodeState(user.verificationStatus);
      await user.save();
      const accessToken = createAuthToken(user.id);
      return res.status(200).json({ isVerified: true, accessToken });
    } catch {
      return res.status(401).json({ code: "AUTH_VERIFICATION_TOKEN_EXPIRED" });
    }
  } catch (err) {
    return handleError(err, res);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ code: "AUTH_RESET_TOKEN_REQUIRED" });
    }
    if (!password) {
      return res.status(400).json({ code: "AUTH_PASSWORD_REQUIRED" });
    }
    try {
      const tokenInfo = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(tokenInfo.id);
      if (!user) {
        return res.status(401).json({ code: "AUTH_INVALID_RESET_TOKEN" });
      }
      if (user.resetPassword.token === null) {
        return res.status(400).json({ code: "AUTH_RESET_TOKEN_MISSING" });
      }
      if (user.resetPassword.token !== token) {
        return res.status(401).json({ code: "AUTH_INVALID_RESET_TOKEN" });
      }
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);
      user.password = hashedPassword;
      user.resetPassword.token = null;
      user.verificationStatus.isVerified = true;
      user.verificationStatus.token = null;
      resetCodeState(user.resetPassword);
      resetCodeState(user.verificationStatus);
      await user.save();
      const accessToken = createAuthToken(user.id);
      return res.status(200).json({
        isVerified: true,
        accessToken,
      });
    } catch {
      return res
        .status(401)
        .json({ code: "AUTH_RESET_LINK_EXPIRED", isExpired: true });
    }
  } catch (err) {
    return handleError(err, res);
  }
};

export const sendVerificationCode = async (req, res) => {
  try {
    let { type, phone } = req.body;
    phone = phone.trim().toLowerCase();
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ code: "AUTH_USER_NOT_FOUND" });
    }
    if (!checkCanSendCode(user)) {
      return res.status(403).json({ code: "AUTH_CODE_SENDING_DISABLED" });
    }
    if (type === "reset-password") {
      const sendDecision = trySendCode(user.resetPassword);
      if (!sendDecision.allowed) {
        return res
          .status(429)
          .json(
            resendRejectionResponse(
              sendDecision,
              "AUTH_RESET_RESEND_NOT_ALLOWED",
              "AUTH_RESET_DAILY_LIMIT_REACHED",
            ),
          );
      }

      const verificationCode = generateCode(6);
      const token = jwt.sign(
        { id: user.id, verificationCode },
        process.env.JWT_SECRET,
        {
          expiresIn: CODE_EXPIRATION,
        },
      );
      if (!isSandbox) {
        await sendCode(phone, verificationCode);
      }
      user.resetPassword.token = token;
      await user.save();
      const responsePayload = {
        code: "AUTH_RESET_CODE_SENT",
        resendAfter: user.resetPassword.resendAfter,
        maxDailyResends: MAX_DAILY_RESENDS,
      };
      if (isSandbox) {
        responsePayload.verificationCode = verificationCode;
      }
      return res.status(200).json(responsePayload);
    } else if (type === "verify-account") {
      if (user.verificationStatus.isVerified) {
        return res.status(400).json({
          code: "AUTH_ALREADY_VERIFIED",
          alreadyVerified: true,
        });
      }
      const sendDecision = trySendCode(user.verificationStatus);
      if (!sendDecision.allowed) {
        return res
          .status(429)
          .json(
            resendRejectionResponse(
              sendDecision,
              "AUTH_VERIFICATION_RESEND_NOT_ALLOWED",
              "AUTH_VERIFICATION_DAILY_LIMIT_REACHED",
            ),
          );
      }

      const verificationCode = generateCode(6);
      const token = jwt.sign(
        { id: user.id, verificationCode },
        process.env.JWT_SECRET,
        {
          expiresIn: CODE_EXPIRATION,
        },
      );
      if (!isSandbox) {
        await sendCode(phone, verificationCode);
      }
      user.verificationStatus.token = token;
      await user.save();
      const responsePayload = {
        code: "AUTH_VERIFICATION_CODE_SENT",
        resendAfter: user.verificationStatus.resendAfter,
        maxDailyResends: MAX_DAILY_RESENDS,
      };
      if (isSandbox) {
        responsePayload.verificationCode = verificationCode;
      }
      return res.status(200).json(responsePayload);
    } else {
      return res.status(400).json({ code: "AUTH_BAD_REQUEST" });
    }
  } catch (err) {
    return handleError(err, res);
  }
};

export const verifyResetPasswordCode = async (req, res) => {
  try {
    let { code, phone } = req.body;
    phone = phone.trim().toLowerCase();
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ code: "AUTH_USER_NOT_FOUND" });
    }
    if (user.resetPassword.remainingAttempts <= 0) {
      return res.status(429).json({
        code: "AUTH_RESET_ATTEMPTS_EXCEEDED",
        resendAfter: user.resetPassword.resendAfter,
      });
    }
    if (!user.resetPassword.token) {
      return res.status(400).json({ code: "AUTH_RESET_TOKEN_MISSING" });
    }
    try {
      const tokenInfo = jwt.verify(
        user.resetPassword.token,
        process.env.JWT_SECRET,
      );
      if (tokenInfo.verificationCode !== code) {
        user.resetPassword.remainingAttempts -= 1;
        await user.save();
        return res.status(401).json({ code: "AUTH_INVALID_CODE" });
      }
      return res.status(200).json({ token: user.resetPassword.token });
    } catch {
      return res.status(401).json({ code: "AUTH_RESET_CODE_EXPIRED" });
    }
  } catch (err) {
    return handleError(err, res);
  }
};

export const verifyResetPasswordToken = async (req, res) => {
  try {
    let { token: verificationToken } = req.query;
    verificationToken = verificationToken.trim();
    try {
      const tokenInfo = jwt.verify(verificationToken, process.env.JWT_SECRET);
      const user = await User.findById(tokenInfo.id);
      if (!user) {
        return res.status(400).json({ code: "AUTH_USER_NOT_FOUND" });
      }

      // Check if the user has a valid reset password token
      if (!user.resetPassword.token) {
        return res.status(401).json({
          code: "AUTH_NO_RESET_REQUEST",
        });
      }

      // Verify that the stored token matches the one from the URL
      if (user.resetPassword.token !== verificationToken) {
        return res.status(401).json({
          code: "AUTH_INVALID_RESET_TOKEN",
        });
      }

      return res.status(200).json({ token: verificationToken });
    } catch {
      return res.status(401).json({
        code: "AUTH_RESET_LINK_INVALID_OR_EXPIRED",
      });
    }
  } catch (err) {
    return handleError(err, res);
  }
};

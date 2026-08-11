import express from "express";
import rateLimit from "express-rate-limit";

import {
  checkPhoneForRegister,
  checkPhoneForResetPassword,
  login,
  resetPassword,
  sendVerificationCode,
  signup,
  verifyAccessToken,
  verifyAccount,
  verifyResetPasswordCode,
  verifyResetPasswordToken,
} from "../controllers/auth.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyCaptcha, verifyFields } from "../middleware/validate.middleware.js";

const router = express.Router();

// Brute force prevention on credential-guessing actions (signup, login).
// Stricter than the general API limit in index.js, which exists mainly for
// baseline DoS protection on read-heavy browsing endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { code: "AUTH_RATE_LIMIT_EXCEEDED" },
});

// OTP-related endpoints (sending/verifying phone codes) already enforce a
// tighter, per-account resend/attempt policy in the controller (see
// utils/otpPolicy.js). This limiter is just a coarse per-IP backstop against
// scripted abuse, so it can afford more headroom than authLimiter without
// weakening protection - a shared/NAT'd IP running several legitimate
// signup+verify flows shouldn't get lumped in with login brute-forcing.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { code: "AUTH_RATE_LIMIT_EXCEEDED" },
});

router.post("/signup", authLimiter, verifyCaptcha, verifyFields, signup);

// checks if the concerned phone is already registered for registration
router.get(
  "/check-phone-availability/register/:phone",
  authLimiter,
  checkPhoneForRegister,
);

// checks if the concerned phone is registered or not for password reset
router.get(
  "/check-phone-availability/reset-password/:phone",
  authLimiter,
  checkPhoneForResetPassword,
);

// login with phone and password
router.post("/login", authLimiter, login);

// verify access token
router.get("/verify-access", verifyToken, verifyAccessToken);

//sends the verification code whenever the user resets the password or verifies the account
router.post("/send-verification-code/", otpLimiter, sendVerificationCode);

//to verify the account by the verification code
router.post("/verify-account", otpLimiter, verifyAccount);

//this route recieves the verification code and returns a token that entities the user to reset the password
router.post("/verify-reset-password/", otpLimiter, verifyResetPasswordCode);

//this route recieves the verification token and returns a token that entities the user to reset the password
router.get("/verify-reset-password/", otpLimiter, verifyResetPasswordToken);

//this route recieves the new password to be set by token that entiltels the user to reset the password
router.post("/reset-password/:token", otpLimiter, resetPassword);

export default router;

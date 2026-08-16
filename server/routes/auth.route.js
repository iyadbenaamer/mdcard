import express from "express";
import rateLimit from "express-rate-limit";

import {
  checkPhoneForRegister,
  checkPhoneForResetPassword,
  getDeviceChallenge,
  login,
  logout,
  logoutAll,
  resetPassword,
  sendVerificationCode,
  signup,
  verifyAccessToken,
  verifyAccount,
  verifyResetPasswordCode,
  verifyResetPasswordToken,
} from "../controllers/auth.controller.js";
import { getApiKey } from "../controllers/apiKey.controller.js";

import { verifyToken, requireSession } from "../middleware/auth.middleware.js";
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

// Sandbox-only: fetches the API key `signup` auto-creates for a sandbox
// account, using phone+password instead of a device session - 404s outside
// sandbox (see apiKey.controller.js getApiKey).
router.post("/get-api-key", authLimiter, getApiKey);

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

// issues a short-lived nonce for the device attestation flow (Play
// Integrity / App Attest) that login/verify-account/reset-password require
router.post("/device-challenge", authLimiter, getDeviceChallenge);

// login with phone and password
router.post("/login", authLimiter, login);

// verify access token
router.get("/verify-access", verifyToken, verifyAccessToken);

// revoke the current device session
router.post("/logout", verifyToken, requireSession, logout);

// revoke every session on the account (any auth method)
router.post("/logout-all", verifyToken, logoutAll);

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

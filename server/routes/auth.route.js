import express from "express";

import {
  checkPhoneForRegister,
  checkPhoneForResetPassword,
  login,
  logout,
  resetPassword,
  sendVerificationCode,
  signup,
  verifyAccessToken,
  verifyAccount,
  verifyResetPasswordCode,
  verifyResetPasswordToken,
} from "../controllers/auth.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyFields } from "../middleware/validate.middleware.js";

const router = express.Router();

router.post("/signup", verifyFields, signup);

// checks if the concerned phone is already registered for registration
router.get("/check_phone_availability/register/:phone", checkPhoneForRegister);

// checks if the concerned phone is registered or not for password reset
router.get(
  "/check_phone_availability/reset_password/:phone",
  checkPhoneForResetPassword,
);

// login with phone and password
router.post("/login", login);

// logout user
router.post("/logout", verifyToken, logout);

// verify access token
router.get("/verify_access", verifyToken, verifyAccessToken);

//sends the verification code whenever the user resets the password or verifies the account
router.post("/send_verification_code/", sendVerificationCode);

//to verify the account by the verification code
router.post("/verify_account", verifyAccount);

//this route recieves the verification code and returns a token that entities the user to reset the password
router.post("/verify_reset_password/", verifyResetPasswordCode);

//this route recieves the verification token and returns a token that entities the user to reset the password
router.get("/verify_reset_password/", verifyResetPasswordToken);

//this route recieves the new password to be set by token that entiltels the user to reset the password
router.post("/reset_password/:token", resetPassword);

export default router;

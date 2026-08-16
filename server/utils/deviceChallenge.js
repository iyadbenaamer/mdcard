import crypto from "crypto";
import jwt from "jsonwebtoken";

import { DEVICE_CHALLENGE_EXPIRATION } from "../config/authLimits.js";

// A device-attestation challenge needs to be an unpredictable, short-lived
// nonce the client embeds in its Play Integrity / App Attest request, and the
// server needs to be able to verify it presented one of its own without a
// separate "pending challenges" collection. Signing the nonce (same approach
// already used for phone-verification codes in auth.controller.js) gets both
// properties statelessly.
export const createDeviceChallenge = () => {
  const nonce = crypto.randomBytes(16).toString("hex");
  return jwt.sign({ nonce }, process.env.JWT_SECRET, {
    expiresIn: DEVICE_CHALLENGE_EXPIRATION,
  });
};

// Returns the nonce on success, throws (TokenExpiredError/JsonWebTokenError)
// on an invalid or expired challenge.
export const verifyDeviceChallenge = (challenge) => {
  const { nonce } = jwt.verify(challenge, process.env.JWT_SECRET);
  return nonce;
};

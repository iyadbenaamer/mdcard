import crypto from "crypto";

const MAX_TIMESTAMP_AGE_SECONDS = 5 * 60;

// Verifies a Dpay webhook per their docs: hmac_sha256(timestamp + '.' +
// raw_body, secret), compared in constant time, with the timestamp bounded
// to reject replayed deliveries.
export const verifyDpayWebhookSignature = ({
  timestampHeader,
  signatureHeader,
  rawBody,
  secret,
}) => {
  if (!timestampHeader || !signatureHeader || !rawBody || !secret) {
    return false;
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > MAX_TIMESTAMP_AGE_SECONDS) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(String(signatureHeader), "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

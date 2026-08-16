import crypto from "crypto";

import ApiKey from "../models/apiKey.model.js";
import { API_KEY_PREFIX, API_KEY_TOUCH_INTERVAL_MS } from "../config/authLimits.js";

const shouldTouch = (lastUsedAt) =>
  !lastUsedAt || Date.now() - lastUsedAt.getTime() >= API_KEY_TOUCH_INTERVAL_MS;

export const generateApiKeySecret = () =>
  `${API_KEY_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;

export const hashApiKey = (key) =>
  crypto.createHash("sha256").update(key).digest("hex");

export const isApiKeyToken = (token) =>
  typeof token === "string" && token.startsWith(API_KEY_PREFIX);

// Shown in the UI so a key can be identified without ever re-displaying the
// full secret after creation.
export const getKeyPrefix = (key) => key.slice(0, API_KEY_PREFIX.length + 10);

// Looks up a key by its hash and (best-effort) records usage. There's no
// revoked state - a key either exists (works) or has been deleted (doesn't).
// Callers still need to confirm the owning user is role "business" - a user
// can be demoted to individual after a key was issued, and a stale key
// shouldn't keep working just because the row exists.
export const resolveApiKey = async (token) => {
  const apiKey = await ApiKey.findOne({ keyHash: hashApiKey(token) });
  if (!apiKey) {
    return null;
  }
  if (shouldTouch(apiKey.lastUsedAt)) {
    apiKey.lastUsedAt = new Date();
    await apiKey.save();
  }
  return apiKey;
};

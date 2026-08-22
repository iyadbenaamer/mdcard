import crypto from "crypto";

import Session from "../models/session.model.js";
import {
  SESSION_LIMITS,
  SESSION_TOKEN_PREFIX,
  SESSION_EXPIRATION,
  SESSION_REMEMBER_ME_EXPIRATION,
  SESSION_TOUCH_INTERVAL_MS,
} from "../config/authLimits.js";

const parseDurationToMs = (duration) => {
  const match = String(duration)
    .trim()
    .match(/^(\d+)([smhd])$/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[unit];
};

export const generateSessionToken = () =>
  `${SESSION_TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const shouldTouch = (lastUsedAt) =>
  Date.now() - lastUsedAt.getTime() >= SESSION_TOUCH_INTERVAL_MS;

// Revokes the least-recently-used active session(s) once a new login would
// push this user over their role's concurrent-session cap.
export const enforceSessionCap = async (userId, role) => {
  const limit = SESSION_LIMITS[role] ?? SESSION_LIMITS.individual;
  const activeSessions = await Session.find({
    user: userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastUsedAt: 1 })
    .select("_id");

  if (activeSessions.length < limit) {
    return;
  }

  const overflowCount = activeSessions.length - limit + 1;
  const toRevoke = activeSessions.slice(0, overflowCount).map((s) => s._id);
  await Session.updateMany(
    { _id: { $in: toRevoke } },
    { $set: { revokedAt: new Date(), revokedReason: "evicted" } },
  );
};

// Revokes any active session this user already has for this exact deviceId
// before a new one is created. Without this, re-logging in on the same
// device (e.g. after a reinstall wiped the client's stored token, or just
// logging in twice) always inserted another Session row for that device and
// left dedup entirely to enforceSessionCap's LRU eviction - which could even
// evict a *different*, genuinely-still-in-use device to make room. Tagged
// "reauthenticated" rather than "evicted" since this is the same device
// superseding itself, not a different one bumping it.
const revokeExistingDeviceSession = async (userId, deviceId) => {
  await Session.updateMany(
    { user: userId, deviceId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: "reauthenticated" } },
  );
};

export const createSession = async (
  user,
  {
    platform,
    deviceId,
    deviceName,
    appVersion,
    attestationProvider,
    ip,
    rememberMe = false,
  },
) => {
  await revokeExistingDeviceSession(user._id, deviceId);
  await enforceSessionCap(user._id, user.role);

  const token = generateSessionToken();
  const now = new Date();
  const expiresInMs = parseDurationToMs(
    rememberMe ? SESSION_REMEMBER_ME_EXPIRATION : SESSION_EXPIRATION,
  );

  await Session.create({
    user: user._id,
    tokenHash: hashToken(token),
    platform,
    deviceId,
    deviceName,
    appVersion,
    attestation: { provider: attestationProvider, verifiedAt: now },
    ip,
    lastUsedAt: now,
    expiresAt: new Date(now.getTime() + expiresInMs),
  });

  return token;
};

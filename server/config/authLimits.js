// Concurrent-session caps per user role, enforced by enforceSessionCap in
// utils/session.js (oldest session is evicted once a new login exceeds it).
export const SESSION_LIMITS = { business: 2, individual: 5 };

// Soft cap on how many named API keys a single business account may hold.
// Not enforced automatically anywhere yet - the admin panel issuance flow
// (Phase 4) should check against this before creating another key.
export const API_KEY_SOFT_CAP = 5;

// Token shape: API keys are recognizable by prefix so the auth middleware can
// route a bearer token to the right resolver without a DB lookup first.
export const API_KEY_PREFIX = "mdc_live_";
export const SESSION_TOKEN_PREFIX = "sess_";

export const SESSION_EXPIRATION = process.env.SESSION_EXPIRATION || "14d";
export const SESSION_REMEMBER_ME_EXPIRATION =
  process.env.SESSION_REMEMBER_ME_EXPIRATION || "90d";

// How stale lastUsedAt must be before an authenticated request bothers
// persisting a refresh - avoids a write on every single API call.
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

// Same idea as SESSION_TOUCH_INTERVAL_MS but for API keys - a single business
// integration can burst up to apiKeyRateLimit's 1000 req/min on one key, so
// writing lastUsedAt on every request would mean up to 1000 unnecessary
// ApiKey saves/min just to track "recently used".
export const API_KEY_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

// TTL for the device-attestation challenge/nonce handed out by
// POST /api/device-challenge.
export const DEVICE_CHALLENGE_EXPIRATION = "2m";

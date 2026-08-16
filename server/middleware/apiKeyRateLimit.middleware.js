import rateLimit from "express-rate-limit";

// A single business integration can legitimately burst well beyond what one
// phone should (see AUTH_SESSIONS_PLAN.md §9's "rate-limit API-key traffic
// per key, not just per-IP"). Keyed by the key's own id rather than IP so
// this never shares a budget with index.js's general per-IP limiter, and
// one business's traffic never eats into another's - including two
// businesses that happen to share an egress IP.
export const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { code: "RATE_LIMIT_EXCEEDED" },
  keyGenerator: (req) => String(req.apiKey._id),
  skip: (req) => req.authMethod !== "api_key",
});

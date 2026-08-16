import User from "../models/user.model.js";
import Session from "../models/session.model.js";

import { hashToken, shouldTouch } from "../utils/session.js";
import { isApiKeyToken, resolveApiKey } from "../utils/apiKey.js";
import { handleError } from "../utils/errorHandler.js";
import { apiKeyRateLimit } from "./apiKeyRateLimit.middleware.js";

const getTokenFromRequest = (req, cookieNames = []) => {
  const headerValue = req.header("Authorization");
  if (headerValue) {
    return headerValue.startsWith("Bearer ")
      ? headerValue.trimStart().slice(7)
      : headerValue;
  }

  for (const name of cookieNames) {
    const signedToken = req.signedCookies?.[name];
    if (signedToken) return signedToken;
    const plainToken = req.cookies?.[name];
    if (plainToken) return plainToken;
  }

  return null;
};

const resolveSession = async (token) => {
  const session = await Session.findOne({ tokenHash: hashToken(token) });
  if (!session) {
    return { code: "AUTH_SESSION_INVALID" };
  }
  if (session.revokedAt) {
    // Distinguishes an LRU-evicted device (bumped by a new login elsewhere)
    // from a plain revoke, so the client can show "you were signed out
    // because you logged in on another device" instead of a generic
    // session-expired message - see AUTH_SESSIONS_PLAN.md §9.
    return {
      code:
        session.revokedReason === "evicted"
          ? "AUTH_SESSION_EVICTED"
          : "AUTH_SESSION_REVOKED",
    };
  }
  if (session.expiresAt <= new Date()) {
    return { code: "AUTH_SESSION_EXPIRED" };
  }

  if (shouldTouch(session.lastUsedAt)) {
    session.lastUsedAt = new Date();
    await session.save();
  }

  return { session };
};

// Resolves whichever of the two credential types (opaque session token or
// API key) the bearer token looks like. Returns { code: null } for "no
// token at all", { code: <error> } for "token present but invalid", or
// { user, session, authMethod } on success.
const resolveAuth = async (req) => {
  const token = getTokenFromRequest(req, ["access_token"]);
  if (!token) {
    return { code: null };
  }

  if (isApiKeyToken(token)) {
    const apiKey = await resolveApiKey(token);
    if (!apiKey) {
      return { code: "AUTH_API_KEY_INVALID" };
    }
    const user = await User.findById(apiKey.user);
    // Business-only by construction (apiKey.model.js), but a user can be
    // switched to "individual" after a key was issued - re-check here so a
    // role change immediately revokes API access without deleting the key.
    if (!user || user.role !== "business") {
      return { code: "AUTH_API_KEY_INVALID" };
    }
    return { user, session: null, authMethod: "api_key", apiKey };
  }

  const { session, code } = await resolveSession(token);
  if (code) {
    return { code };
  }
  const user = await User.findById(session.user);
  if (!user) {
    return { code: "AUTH_SESSION_INVALID" };
  }
  return { user, session, authMethod: "session" };
};

/*
  This middleware is used to get user info to use it in other middlewares
  or controllers for routes requiring authorization. Accepts either a device
  session (mobile app) or an API key (business server-to-server) - see
  AUTH_SESSIONS_PLAN.md.
*/
export const verifyToken = async (req, res, next) => {
  try {
    const result = await resolveAuth(req);
    if (result.code === null) {
      return res.status(403).json({ code: "AUTH_LOGIN_REQUIRED" });
    }
    if (result.code) {
      return res.status(403).json({ code: result.code });
    }
    if (result.user.isActive === false) {
      return res.status(403).json({ code: "AUTH_USER_INACTIVE" });
    }
    req.user = result.user;
    req.session = result.session;
    req.authMethod = result.authMethod;
    req.apiKey = result.apiKey || null;
    return apiKeyRateLimit(req, res, next);
  } catch (err) {
    return handleError(err, res);
  }
};

/*
  This middleware is used to get user info to use it in other middlewares
  or controllers for non-authorized routes(public data).
*/
export const getUserInfo = async (req, res, next) => {
  try {
    const result = await resolveAuth(req);
    if (!result.user) {
      // No token, or a token that's merely invalid/expired/revoked - treat
      // the same as a logged-out caller rather than hard-failing a route
      // that's meant to also serve anonymous requests.
      return next();
    }
    req.user = result.user;
    req.session = result.session;
    req.authMethod = result.authMethod;
    req.apiKey = result.apiKey || null;
    return apiKeyRateLimit(req, res, next);
  } catch (err) {
    return handleError(err, res);
  }
};

// Gate for endpoints that only make sense against a real device session
// (managing/listing sessions, registering a push token) - an API key has no
// underlying device, so it's rejected here even though verifyToken accepts it.
export const requireSession = (req, res, next) => {
  if (req.authMethod !== "session") {
    return res.status(403).json({ code: "AUTH_SESSION_ONLY_ENDPOINT" });
  }
  return next();
};

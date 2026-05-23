import jwt from "jsonwebtoken";

import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";

import { handleError } from "../utils/errorHandler.js";

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

/*
  This middleware is used to get user info to use it in other middlewares
  or controllers for routes requiring authorization.
*/
export const verifyToken = async (req, res, next) => {
  const token = getTokenFromRequest(req, ["access_token", "admin_token"]);
  if (!token) {
    return res.status(403).json({ code: "AUTH_LOGIN_REQUIRED" });
  }
  try {
    const tokenInfo = jwt.verify(token, process.env.JWT_SECRET);
    // check if the token is an admin token
    if (tokenInfo.role === "admin") {
      const admin = await Admin.findById(tokenInfo.adminId);
      if (!admin) {
        return res.status(403).json({ code: "AUTH_ADMIN_TOKEN_INVALID" });
      }
      req.admin = admin;
      return next();
    }
    const user = await User.findById(tokenInfo.id);
    if (user) {
      if (user.isActive === false) {
        return res.status(403).json({ code: "AUTH_USER_INACTIVE" });
      }
      req.user = user;
      return next();
    } else {
      return res.status(403).json({ code: "AUTH_USER_TOKEN_INVALID" });
    }
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ code: "AUTH_TOKEN_EXPIRED" });
    }
    if (err?.name === "JsonWebTokenError") {
      return res.status(403).json({ code: "AUTH_TOKEN_INVALID" });
    }
    return handleError(err, res);
  }
};
/*
  This middleware is used to get user info to use it in other middlewares
  or controllers for non-authorized routes(public data).
*/
export const getUserInfo = async (req, res, next) => {
  const token = getTokenFromRequest(req, ["access_token", "admin_token"]);
  if (!token) {
    return next();
  }
  try {
    const tokenInfo = jwt.verify(token, process.env.JWT_SECRET);
    // check if the token is an admin token
    if (tokenInfo.role === "admin") {
      const admin = await Admin.findById(tokenInfo.adminId);
      if (!admin) {
        return res.status(403).json({ code: "AUTH_ADMIN_TOKEN_INVALID" });
      }
      req.admin = admin;
      return next();
    }
    const user = await User.findById(tokenInfo.id);
    if (user) {
      req.user = user;
      next();
    } else {
      return res.status(403).json({ code: "AUTH_USER_TOKEN_INVALID" });
    }
  } catch (err) {
    if (
      err?.name === "TokenExpiredError" ||
      err?.name === "JsonWebTokenError"
    ) {
      return next();
    }
    return handleError(err, res);
  }
};

// This middleware is used to verify if the user is an admin
export const verifyAdmin = async (req, res, next) => {
  const token = getTokenFromRequest(req, ["admin_token"]);
  if (!token) {
    return res.status(403).json({ code: "AUTH_LOGIN_REQUIRED" });
  }
  try {
    const tokenInfo = jwt.verify(token, process.env.JWT_SECRET);
    if (tokenInfo.role !== "admin") {
      return res.status(403).json({ code: "AUTH_ADMIN_ACCESS_REQUIRED" });
    }
    const admin = await Admin.findById(tokenInfo.adminId);
    if (!admin) {
      return res.status(403).json({ code: "AUTH_ADMIN_TOKEN_INVALID" });
    }
    req.admin = admin;
    return next();
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ code: "AUTH_TOKEN_EXPIRED" });
    }
    if (err?.name === "JsonWebTokenError") {
      return res.status(403).json({ code: "AUTH_TOKEN_INVALID" });
    }
    return handleError(err, res);
  }
};

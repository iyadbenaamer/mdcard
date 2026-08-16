import mongoose from "mongoose";
import bcrypt from "bcrypt";

import ApiKey from "../models/apiKey.model.js";
import User from "../models/user.model.js";

import { generateApiKeySecret, hashApiKey, getKeyPrefix } from "../utils/apiKey.js";
import { API_KEY_SOFT_CAP } from "../config/authLimits.js";
import { handleError } from "../utils/errorHandler.js";
import { isSandboxMode } from "../utils/sandbox.js";

// Self-service API key management for business users. Viewing only requires
// the business role - any business user can see their own keys. Mutating
// them (create/delete) additionally requires the per-account
// canManageApiKeys permission (granted by an admin in mdcard-panel). Admins
// can still issue/delete keys for any user directly via mdcard-panel
// regardless of this flag. There's no revoke/cancel action - deleting a key
// is the only way to disable it.
const ensureBusinessRole = (user, res) => {
  if (user.role !== "business") {
    res.status(403).json({ code: "API_KEY_NOT_ELIGIBLE_FOR_ROLE" });
    return false;
  }
  return true;
};

const ensureApiKeyPermission = (user, res) => {
  if (!ensureBusinessRole(user, res)) return false;
  if (!user.canManageApiKeys) {
    res.status(403).json({ code: "API_KEY_PERMISSION_DENIED" });
    return false;
  }
  return true;
};

// Lists the caller's own keys without ever exposing the secret again after
// creation - only the prefix, name, creator, and usage state. Available to
// any business user, even without canManageApiKeys, so they can at least see
// what an admin has issued for them.
export const getMyApiKeys = async (req, res) => {
  try {
    if (!ensureBusinessRole(req.user, res)) return;

    const apiKeys = await ApiKey.find({ user: req.user._id })
      .select("name keyPrefix lastUsedAt createdByType createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json(apiKeys);
  } catch (err) {
    return handleError(err, res);
  }
};

// Issues a new key for the caller. The raw secret is returned exactly once
// here - only its hash is ever stored, so if it's lost the only recovery is
// deleting it and issuing a new one.
export const createMyApiKey = async (req, res) => {
  try {
    if (!ensureApiKeyPermission(req.user, res)) return;

    let { name } = req.body;
    name = name?.trim();
    if (!name) {
      return res.status(400).json({ code: "API_KEY_NAME_REQUIRED" });
    }

    const keyCount = await ApiKey.countDocuments({ user: req.user._id });
    if (keyCount >= API_KEY_SOFT_CAP) {
      return res.status(409).json({ code: "API_KEY_LIMIT_REACHED" });
    }

    const secret = generateApiKeySecret();
    const apiKey = await ApiKey.create({
      user: req.user._id,
      name,
      keyHash: hashApiKey(secret),
      keyPrefix: getKeyPrefix(secret),
      createdByType: "user",
    });

    return res.status(201).json({
      id: apiKey._id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      createdByType: apiKey.createdByType,
      createdAt: apiKey.createdAt,
      // Only ever sent in this one response - store it now, it can't be
      // retrieved again.
      secret,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

// Permanently removes one of the caller's own keys. Scoped to req.user so a
// business account can never delete another account's key by guessing an id.
export const deleteMyApiKey = async (req, res) => {
  try {
    if (!ensureApiKeyPermission(req.user, res)) return;

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: "CHECK_INVALID_API_KEY_ID" });
    }

    const apiKey = await ApiKey.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });
    if (!apiKey) {
      return res.status(404).json({ code: "API_KEY_NOT_FOUND" });
    }
    return res.status(200).json({ code: "API_KEY_DELETED" });
  } catch (err) {
    return handleError(err, res);
  }
};

// Sandbox-only self-service key retrieval, identified by phone+password
// alone rather than a device session - the point of sandbox mode is
// exercising the business-partner API surface with zero setup, and routing
// a tester through the mobile app's device-attestation login flow just to
// fetch a test key would defeat that. Hands back the single key `signup`
// auto-creates for a sandbox account (see auth.controller.js); real
// (non-sandbox) keys never populate sandboxSecret, so there is nothing for
// this to return outside sandbox even before the mode check below.
export const getApiKey = async (req, res) => {
  try {
    if (!isSandboxMode()) {
      return res.status(404).json({ code: "SANDBOX_ONLY_ENDPOINT" });
    }

    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ code: "AUTH_INVALID_LOGIN" });
    }

    const user = await User.findOne({ phone: phone.trim() });
    if (!user) {
      return res.status(404).json({ code: "AUTH_INVALID_LOGIN" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ code: "AUTH_INVALID_LOGIN" });
    }

    const apiKey = await ApiKey.findOne({
      user: user._id,
      sandboxSecret: { $ne: null },
    }).sort({ createdAt: -1 });
    if (!apiKey) {
      return res.status(404).json({ code: "API_KEY_NOT_FOUND" });
    }

    return res.status(200).json({
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      secret: apiKey.sandboxSecret,
      createdAt: apiKey.createdAt,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

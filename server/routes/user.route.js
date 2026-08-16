import { Router } from "express";

import {
  get,
  registerPushToken,
  unregisterPushToken,
  update,
} from "../controllers/user.controller.js";
import {
  getMyApiKeys,
  createMyApiKey,
  deleteMyApiKey,
} from "../controllers/apiKey.controller.js";

import { verifyToken, requireSession } from "../middleware/auth.middleware.js";
import { verifyFields, verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyId, verifyToken, get);
router.patch("/", verifyToken, verifyFields, update);
router.post("/push-token", verifyToken, requireSession, registerPushToken);
router.delete("/push-token", verifyToken, requireSession, unregisterPushToken);

// Self-service business API keys - session-only (not usable via an API key
// itself), further gated by role + canManageApiKeys inside the controller.
// No revoke/cancel action - deleting a key is the only way to disable it.
router.get("/api-keys", verifyToken, requireSession, getMyApiKeys);
router.post("/api-keys", verifyToken, requireSession, createMyApiKey);
router.delete("/api-keys/:id", verifyToken, requireSession, deleteMyApiKey);

export default router;

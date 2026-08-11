import { Router } from "express";

import {
  get,
  registerPushToken,
  unregisterPushToken,
  update,
} from "../controllers/user.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyFields, verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyId, verifyToken, get);
router.patch("/", verifyToken, verifyFields, update);
router.post("/push-token", verifyToken, registerPushToken);
router.delete("/push-token", verifyToken, unregisterPushToken);

export default router;

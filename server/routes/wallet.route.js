import { Router } from "express";

import {
  getPaymentMethods,
  getTopupSession,
  openTopupSession,
  verifyTopupSession,
} from "../controllers/wallet.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/payment-methods", verifyToken, getPaymentMethods);
router.post("/topup/sessions", verifyToken, openTopupSession);
router.post("/topup/sessions/verify", verifyToken, verifyTopupSession);
router.get("/topup/sessions/:sessionId", verifyToken, getTopupSession);

export default router;

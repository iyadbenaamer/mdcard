import { Router } from "express";

import { handleDpayWebhook } from "../controllers/wallet.controller.js";

const router = Router();

// No verifyToken - Dpay authenticates this call via HMAC signature
// (see handleDpayWebhook / utils/dpaySignature.js), not a bearer token.
router.post("/", handleDpayWebhook);

export default router;

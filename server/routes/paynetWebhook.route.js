import { Router } from "express";

import { handlePaynetWebhook } from "../controllers/wallet.controller.js";

const router = Router();

// No verifyToken - pay.net.ly's backend_url callback carries no bearer token
// and no signature. handlePaynetWebhook treats it only as a nudge and
// re-confirms every payment through the authenticated receipt endpoint.
router.post("/", handlePaynetWebhook);

export default router;

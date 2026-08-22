import { Router } from "express";

import { previewExchange, sendExchange } from "../controllers/exchange.controller.js";

import { requireSession, verifyToken } from "../middleware/auth.middleware.js";
import { verifyFields } from "../middleware/validate.middleware.js";

const router = Router();

router.post("/preview", verifyToken, requireSession, verifyFields, previewExchange);
router.post("/send", verifyToken, requireSession, verifyFields, sendExchange);

export default router;

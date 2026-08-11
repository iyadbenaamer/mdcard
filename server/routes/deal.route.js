import { Router } from "express";

import { getActiveDeals } from "../controllers/deal.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, getActiveDeals);

export default router;

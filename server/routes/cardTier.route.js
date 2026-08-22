import { Router } from "express";

import {
  getPaginated,
  checkAvailability,
  getTopDiscounted,
} from "../controllers/cardTier.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyToken, getPaginated);
router.get("/top-discounted", verifyToken, getTopDiscounted);
router.post("/availability", verifyToken, checkAvailability);

export default router;

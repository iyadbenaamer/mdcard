import { Router } from "express";

import {
  getPaginated,
  createOne,
  updateOne,
  updateOrderList,
  deleteOne,
  checkAvailability,
} from "../controllers/cardTier.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyToken, getPaginated);
router.post("/availability", verifyToken, checkAvailability);

export default router;

import { Router } from "express";

import {
  getPaginated,
  createOne,
  updateOne,
  updateOrderList,
  deleteOne,
  checkAvailability,
} from "../controllers/cardTier.controller.js";

import { verifyAdmin, verifyToken } from "../middleware/auth.middleware.js";
import { verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", getPaginated);
router.post("/availability", verifyToken, checkAvailability);
router.post("/", verifyAdmin, createOne);
router.patch("/", verifyAdmin, verifyId, updateOne);
router.patch("/order", verifyAdmin, updateOrderList);
router.delete("/", verifyAdmin, verifyId, deleteOne);

export default router;

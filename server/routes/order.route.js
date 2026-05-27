import { Router } from "express";

import {
  getOrders,
  getOrderById,
  checkoutCart,
} from "../controllers/order.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyToken, getOrders);
router.get("/:id", verifyToken, verifyId, getOrderById);
router.post("/checkout", verifyToken, checkoutCart);

export default router;

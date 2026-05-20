import { Router } from "express";
import {
  login,
  logout,
  updateUser,
  deleteUser,
  getUser,
} from "../controllers/admin.controller.js";
import {
  getUserCustomPricing,
  createUserCustomPricing,
  deleteUserCustomPricing,
} from "../controllers/customePricing.controller.js";
import { getStats } from "../controllers/stats.controller.js";
import {
  createDeposit,
  createRefund,
  getAdminTransactions,
  getAdminTransactionsList,
  deleteAdminTransactions,
} from "../controllers/transaction.controller.js";
import {
  deleteAdminOrders,
  getAdminOrders,
} from "../controllers/order.controller.js";

import { verifyAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Admin login
router.post("/login", login);

// Admin logout
router.post("/logout", verifyAdmin, logout);

// Admin stats
router.get("/stats", verifyAdmin, getStats);

// Admin balance deposit
router.post("/deposit", verifyAdmin, createDeposit);

// Admin refund
router.post("/refund", verifyAdmin, createRefund);

// Admin transactions list
router.get("/transactions", verifyAdmin, getAdminTransactions);

// Admin transactions list with filters
router.get("/transactions/list", verifyAdmin, getAdminTransactionsList);

// Admin transactions bulk delete
router.delete("/transactions", verifyAdmin, deleteAdminTransactions);

// Admin orders list
router.get("/orders", verifyAdmin, getAdminOrders);

// Admin orders bulk delete
router.delete("/orders", verifyAdmin, deleteAdminOrders);

// Admin get user
router.get("/user", verifyAdmin, getUser);

// Admin user update
router.patch("/user", verifyAdmin, updateUser);

// Admin user delete
router.delete("/user", verifyAdmin, deleteUser);

// Admin custom pricing
router.get("/custom-pricing", verifyAdmin, getUserCustomPricing);
router.post("/custom-pricing", verifyAdmin, createUserCustomPricing);
router.delete("/custom-pricing", verifyAdmin, deleteUserCustomPricing);

export default router;

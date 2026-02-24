import { Router } from "express";

import { getUserTransactions } from "../controllers/transaction.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, getUserTransactions);

export default router;

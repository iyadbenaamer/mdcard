import { Router } from "express";

import { get } from "../controllers/transaction.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, get);

export default router;

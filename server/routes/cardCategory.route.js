import { Router } from "express";

import { getAll } from "../controllers/cardCategory.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, getAll);

export default router;

import { Router } from "express";

import { get, update } from "../controllers/user.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyFields, verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyId, verifyToken, get);
router.patch("/", verifyToken, verifyFields, update);

export default router;

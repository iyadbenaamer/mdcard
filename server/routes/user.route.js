import { Router } from "express";

import { getOne, getAll, updateOne } from "../controllers/user.controller.js";

import { verifyAdmin, verifyToken } from "../middleware/auth.middleware.js";
import { verifyFields, verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyId, verifyToken, getOne);
router.get("/all", verifyAdmin, getAll);
router.patch("/", verifyToken, verifyFields, updateOne);

export default router;

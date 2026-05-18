import { Router } from "express";

import {
  getAll,
  createOne,
  updateAll,
  deleteOne,
} from "../controllers/cardCategory.controller.js";

import { verifyAdmin, verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, getAll);
router.post("/", verifyAdmin, createOne);
router.patch("/", verifyAdmin, updateAll);
router.delete("/", verifyAdmin, deleteOne);

export default router;

import { Router } from "express";

import {
  getAll,
  createOne,
  updateAll,
  deleteOne,
} from "../controllers/cardCategory.controller.js";

import { verifyAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", getAll);
router.post("/", createOne);
router.patch("/", verifyAdmin, updateAll);
router.delete("/", verifyAdmin, deleteOne);

export default router;

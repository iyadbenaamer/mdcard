import { Router } from "express";

import {
  createOne,
  deleteOne,
  importFromExcel,
  getOne,
  getPaginated,
  getByCategory,
  updateOne,
} from "../controllers/card.controller.js";

import { verifyAdmin, verifyToken } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyAdmin, getPaginated);
router.get("/by-category", verifyAdmin, getByCategory);
router.get("/get-one", verifyId, verifyAdmin, getOne);
router.post("/", verifyAdmin, createOne);
router.post("/import", verifyAdmin, upload.single("file"), importFromExcel);
router.patch("/", verifyAdmin, verifyId, updateOne);
router.delete("/", verifyAdmin, verifyId, deleteOne);

export default router;

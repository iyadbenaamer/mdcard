import { Router } from "express";

import {
  createOne,
  getPaginated,
  getOne,
  getByCategory,
  updateOne,
  updateOrderList,
  deleteOne,
} from "../controllers/cardType.controller.js";

import {
  getUserInfo,
  verifyAdmin,
  verifyToken,
} from "../middleware/auth.middleware.js";
import { uploadSingleFile } from "../middleware/media.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyToken, getPaginated);
router.get("/by-category", verifyToken, getByCategory);
router.post(
  "/",
  verifyAdmin,
  // accept both `media` (card type image) and `printImage` (printable image)
  upload.fields([
    { name: "media", maxCount: 1 },
    { name: "printImage", maxCount: 1 },
  ]),
  uploadSingleFile,
  createOne,
);
router.get("/get_one", verifyToken, verifyId, getUserInfo, getOne);
router.patch(
  "/",
  verifyAdmin,
  verifyId,
  upload.fields([
    { name: "media", maxCount: 1 },
    { name: "printImage", maxCount: 1 },
  ]),
  uploadSingleFile,
  updateOne,
);
router.patch("/order", verifyAdmin, updateOrderList);
router.delete("/", verifyAdmin, verifyId, deleteOne);

export default router;

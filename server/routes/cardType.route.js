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

import { getUserInfo, verifyToken } from "../middleware/auth.middleware.js";
import { verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyToken, getPaginated);
router.get("/by-category", verifyToken, getByCategory);

router.get("/get-one", verifyToken, verifyId, getUserInfo, getOne);

export default router;

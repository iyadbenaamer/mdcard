import { Router } from "express";

import {
  getAll,
  getOne,
  createOne,
  updateOne,
  updateMany,
  deleteOne,
} from "../controllers/setting.controller.js";

import { verifyAdmin } from "../middleware/auth.middleware.js";
import { verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/all", verifyAdmin, getAll);
router.get("/:id", verifyId, verifyAdmin, getOne);
router.post("/", verifyAdmin, createOne);
// bulk/array update (accepts [{id?,key?,value?,description?,group?}, ...])
router.patch("/", verifyAdmin, updateMany);
router.patch("/:id", verifyId, verifyAdmin, updateOne);
router.delete("/:id", verifyId, verifyAdmin, deleteOne);

export default router;

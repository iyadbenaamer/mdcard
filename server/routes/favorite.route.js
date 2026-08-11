import { Router } from "express";

import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favorite.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, getFavorites);
router.post("/", verifyToken, addFavorite);
router.delete("/", verifyToken, removeFavorite);

export default router;

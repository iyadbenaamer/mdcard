import { Router } from "express";

import {
  search,
  searchCardTypes,
  searchCards,
} from "../controllers/search.controller.js";

import { verifyAdmin, verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyAdmin, search);
router.get("/cards", verifyAdmin, searchCards);
router.get("/card-types", verifyToken, searchCardTypes);

export default router;

import { Router } from "express";

import {
  search,
  searchCardTypes,
  searchCards,
} from "../controllers/search.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/card-types", verifyToken, searchCardTypes);

export default router;

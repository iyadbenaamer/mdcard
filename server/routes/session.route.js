import { Router } from "express";

import { listSessions, revokeSession } from "../controllers/session.controller.js";
import { verifyToken, requireSession } from "../middleware/auth.middleware.js";
import { verifyId } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", verifyToken, requireSession, listSessions);
router.delete("/:id", verifyId, verifyToken, requireSession, revokeSession);

export default router;

import { Router } from "express";

import {
  registerAnonymousToken,
  removeAnonymousToken,
} from "../controllers/deviceToken.controller.js";

const router = Router();

router.post("/", registerAnonymousToken);
router.delete("/", removeAnonymousToken);

export default router;

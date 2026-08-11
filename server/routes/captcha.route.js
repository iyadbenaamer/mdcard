import { Router } from "express";

import { renderTurnstileWidget } from "../controllers/captcha.controller.js";

const router = Router();

router.get("/", renderTurnstileWidget);

export default router;

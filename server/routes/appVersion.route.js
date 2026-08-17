import { Router } from "express";

import { getAppVersion } from "../controllers/appVersion.controller.js";

const router = Router();

router.get("/", getAppVersion);

export default router;

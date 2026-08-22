import express from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import authRoute from "./routes/auth.route.js";
import captchaRoute from "./routes/captcha.route.js";
import userRoute from "./routes/user.route.js";
import searchRoute from "./routes/search.route.js";
import cardCategoryRoute from "./routes/cardCategory.route.js";
import cardTypeRoute from "./routes/cardType.route.js";
import cardTierRoute from "./routes/cardTier.route.js";
import orderRoute from "./routes/order.route.js";
import transactionRoute from "./routes/transaction.route.js";
import dealRoute from "./routes/deal.route.js";
import favoriteRoute from "./routes/favorite.route.js";
import sessionRoute from "./routes/session.route.js";
import appVersionRoute from "./routes/appVersion.route.js";
import connectDB from "./config/db.js";
import openApiSpec from "./docs/openapi.js";
import { attachRequestLogger } from "./middleware/requestLog.middleware.js";

dotenv.config();

/*CONFIGURATIONS*/
const UPLOAD_DIR = process.env.UPLOAD_DIR || "C:\\Users\\Iyad\\mdcard\\";
const storagePath = path.join(UPLOAD_DIR, "storage");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// The app sits behind a reverse proxy/CDN (see the cf-connecting-ip handling
// in validate.middleware.js) — without this, Express's req.ip resolves to
// the proxy's address for every request, which collapses IP-based rate
// limiting onto a single shared bucket for all users instead of limiting
// each client individually.
app.set("trust proxy", 1);
const cookieSecret = process.env.COOKIE_SECRET || process.env.JWT_SECRET;
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;
const corsOptions = {
  origin: corsOrigins,
  // Only send Access-Control-Allow-Credentials for an explicit, trusted
  // origin allowlist. Combining a reflect-any-origin policy (the fallback
  // above when CORS_ORIGIN isn't set) with credentials:true would let any
  // website make cookie-authenticated requests on a logged-in user's behalf.
  credentials: Boolean(process.env.CORS_ORIGIN),
};
app.use(express.json({ limit: "200mb" }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("short"));
app.use(express.urlencoded({ limit: "200mb", extended: true }));
app.use(cors(corsOptions));
// Uploaded filenames are unique per upload (see upload.middleware.js) and
// never reused, so it's safe to tell clients/proxies these never change.
const staticOptions = { maxAge: "30d", immutable: true };
app.use("/storage", express.static(storagePath, staticOptions));
if (process.env.NODE_ENV === "development") {
  app.use("/api/storage", express.static(storagePath, staticOptions));
}
app.use(cookieParser(cookieSecret));
app.use(attachRequestLogger);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: { code: "RATE_LIMIT_EXCEEDED" },
    // Card images are requested in bulk while browsing (grids, category
    // switches); they shouldn't share a budget with real API calls. This is
    // in addition to /storage already being registered above and handling
    // matching requests before this middleware runs.
    skip: (req) =>
      req.path.startsWith("/storage") || req.path.startsWith("/api/storage"),
  }),
);

app.get("/api/docs.json", (req, res) => res.json(openApiSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

/*ROUTES*/
app.use("/api/captcha", captchaRoute);
// Public - checked on every app launch, including before login, so it
// can't sit behind verifyToken like the routes below it.
app.use("/api/app-version", appVersionRoute);
// Public - registers/unregisters a device's Expo push token before it has
// ever logged in (no User doc to attach the token to yet), so it can't sit
// behind verifyToken either.
app.use("/api/device-tokens", deviceTokenRoute);
app.use("/api/", authRoute);
app.use("/api/user", userRoute);
app.use("/api/search", searchRoute);
app.use("/api/card-categories", cardCategoryRoute);
app.use("/api/card-types", cardTypeRoute);
app.use("/api/card-tiers", cardTierRoute);
app.use("/api/orders", orderRoute);
app.use("/api/transactions", transactionRoute);
app.use("/api/deals", dealRoute);
app.use("/api/favorites", favoriteRoute);
app.use("/api/sessions", sessionRoute);

/*MONGOOSE SETUP*/
connectDB();

const PORT = process.env.PORT;
const server = createServer(app);

const startServer = async () => {
  try {
    server.listen(PORT, () => console.log(`Server Connected on Port: ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

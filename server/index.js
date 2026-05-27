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
import userRoute from "./routes/user.route.js";
import searchRoute from "./routes/search.route.js";
import cardCategoryRoute from "./routes/cardCategory.route.js";
import cardTypeRoute from "./routes/cardType.route.js";
import cardTierRoute from "./routes/cardTier.route.js";
import orderRoute from "./routes/order.route.js";
import transactionRoute from "./routes/transaction.route.js";
import connectDB from "./config/db.js";
import openApiSpec from "./docs/openapi.js";

dotenv.config();

/*CONFIGURATIONS*/
const UPLOAD_DIR = process.env.UPLOAD_DIR || "C:\\Users\\Iyad\\mdcard\\";
const storagePath = path.join(UPLOAD_DIR, "storage");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const cookieSecret = process.env.COOKIE_SECRET || process.env.JWT_SECRET;
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;
const corsOptions = {
  origin: corsOrigins,
  credentials: true,
};
app.use(express.json({ limit: "200mb" }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("short"));
app.use(express.urlencoded({ limit: "200mb", extended: true }));
app.use(cors(corsOptions));
app.use("/storage", express.static(storagePath));
app.use(cookieParser(cookieSecret));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: "Too many requests from this IP, please try again after a minute",
  }),
);

app.get("/api/docs.json", (req, res) => res.json(openApiSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

/*ROUTES*/
app.use("/api/", authRoute);
app.use("/api/user", userRoute);
app.use("/api/search", searchRoute);
app.use("/api/card-categories", cardCategoryRoute);
app.use("/api/card-types", cardTypeRoute);
app.use("/api/card-tiers", cardTierRoute);
app.use("/api/orders", orderRoute);
app.use("/api/transactions", transactionRoute);

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

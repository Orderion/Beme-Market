import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";                         // ADDED
import rateLimit from "express-rate-limit";          // ADDED
import dotenv from "dotenv";

import { errorHandler } from "./middlewares/errorMiddleware.js";

import authRoutes         from "./routes/authRoutes.js";
import productRoutes      from "./routes/productRoutes.js";
import cartRoutes         from "./routes/cartRoutes.js";
import orderRoutes        from "./routes/orderRoutes.js";
import paystackRoutes     from "./routes/paystack.js";
import adminReviewRoutes  from "./routes/adminReview.js";
import aiRoutes           from "./routes/aiRoutes.js";
import chatRoutes         from "./routes/chatRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import helpRoutes         from "./routes/helpRoutes.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://bememarket.store",
  "https://www.bememarket.store",
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

/* ===============================
   RATE LIMITERS                   // ADDED
================================ */

// General API limiter — 120 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

// Checkout limiter — 10 requests per minute per IP
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many checkout attempts. Please wait a moment." },
});

// Order creation limiter — 15 requests per minute per IP
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many order requests. Please wait a moment." },
});

// Auth limiter — 20 requests per minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many auth requests. Please try again shortly." },
});

// AI limiter — 30 requests per minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many AI requests. Please wait a moment." },
});

/* ===============================
   MIDDLEWARES
================================ */

// Webhook needs raw body — must be registered BEFORE express.json()
app.use("/api/subscriptions/webhook", express.raw({ type: "application/json" }));

// Security headers                                  // ADDED
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow Cloudinary images
  contentSecurityPolicy: false,                          // frontend handles its own CSP
}));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

app.use(express.json({ limit: "1mb" }));

// Request logging — dev: coloured, prod: combined (persistent)  // MODIFIED
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

/* ===============================
   HEALTH CHECK
================================ */

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Beme API running 🚀",
    environment: process.env.NODE_ENV,
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/* ===============================
   API ROUTES
================================ */

app.use("/api/auth",          authLimiter,    authRoutes);        // ADDED limiter
app.use("/api/ai",            aiLimiter,      aiRoutes);          // ADDED limiter
app.use("/api/chat",          generalLimiter, chatRoutes);        // ADDED limiter
app.use("/api/products",      generalLimiter, productRoutes);     // ADDED limiter
app.use("/api/cart",          generalLimiter, cartRoutes);        // ADDED limiter
app.use("/api/orders",        orderLimiter,   orderRoutes);       // ADDED limiter
app.use("/api/paystack",      checkoutLimiter, paystackRoutes);   // ADDED limiter
app.use("/api/admin",         generalLimiter, adminReviewRoutes); // ADDED limiter
app.use("/api/subscriptions", generalLimiter, subscriptionRoutes); // ADDED limiter
app.use("/api/help",          generalLimiter, helpRoutes);        // ADDED limiter

/* ===============================
   404 HANDLER
================================ */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ===============================
   ERROR HANDLER
================================ */

app.use((err, _req, res, next) => {
  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS blocked this origin",
    });
  }
  return errorHandler(err, _req, res, next);
});

export default app;
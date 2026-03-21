import express from "express";
import cors from "cors";

import ordersRouter from "./routes/orders.js";
import paystackRouter from "./routes/paystack.js";
import adminReviewRouter from "./routes/adminReview.js";

const app = express();

/* ===== MIDDLEWARE ===== */
app.use(cors());
app.use(express.json({ limit: "1mb" }));

/* ===== HEALTH CHECK ===== */
app.get("/api/health", (_req, res) => {
  return res.json({
    ok: true,
    service: "beme-backend",
    time: new Date().toISOString(),
  });
});

/* ===== ROUTES ===== */
app.use("/api/orders", ordersRouter);
app.use("/api/paystack", paystackRouter);

/* 🔥 NEW: ADMIN REVIEW (core dropshipping engine) */
app.use("/api/admin", adminReviewRouter);

/* ===== NOT FOUND ===== */
app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    error: "Route not found.",
  });
});

/* ===== ERROR HANDLER ===== */
app.use((err, _req, res, _next) => {
  console.error("Global error:", err);

  return res.status(err?.statusCode || 500).json({
    success: false,
    error: err?.message || "Internal server error.",
  });
});

export default app;
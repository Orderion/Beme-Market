// src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";

import paystackRoutes from "./routes/paystack.js";

const app = express();

// Needed behind Render/Cloudflare/NGINX proxies for correct IP/HTTPS handling
app.set("trust proxy", 1);

/**
 * ✅ CORS
 * Allow:
 * - Your production frontend (FRONTEND_URL)
 * - Local dev frontend
 */
const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g. https://beme-market.vercel.app
  "http://localhost:5173",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // allow non-browser tools (curl/postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    // return a controlled CORS error (not a thrown Error)
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

app.use(cors(corsOptions));

// ✅ Handle preflight requests for all routes
app.options("*", cors(corsOptions));

// Body parsing
app.use(express.json({ limit: "1mb" }));

// Basic endpoints
app.get("/", (_req, res) => res.send("Beme Market API Running ✅"));
app.get("/health", (_req, res) => res.json({ ok: true }));

// Routes
app.use("/api/paystack", paystackRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// Error handler (last)
app.use((err, _req, res, _next) => {
  console.error("❌ API Error:", err?.message || err);
  res.status(500).json({ error: err?.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
// src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";

import paystackRoutes from "./routes/paystack.js";

const app = express();

// Needed behind Render/Cloudflare/NGINX proxies for correct IP/HTTPS handling
app.set("trust proxy", 1);

const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (like curl/postman) where origin is undefined
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

// Basic endpoints
app.get("/", (req, res) => res.send("Beme Market API Running ✅"));
app.get("/health", (req, res) => res.json({ ok: true }));

// Routes
app.use("/api/paystack", paystackRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handler (last)
app.use((err, req, res, next) => {
  console.error("❌ API Error:", err?.message || err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
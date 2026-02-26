import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import paystackRoutes from "./routes/paystack.js"; // ✅ add this (create file)
import connectDB from "./config/db.js"; // ✅ keep if you STILL use DB in this backend

const app = express();

// ✅ Trust proxy (Render sits behind a proxy)
app.set("trust proxy", 1);

// ✅ Middleware
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL, // e.g. https://bememarket.vercel.app
      "http://localhost:5173",
    ].filter(Boolean),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// ✅ Health checks
app.get("/", (req, res) => res.send("Beme Market API Running"));
app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ Connect DB (ONLY if your API still uses it)
// If you are fully on Firebase/Firestore and no MongoDB, remove connectDB entirely.
(async () => {
  try {
    await connectDB();
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Failed to connect to database:", err?.message || err);
    // If DB is not required for Paystack/Auth endpoints, DO NOT crash:
    // process.exit(1);
  }
})();

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/paystack", paystackRoutes); // ✅ Paystack endpoints

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Error handler (prevents crashing without response)
app.use((err, req, res, next) => {
  console.error("❌ API Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
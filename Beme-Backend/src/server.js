import "dotenv/config";
import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Connect DB (don’t crash silently)
(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error("❌ Failed to connect to database:", err?.message || err);
    // Optional: exit if DB is required to run the API
    process.exit(1);
  }
})();

// ✅ Routes
app.use("/api/auth", authRoutes);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Beme Market API Running");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { errorHandler } from "./middlewares/errorMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paystackRoutes from "./routes/paystack.js";

dotenv.config();

const app = express();

/* ===============================
   MIDDLEWARES
================================ */

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* ===============================
   HEALTH CHECK ROUTE
================================ */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Beme API running 🚀",
    environment: process.env.NODE_ENV,
  });
});

/* ===============================
   API ROUTES
================================ */

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/paystack", paystackRoutes);

/* ===============================
   404 HANDLER
================================ */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ===============================
   ERROR HANDLER
================================ */

app.use(errorHandler);

export default app;
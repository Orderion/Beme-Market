import express from "express";

const router = express.Router();

/* ===============================
   HEALTH CHECK / PLACEHOLDER
================================ */

router.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Product routes working",
  });
});

export default router;
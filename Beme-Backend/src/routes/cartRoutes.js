import express from "express";

const router = express.Router();

// GET /api/cart
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Cart routes working 🛒",
  });
});

export default router;

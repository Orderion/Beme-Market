import express from "express";
import axios from "axios";
import { db } from "./firebaseAdmin.js";

const router = express.Router();

const PAYSTACK_BASE = "https://api.paystack.co";

// 1) Initialize transaction
router.post("/initialize", async (req, res) => {
  try {
    const { email, amountGHS, orderId } = req.body;

    if (!email || !amountGHS || !orderId) {
      return res.status(400).json({ error: "email, amountGHS, orderId required" });
    }

    // Paystack amount is in kobo/pesewas style smallest unit => GHS * 100
    const amount = Math.round(Number(amountGHS) * 100);

    // Create a unique reference you can trace
    const reference = `beme_${orderId}_${Date.now()}`;

    // Save order as pending (optional if you already create it on frontend)
    await db.collection("orders").doc(orderId).set(
      {
        payment: {
          method: "paystack",
          reference,
          status: "pending",
          amountGHS: Number(amountGHS),
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Initialize from backend with SECRET KEY
    const resp = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email,
        amount,
        reference,
        currency: "GHS",
        callback_url: `${process.env.FRONTEND_URL}/order-success?reference=${reference}&orderId=${orderId}`,
        metadata: { orderId },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Paystack returns authorization_url + access_code + reference
    return res.json({
      authorizationUrl: resp.data?.data?.authorization_url,
      reference: resp.data?.data?.reference || reference,
    });
  } catch (err) {
    const msg = err?.response?.data || err.message;
    return res.status(500).json({ error: "Paystack initialize failed", details: msg });
  }
});

// 2) Verify transaction (ALWAYS verify server-side)
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const resp = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = resp.data?.data;

    // statuses differ; successful payment is typically "success"
    const isSuccess = data?.status === "success";

    const orderId = data?.metadata?.orderId;

    if (orderId) {
      await db.collection("orders").doc(orderId).set(
        {
          payment: {
            method: "paystack",
            reference,
            status: isSuccess ? "paid" : "failed",
            gatewayStatus: data?.status,
            paidAt: isSuccess ? new Date() : null,
          },
          paystack: {
            id: data?.id,
            channel: data?.channel,
            currency: data?.currency,
            amount: data?.amount, // in pesewas (GHS * 100)
            customer: data?.customer,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    return res.json({ ok: true, isSuccess, paystack: data });
  } catch (err) {
    const msg = err?.response?.data || err.message;
    return res.status(500).json({ error: "Paystack verify failed", details: msg });
  }
});

export default router;
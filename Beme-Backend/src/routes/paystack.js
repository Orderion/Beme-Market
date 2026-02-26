// src/routes/paystack.js
import express from "express";
import crypto from "crypto";
import { dbAdmin } from "../firebaseAdmin.js";

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const CURRENCY = process.env.CURRENCY || "GHS";

// Helpers
const isInt = (n) => Number.isInteger(n) && n > 0;

function toMinorUnit(amountMajor) {
  // Paystack expects minor units (GHS -> pesewas)
  return Math.round(Number(amountMajor) * 100);
}

function assertEnv() {
  if (!PAYSTACK_SECRET_KEY) {
    const err = new Error("PAYSTACK_SECRET_KEY is missing in environment variables");
    err.statusCode = 500;
    throw err;
  }
}

// ---- 1) INIT CHECKOUT (authoritative pricing)
// POST /api/paystack/checkout/init
// body: { email: string, items: [{ id: string, qty: number }] }
router.post("/checkout/init", async (req, res, next) => {
  try {
    assertEnv();

    const { email, items } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "email is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items[] is required" });
    }

    // Normalize items: {id, qty}
    const normalized = items
      .map((x) => ({
        id: String(x?.id || "").trim(),
        qty: Number(x?.qty || 0),
      }))
      .filter((x) => x.id && isInt(x.qty));

    if (normalized.length === 0) {
      return res.status(400).json({ error: "items must contain valid {id, qty}" });
    }

    // De-dupe by id (sum quantities)
    const byId = new Map();
    for (const it of normalized) {
      byId.set(it.id, (byId.get(it.id) || 0) + it.qty);
    }
    const deduped = Array.from(byId.entries()).map(([id, qty]) => ({ id, qty }));

    // Fetch products from Firestore (Admin SDK)
    const productRefs = deduped.map(({ id }) => dbAdmin.collection("products").doc(id));
    const productSnaps = await dbAdmin.getAll(...productRefs);

    // Build order items from DB prices (authoritative)
    let subtotal = 0;
    const orderItems = [];

    for (let idx = 0; idx < productSnaps.length; idx++) {
      const snap = productSnaps[idx];
      const { id, qty } = deduped[idx];

      if (!snap.exists) {
        return res.status(400).json({ error: `Product not found: ${id}` });
      }

      const p = snap.data();
      const unitPrice = Number(p.price || 0);
      const inStock = Boolean(p.inStock);

      if (!inStock) {
        return res.status(400).json({ error: `Out of stock: ${p.name || id}` });
      }

      if (!(unitPrice >= 0)) {
        return res.status(400).json({ error: `Invalid price for: ${p.name || id}` });
      }

      subtotal += unitPrice * qty;

      orderItems.push({
        productId: id,
        name: p.name || "",
        image: p.image || "",
        qty,
        unitPrice,
        lineTotal: unitPrice * qty,
      });
    }

    if (!(subtotal > 0)) {
      return res.status(400).json({ error: "Subtotal must be greater than 0" });
    }

    const amountMinor = toMinorUnit(subtotal);

    // Create an order first (pending)
    const orderRef = dbAdmin.collection("orders").doc();
    const orderId = orderRef.id;

    await orderRef.set({
      status: "pending",
      currency: CURRENCY,
      subtotal,
      amountMinor,
      email,
      items: orderItems,
      createdAt: new Date(),
      paystack: {
        reference: orderId, // we use orderId as Paystack reference
        status: "init_pending",
      },
    });

    // Initialize Paystack transaction using backend-calculated amount
    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountMinor,
        currency: CURRENCY,
        reference: orderId,
        metadata: {
          orderId,
        },
      }),
    });

    const initJson = await initRes.json();

    if (!initRes.ok || !initJson?.status) {
      await orderRef.update({
        status: "init_failed",
        paystack: {
          reference: orderId,
          status: "init_failed",
          error: initJson,
        },
        updatedAt: new Date(),
      });

      return res.status(502).json({
        error: "Paystack initialize failed",
        details: initJson,
      });
    }

    const authUrl = initJson?.data?.authorization_url;
    const accessCode = initJson?.data?.access_code;

    await orderRef.update({
      paystack: {
        reference: orderId,
        status: "initialized",
        accessCode,
      },
      updatedAt: new Date(),
    });

    return res.json({
      reference: orderId,
      authorization_url: authUrl,
    });
  } catch (err) {
    next(err);
  }
});

// ---- 2) VERIFY (fallback, optional)
// GET /api/paystack/checkout/verify/:reference
router.get("/checkout/verify/:reference", async (req, res, next) => {
  try {
    assertEnv();

    const reference = String(req.params.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "reference is required" });

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    );

    const verifyJson = await verifyRes.json();

    if (!verifyRes.ok || !verifyJson?.status) {
      return res.status(502).json({ error: "Paystack verify failed", details: verifyJson });
    }

    const data = verifyJson.data;
    const paid = data?.status === "success";

    // Update order if exists
    const orderRef = dbAdmin.collection("orders").doc(reference);
    const orderSnap = await orderRef.get();
    if (orderSnap.exists) {
      const order = orderSnap.data();
      const expectedAmount = Number(order.amountMinor || 0);

      // Protect: amount must match what we initialized
      if (paid && Number(data.amount) === expectedAmount) {
        await orderRef.update({
          status: "paid",
          paystack: {
            ...(order.paystack || {}),
            status: "success",
            gatewayResponse: data.gateway_response || "",
            paidAt: data.paid_at || null,
            channel: data.channel || "",
            authorization: data.authorization || null,
          },
          updatedAt: new Date(),
        });
      }
    }

    return res.json({
      ok: true,
      paid,
      reference,
      paystackStatus: data?.status,
    });
  } catch (err) {
    next(err);
  }
});

// ---- 3) WEBHOOK (source of truth)
// IMPORTANT: this route must use RAW body to validate signature correctly.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      assertEnv();

      const signature = req.headers["x-paystack-signature"];
      const rawBody = req.body; // Buffer (because express.raw)

      // Validate signature
      const hash = crypto
        .createHmac("sha512", PAYSTACK_SECRET_KEY)
        .update(rawBody)
        .digest("hex");

      if (hash !== signature) {
        return res.status(401).send("Invalid signature");
      }

      const event = JSON.parse(rawBody.toString("utf8"));

      // Only handle successful charge
      if (event?.event === "charge.success") {
        const data = event.data;
        const reference = String(data?.reference || "").trim();

        if (reference) {
          const orderRef = dbAdmin.collection("orders").doc(reference);
          const snap = await orderRef.get();

          if (snap.exists) {
            const order = snap.data();
            const expectedAmount = Number(order.amountMinor || 0);
            const paidAmount = Number(data.amount || 0);

            // Protect: ensure amount matches our expected backend amount
            if (paidAmount === expectedAmount) {
              await orderRef.update({
                status: "paid",
                paystack: {
                  ...(order.paystack || {}),
                  status: "success",
                  gatewayResponse: data.gateway_response || "",
                  paidAt: data.paid_at || null,
                  channel: data.channel || "",
                  authorization: data.authorization || null,
                  customer: data.customer || null,
                },
                updatedAt: new Date(),
              });

              // Optional: stock decrement could happen here (if you add stock fields later)
            } else {
              await orderRef.update({
                status: "amount_mismatch",
                paystack: {
                  ...(order.paystack || {}),
                  status: "amount_mismatch",
                  receivedAmount: paidAmount,
                },
                updatedAt: new Date(),
              });
            }
          }
        }
      }

      // Always respond 200 quickly
      return res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
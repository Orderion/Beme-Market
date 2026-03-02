// src/routes/paystack.js
import express from "express";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";
import { sendOrderPaidEmails } from "../services/email.js";

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL;

if (!PAYSTACK_SECRET_KEY) throw new Error("Missing PAYSTACK_SECRET_KEY in backend env");
if (!FRONTEND_URL) throw new Error("Missing FRONTEND_URL in backend env");
if (!BACKEND_URL) throw new Error("Missing BACKEND_URL in backend env");

async function safeFetch(...args) {
  if (typeof fetch !== "undefined") return fetch(...args);
  const mod = await import("node-fetch");
  return mod.default(...args);
}

const SPECIAL_REGIONS = new Set(["Ashanti", "Greater Accra", "Eastern", "Western"]);

function safeTrim(v) {
  return String(v ?? "").trim();
}

function computeDeliveryFee(region) {
  if (!region) return 0;
  return SPECIAL_REGIONS.has(region) ? 0 : 50;
}

async function computeAmountFromItems(items) {
  const clean = Array.isArray(items) ? items : [];
  const ids = clean.map((x) => safeTrim(x?.id)).filter(Boolean);
  if (!ids.length) return { subtotal: 0, lineItems: [] };

  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

  const productMap = new Map();

  for (const chunk of chunks) {
    const snap = await adminDb
      .collection("Products")
      .where(firebaseAdmin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    snap.forEach((doc) => productMap.set(doc.id, doc.data()));
  }

  let subtotal = 0;
  const lineItems = [];

  for (const it of clean) {
    const id = safeTrim(it?.id);
    const qty = Number(it?.qty ?? 1);
    if (!id) continue;
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const p = productMap.get(id);
    if (!p) throw new Error(`Product not found: ${id}`);

    const price = Number(p.price ?? 0);
    if (!Number.isFinite(price) || price < 0) throw new Error(`Invalid price for product: ${id}`);

    subtotal += price * qty;

    lineItems.push({
      id,
      name: p.name || "",
      price,
      qty,
      image: p.image || "",
    });
  }

  return { subtotal, lineItems };
}

router.post("/checkout/init", async (req, res) => {
  try {
    const email = safeTrim(req.body?.email);
    const items = req.body?.items || [];
    const customer = req.body?.customer || {};

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Cart is empty" });

    const region = safeTrim(customer.region);
    const deliveryFee = computeDeliveryFee(region);

    const { subtotal, lineItems } = await computeAmountFromItems(items);
    if (!lineItems.length) return res.status(400).json({ error: "Cart items invalid" });

    const total = subtotal + deliveryFee;
    const amountPesewas = Math.round(total * 100);

    const orderRef = adminDb.collection("Orders").doc();
    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    await orderRef.set({
      status: "pending_payment",
      paymentMethod: "paystack",
      paid: false,
      emailSent: false,

      amounts: {
        currency: "GHS",
        subtotal,
        deliveryFee,
        total,
      },

      customer: {
        email,
        firstName: safeTrim(customer.firstName),
        lastName: safeTrim(customer.lastName),
        phone: safeTrim(customer.phone),
        network: safeTrim(customer.network),
        country: "Ghana",
        address: safeTrim(customer.address),
        region,
        city: safeTrim(customer.city),
        area: safeTrim(customer.area),
        notes: safeTrim(customer.notes),
      },

      items: lineItems,
      createdAt: now,
      updatedAt: now,
    });

    const reference = `BM_${orderRef.id}`;

    const initRes = await safeFetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountPesewas,
        currency: "GHS",
        reference,
        callback_url: `${BACKEND_URL}/api/paystack/checkout/callback`,
        metadata: {
          orderId: orderRef.id,
          deliveryFee,
        },
      }),
    });

    const initData = await initRes.json();

    if (!initRes.ok || !initData?.status || !initData?.data?.authorization_url) {
      await orderRef.update({
        status: "paystack_init_failed",
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        paystack: { initError: initData },
      });
      return res.status(400).json({ error: initData?.message || "Paystack init failed" });
    }

    await orderRef.update({
      reference,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      paystack: {
        reference,
        access_code: initData?.data?.access_code || null,
      },
    });

    return res.json({
      authorization_url: initData.data.authorization_url,
      reference,
      orderId: orderRef.id,
    });
  } catch (err) {
    console.error("Paystack init error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

async function verifyAndUpdate(reference) {
  const vr = await safeFetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
  );

  const data = await vr.json();
  if (!vr.ok || !data?.status) throw new Error(data?.message || "Verify failed");

  const status = data?.data?.status; // success | failed
  const amountPesewas = Number(data?.data?.amount || 0);
  const paidAt = data?.data?.paid_at || null;

  const q = await adminDb.collection("Orders").where("reference", "==", reference).limit(1).get();
  if (q.empty) return { status, orderId: null, orderDoc: null, amountPesewas, paidAt };

  const orderDoc = q.docs[0];
  const orderRef = orderDoc.ref;
  const existing = orderDoc.data();

  if (status === "success") {
    // idempotent: don’t resubmit updates if already paid
    if (!existing?.paid) {
      await orderRef.update({
        paid: true,
        status: "paid",
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        paystack: {
          ...(existing?.paystack || {}),
          verified: true,
          status,
          amountPesewas,
          paidAt,
        },
      });
    }

    // ✅ Email trigger once
    if (!existing?.emailSent) {
      try {
        await sendOrderPaidEmails({
          orderId: orderDoc.id,
          reference,
          customer: existing?.customer,
          amounts: existing?.amounts,
        });

        await orderRef.update({
          emailSent: true,
          updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        // Don’t fail the payment just because email failed
        await orderRef.update({
          emailSent: false,
          emailError: String(e?.message || e),
          updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return { status, orderId: orderDoc.id };
  }

  // failed / abandoned
  await orderRef.update({
    paid: false,
    status: "payment_failed",
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    paystack: {
      ...(existing?.paystack || {}),
      verified: true,
      status: status || "failed",
    },
  });

  return { status: status || "failed", orderId: orderDoc.id };
}

router.get("/checkout/callback", async (req, res) => {
  const reference = safeTrim(req.query?.reference);

  if (!reference) {
    return res.redirect(`${FRONTEND_URL}/order-success?status=missing_reference`);
  }

  try {
    const out = await verifyAndUpdate(reference);

    if (out?.status === "success") {
      return res.redirect(`${FRONTEND_URL}/order-success?reference=${reference}&status=success`);
    }

    return res.redirect(
      `${FRONTEND_URL}/order-success?reference=${reference}&status=${encodeURIComponent(out?.status || "failed")}`
    );
  } catch (err) {
    console.error("Paystack callback verify error:", err);
    return res.redirect(`${FRONTEND_URL}/order-success?reference=${reference}&status=verify_error`);
  }
});

router.get("/checkout/verify", async (req, res) => {
  try {
    const reference = safeTrim(req.query?.reference);
    if (!reference) return res.status(400).json({ error: "Missing reference" });

    const out = await verifyAndUpdate(reference);

    return res.json({
      ok: true,
      status: out.status,
      reference,
      orderId: out.orderId,
    });
  } catch (err) {
    console.error("Paystack verify error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

export default router;
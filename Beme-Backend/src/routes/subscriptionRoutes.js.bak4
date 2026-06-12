import express        from "express";
import crypto         from "crypto";
import {
  sendSubscriptionConfirmation,
} from "../services/email.js";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";
const FieldValue = firebaseAdmin.firestore.FieldValue;

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const BASE_URL        = process.env.FRONTEND_URL || "https://bememarket.store";

/* ── Plan amounts in kobo (GHS × 100) ── */
const PLAN_AMOUNTS = {
  starter: { monthly: 5900,  yearly: 58800  },
  growth:  { monthly: 12900, yearly: 128400 },
  pro:     { monthly: 39900, yearly: 397200 },
};

/* ── Plan limits for Firestore ── */
const PLAN_LIMITS = {
  basic:   { maxProducts: 5,   hasChat: false, hasDelivery: false, hasAnalytics: false },
  starter: { maxProducts: 10,  hasChat: true,  hasDelivery: false, hasAnalytics: false },
  growth:  { maxProducts: 25,  hasChat: true,  hasDelivery: true,  hasAnalytics: true  },
  pro:     { maxProducts: 500, hasChat: true,  hasDelivery: true,  hasAnalytics: true  },
};

/* ── Simple auth helper ── */
async function requireAuthUser(req) {
  const authHeader = String(req.headers.authorization || "");
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("Missing authorization token.");
    error.statusCode = 401;
    throw error;
  }
  const decoded = await firebaseAdmin.auth().verifyIdToken(match[1], true);
  if (!decoded?.uid) {
    const error = new Error("Invalid authorization token.");
    error.statusCode = 401;
    throw error;
  }
  return decoded;
}

/* ─────────────────────────────────────────────────
   POST /api/subscriptions/initialize
───────────────────────────────────────────────── */
router.post("/initialize", async (req, res) => {
  try {
    const { planId, uid, email, shopId, billing = "monthly", amount } = req.body;

    if (!planId || !uid || !email) {
      return res.status(400).json({ error: "planId, uid and email are required." });
    }

    const plan = planId.toLowerCase();

    if (plan === "basic") {
      return res.json({ isFree: true });
    }

    const period = billing === "yearly" ? "yearly" : "monthly";
    const kobo   = PLAN_AMOUNTS[plan]?.[period];
    if (!kobo) return res.status(400).json({ error: `Invalid plan: ${plan}` });

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: kobo,
        currency: "GHS",
        callback_url: `${BASE_URL}/subscription/callback`,
        metadata: {
          custom_fields: [
            { display_name: "Plan",    variable_name: "planId",  value: plan   },
            { display_name: "Billing", variable_name: "billing", value: period },
            { display_name: "User ID", variable_name: "uid",     value: uid    },
            { display_name: "Shop ID", variable_name: "shopId",  value: shopId },
          ],
          planId, billing: period, uid, shopId,
        },
        label: `Beme Market ${plan.charAt(0).toUpperCase()+plan.slice(1)} ${period === "yearly" ? "(Yearly)" : "(Monthly)"}`,
      }),
    });

    const psData = await paystackRes.json();
    if (!psData.status) throw new Error(psData.message || "Paystack error");

    await adminDb.collection("subscriptionAttempts").doc(psData.data.reference).set({
      reference:   psData.data.reference,
      planId:      plan,
      billing:     period,
      uid,
      shopId:      shopId || uid,
      email,
      amountKobo:  kobo,
      status:      "pending",
      createdAt:   FieldValue.serverTimestamp(),
    });

    res.json({
      authorization_url: psData.data.authorization_url,
      reference:         psData.data.reference,
      access_code:       psData.data.access_code,
    });

  } catch (err) {
    console.error("[subscriptions/initialize]", err.message);
    res.status(500).json({ error: err.message || "Payment initialization failed." });
  }
});

/* ─────────────────────────────────────────────────
   GET /api/subscriptions/verify?reference=xxx
───────────────────────────────────────────────── */
router.get("/verify", async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: "Reference required." });

    const psRes  = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const psData = await psRes.json();

    if (!psData.status || psData.data.status !== "success") {
      return res.status(400).json({
        error: `Payment ${psData.data?.status || "failed"}. Please try again.`,
        paystackStatus: psData.data?.status,
      });
    }

    const meta   = psData.data.metadata;
    const planId = meta.planId  || psData.data.metadata?.custom_fields?.find(f=>f.variable_name==="planId")?.value  || "";
    const uid    = meta.uid     || psData.data.metadata?.custom_fields?.find(f=>f.variable_name==="uid")?.value     || "";
    const shopId = meta.shopId  || psData.data.metadata?.custom_fields?.find(f=>f.variable_name==="shopId")?.value  || uid;
    const billing= meta.billing || "monthly";

    if (!planId || !uid) return res.status(400).json({ error: "Missing metadata." });

    const plan   = planId.toLowerCase();
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.basic;
    const now    = FieldValue.serverTimestamp();

    const expiryDate = new Date();
    if (billing === "yearly") expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    else                      expiryDate.setMonth(expiryDate.getMonth() + 1);

    const batch = adminDb.batch();

    if (shopId) {
      batch.set(adminDb.collection("shops").doc(shopId), {
        planId, billing, updatedAt: now, ...limits,
      }, { merge: true });
    }

    batch.set(adminDb.collection("storeApplications").doc(uid), {
      planId, billing, updatedAt: now,
    }, { merge: true });

    batch.set(adminDb.collection("subscriptions").doc(uid), {
      uid, shopId, planId, billing,
      status:          "active",
      reference,
      amountKobo:      psData.data.amount,
      amountGHS:       psData.data.amount / 100,
      currency:        psData.data.currency,
      paidAt:          now,
      expiresAt:       expiryDate,
      channel:         psData.data.channel,
      paystackCustomer: psData.data.customer?.email,
      updatedAt:       now,
      ...limits,
    }, { merge: true });

    batch.set(adminDb.collection("subscriptionAttempts").doc(reference), {
      status: "verified", verifiedAt: now,
    }, { merge: true });

    // FIXED: also update users/{uid} so AuthContext reads the correct plan
    // without this, AuthContext.subscriptionPlan stays "basic" until next login
    batch.set(adminDb.collection("users").doc(uid), {
      subscriptionPlan:   plan,
      subscriptionStatus: "active",
      updatedAt:          now,
    }, { merge: true });

    await batch.commit();

    try {
      const sellerSnap = await adminDb.collection("storeApplications").doc(uid).get();
      const sellerData = sellerSnap.exists ? sellerSnap.data() : {};
      const sellerEmail= psData.data.customer?.email || sellerData.email || "";
      const sellerName = sellerData.shopName || sellerData.sellerName || "";
      if (sellerEmail) {
        sendSubscriptionConfirmation({
          email:     sellerEmail,
          planId:    plan,
          billing,
          amount:    psData.data.amount / 100,
          reference,
          expiresAt: expiryDate.toISOString(),
          sellerName,
        }).catch(e => console.error("[email] sub confirm:", e.message));
      }
    } catch (e) {
      console.error("[email] sub lookup failed:", e.message);
    }

    res.json({
      success: true,
      planId, billing,
      amountGHS: psData.data.amount / 100,
      expiresAt: expiryDate.toISOString(),
    });

  } catch (err) {
    console.error("[subscriptions/verify]", err.message);
    res.status(500).json({ error: err.message || "Verification failed." });
  }
});

/* ─────────────────────────────────────────────────
   POST /api/subscriptions/webhook
   FIXED: removed duplicate express.raw() middleware.
   app.js already registers express.raw for this path —
   having two raw body parsers caused req.body to be
   undefined or corrupt on the second pass.
───────────────────────────────────────────────── */
router.post("/webhook", async (req, res) => {
  try {
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(req.body)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.sendStatus(400);
    }

    const event = JSON.parse(req.body);
    console.log("[webhook] event:", event.event);

    if (event.event === "charge.success") {
      const data      = event.data;
      const reference = data.reference;
      const meta      = data.metadata || {};
      const planId    = meta.planId  || "";
      const uid       = meta.uid     || "";
      const shopId    = meta.shopId  || uid;
      const billing   = meta.billing || "monthly";

      if (!planId || !uid) {
        console.log("[webhook] missing metadata, skipping");
        return res.sendStatus(200);
      }

      const attemptRef  = adminDb.collection("subscriptionAttempts").doc(reference);
      const attemptSnap = await attemptRef.get();
      if (attemptSnap.exists && attemptSnap.data().status === "verified") {
        console.log("[webhook] already verified:", reference);
        return res.sendStatus(200);
      }

      const plan   = planId.toLowerCase();
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.basic;
      const now    = FieldValue.serverTimestamp();
      const expiry = new Date();
      if (billing === "yearly") expiry.setFullYear(expiry.getFullYear() + 1);
      else                      expiry.setMonth(expiry.getMonth() + 1);

      const batch = adminDb.batch();
      if (shopId) {
        batch.set(adminDb.collection("shops").doc(shopId), { planId, billing, ...limits, updatedAt: now }, { merge: true });
      }
      batch.set(adminDb.collection("storeApplications").doc(uid), { planId, billing, updatedAt: now }, { merge: true });
      batch.set(adminDb.collection("subscriptions").doc(uid), {
        uid, shopId, planId, billing,
        status: "active", reference,
        amountKobo: data.amount, amountGHS: data.amount / 100,
        paidAt: now, expiresAt: expiry,
        channel: data.channel,
        ...limits, updatedAt: now,
      }, { merge: true });
      batch.set(attemptRef, { status: "verified", verifiedAt: now }, { merge: true });

      // FIXED: sync to users/{uid} — same as /verify route
      batch.set(adminDb.collection("users").doc(uid), {
        subscriptionPlan:   plan,
        subscriptionStatus: "active",
        updatedAt:          now,
      }, { merge: true });

      await batch.commit();
      console.log(`[webhook] subscription updated: uid=${uid} plan=${plan}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("[webhook] error:", err.message);
    res.sendStatus(500);
  }
});

/* ─────────────────────────────────────────────────
   GET /api/subscriptions/status?uid=xxx
   FIXED: added authentication — was previously open to anyone
───────────────────────────────────────────────── */
router.get("/status", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);
    const { uid }  = req.query;

    if (!uid) return res.status(400).json({ error: "uid required" });

    // Users can only query their own subscription.
    // Admins (super_admin role) are handled by the Admin SDK bypassing rules —
    // for the HTTP endpoint we restrict to own uid only.
    if (authUser.uid !== uid) {
      return res.status(403).json({ error: "Not authorised to view this subscription." });
    }

    const snap = await adminDb.collection("subscriptions").doc(uid).get();
    if (!snap.exists) return res.json({ planId: "basic", status: "none" });
    res.json(snap.data());
  } catch (err) {
    res.status(err?.statusCode || 500).json({ error: err.message });
  }
});

export default router;
// Beme-Backend/src/routes/helpRoutes.js
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";

const router = express.Router();

/* ── Inline auth (same pattern as orderRoutes.js) ── */
async function verifyAuth(req) {
  const auth  = req.headers.authorization || "";
  const match = auth.match(/^Bearer (.+)$/);
  if (!match?.[1]) {
    const e = new Error("Missing authorization token."); e.statusCode = 401; throw e;
  }
  const decoded = await firebaseAdmin.auth().verifyIdToken(match[1]);
  if (!decoded?.uid) {
    const e = new Error("Invalid authorization token."); e.statusCode = 401; throw e;
  }
  return decoded;
}

const BEME_SYSTEM_PROMPT = `You are Beme Support, the official AI assistant for Beme Market — Ghana's leading multi-vendor marketplace platform. You help sellers resolve issues with their stores.

You have deep knowledge of:
- Store setup, onboarding, and the 4-step process
- Product listings: adding, editing, variants, pricing, stock management
- Orders: managing, tracking, delivery progress stepper, COD vs Paystack
- Payments: Paystack checkout flow, COD (Pay on Delivery), order totals
- Withdrawals: minimum GHS 50, MoMo (MTN/Telecel/AirtelTigo) or bank transfer, 1-3 business days
- Referral system: GHS 1 (Starter), GHS 3 (Growth), GHS 7 (Pro), min GHS 100 to withdraw
- Subscription plans: Basic (free/5 products), Starter (GHS 59/mo), Growth (GHS 129/mo), Pro (GHS 399/mo)
- Beme AI: 15 free messages/day, available in the AI tab of seller dashboard
- Delivery: self-delivery or Beme courier (Growth/Pro plans), DHL/Cheetah/KwikDelivery/Glovo couriers
- Discount codes: creating percentage or fixed codes, usage limits, expiry
- Flash sales: time-limited discounts on specific products
- Store Design: banner, logo, social links (Starter+), chat preference
- Settings: Security (2FA/TOTP, passkeys), Verification (Ghana Card/Passport), Delivery config
- Marketing: discount codes, flash sales, referrals, loyalty rewards, product boosts
- Analytics: revenue split, Paystack vs COD earnings, available balance

Communication style:
- Be concise, friendly, and direct
- Give step-by-step instructions when needed
- Use dashboard tab names exactly as they appear
- If you cannot fully resolve the issue, say so clearly

When you cannot resolve an issue, end your message with exactly this on a new line:
[ESCALATE_AVAILABLE]`;

/* ── POST /api/help/chat ── */
router.post("/chat", async (req, res) => {
  try {
    const user = await verifyAuth(req);
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message is required." });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const messages = [
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message.trim() },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 800,
      system: BEME_SYSTEM_PROMPT, messages,
    });

    const reply       = response.content[0]?.text || "Sorry, I could not generate a response.";
    const canEscalate = reply.includes("[ESCALATE_AVAILABLE]");
    const cleanReply  = reply.replace("[ESCALATE_AVAILABLE]", "").trim();

    // Save to Firestore
    const msgCol = adminDb.collection("helpChats").doc(user.uid).collection("messages");
    await msgCol.add({ role: "user",      content: message.trim(), createdAt: new Date() });
    await msgCol.add({ role: "assistant", content: cleanReply, canEscalate, createdAt: new Date() });
    await adminDb.collection("helpChats").doc(user.uid).set({
      uid: user.uid, email: user.email || "",
      lastMessage: cleanReply.slice(0, 120),
      updatedAt: new Date(), status: "active",
    }, { merge: true });

    return res.json({ reply: cleanReply, canEscalate });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ error: e.message || "AI assistant temporarily unavailable." });
  }
});

/* ── POST /api/help/escalate ── */
router.post("/escalate", async (req, res) => {
  try {
    const user = await verifyAuth(req);
    const { summary, history = [] } = req.body;

    let shopName = "";
    try {
      const snap = await adminDb.collection("storeApplications").doc(user.uid).get();
      shopName = snap.data()?.shopName || snap.data()?.businessName || "";
    } catch {}

    const ticketRef = await adminDb.collection("helpTickets").add({
      sellerId: user.uid, sellerEmail: user.email || "", shopName,
      summary: summary?.trim() || "Seller requested human support",
      status: "open", priority: "normal", source: "ai_escalation",
      aiHistory: history.slice(-8).map(h => ({ role: h.role, content: h.content?.slice(0, 500) })),
      createdAt: new Date(), updatedAt: new Date(), unreadByAdmin: true,
    });

    await adminDb.collection("adminNotifications").add({
      type: "help_escalation",
      title: `Support request from ${shopName || user.email}`,
      body: summary?.trim() || "Seller needs human agent assistance",
      ticketId: ticketRef.id, sellerId: user.uid,
      read: false, createdAt: new Date(),
    });

    return res.json({ ticketId: ticketRef.id });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ error: e.message || "Failed to create support ticket." });
  }
});

/* ── GET /api/help/history ── */
router.get("/history", async (req, res) => {
  try {
    const user = await verifyAuth(req);
    const snap = await adminDb
      .collection("helpChats").doc(user.uid)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limitToLast(30)
      .get();
    return res.json({ messages: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e) {
    return res.json({ messages: [] });
  }
});

/* ── GET /api/help/tickets ── */
router.get("/tickets", async (req, res) => {
  try {
    await verifyAuth(req);
    const snap = await adminDb.collection("helpTickets").orderBy("createdAt", "desc").limit(100).get();
    return res.json({ tickets: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch tickets." });
  }
});

/* ── POST /api/help/tickets/:ticketId/reply ── */
router.post("/tickets/:ticketId/reply", async (req, res) => {
  try {
    const user = await verifyAuth(req);
    const { ticketId } = req.params;
    const { message, resolve = false } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message required." });

    const ticketRef = adminDb.collection("helpTickets").doc(ticketId);
    const snap      = await ticketRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Ticket not found." });

    const ticket = snap.data();
    await ticketRef.collection("replies").add({ adminUid: user.uid, message: message.trim(), createdAt: new Date() });
    await ticketRef.update({
      status: resolve ? "resolved" : "in_progress",
      updatedAt: new Date(), unreadByAdmin: false,
      lastReply: message.trim().slice(0, 120),
    });

    if (ticket.sellerId) {
      await adminDb.collection("sellerNotifications").doc(ticket.sellerId).collection("items").add({
        type: "system",
        title: resolve ? "Your support request was resolved" : "New reply from Beme Support",
        body: message.trim().slice(0, 200),
        linkTab: "help", read: false, createdAt: new Date(),
      });
    }

    return res.json({ success: true });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ error: e.message || "Failed to send reply." });
  }
});

export default router;
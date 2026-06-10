// Beme-Backend/src/routes/helpRoutes.js
// Claude AI proxy for seller help chat + ticket escalation

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "../config/firebase-admin.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

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
- Be concise, friendly, and direct — sellers are busy
- Give step-by-step instructions when needed
- Use the seller dashboard tab names exactly as they appear (e.g. "Go to Orders tab", "Check Withdrawals tab")
- If you cannot fully resolve the issue, say so clearly and ask if they want to escalate to a human agent
- Never make up information — if unsure, say so

When you cannot resolve an issue, end your message with exactly this phrase on a new line:
[ESCALATE_AVAILABLE]`;

router.post("/chat", verifyToken, async (req, res) => {
  const { message, history = [] } = req.body;
  const uid   = req.user?.uid;
  const email = req.user?.email || "";

  if (!message?.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build messages array from history
    const messages = [
      ...history.slice(-10).map(h => ({
        role:    h.role,
        content: h.content,
      })),
      { role: "user", content: message.trim() },
    ];

    const response = await client.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 800,
      system:     BEME_SYSTEM_PROMPT,
      messages,
    });

    const reply      = response.content[0]?.text || "Sorry, I couldn't generate a response.";
    const canEscalate = reply.includes("[ESCALATE_AVAILABLE]");
    const cleanReply  = reply.replace("[ESCALATE_AVAILABLE]", "").trim();

    // Save message pair to Firestore helpChats
    const chatRef = adminDb.collection("helpChats").doc(uid);
    const msgCol  = chatRef.collection("messages");

    await msgCol.add({
      role: "user", content: message.trim(),
      createdAt: new Date(),
    });
    await msgCol.add({
      role: "assistant", content: cleanReply,
      canEscalate, createdAt: new Date(),
    });

    // Update chat session metadata
    await chatRef.set({
      uid, email,
      lastMessage: cleanReply.slice(0, 120),
      updatedAt:   new Date(),
      status:      "active",
    }, { merge: true });

    return res.json({ reply: cleanReply, canEscalate });

  } catch (e) {
    console.error("[helpRoutes] Claude error:", e.message);
    return res.status(500).json({
      error: "AI assistant is temporarily unavailable. Please try again.",
    });
  }
});

/* ── Escalate to human agent ── */
router.post("/escalate", verifyToken, async (req, res) => {
  const { summary, history = [] } = req.body;
  const uid   = req.user?.uid;
  const email = req.user?.email || "";

  try {
    // Get seller shop info
    let shopName = "";
    try {
      const appSnap = await adminDb.collection("storeApplications").doc(uid).get();
      shopName = appSnap.data()?.shopName || appSnap.data()?.businessName || "";
    } catch {}

    // Create help ticket
    const ticketRef = await adminDb.collection("helpTickets").add({
      sellerId:    uid,
      sellerEmail: email,
      shopName,
      summary:     summary?.trim() || "Seller requested human support",
      status:      "open",
      priority:    "normal",
      source:      "ai_escalation",
      aiHistory:   history.slice(-8).map(h => ({
        role: h.role, content: h.content?.slice(0, 500),
      })),
      createdAt:   new Date(),
      updatedAt:   new Date(),
      unreadByAdmin: true,
    });

    // Notify admin (write to adminNotifications)
    await adminDb.collection("adminNotifications").add({
      type:     "help_escalation",
      title:    `Support request from ${shopName || email}`,
      body:     summary?.trim() || "Seller needs human agent assistance",
      ticketId: ticketRef.id,
      sellerId: uid,
      read:     false,
      createdAt: new Date(),
    });

    return res.json({ ticketId: ticketRef.id });

  } catch (e) {
    console.error("[helpRoutes] escalate error:", e.message);
    return res.status(500).json({ error: "Failed to create support ticket." });
  }
});

/* ── Get chat history ── */
router.get("/history", verifyToken, async (req, res) => {
  const uid = req.user?.uid;
  try {
    const snap = await adminDb
      .collection("helpChats").doc(uid)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limitToLast(30)
      .get();

    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ messages });
  } catch (e) {
    return res.json({ messages: [] });
  }
});

/* ── Admin: get all open tickets ── */
router.get("/tickets", verifyToken, async (req, res) => {
  try {
    const snap = await adminDb
      .collection("helpTickets")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ tickets });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch tickets." });
  }
});

/* ── Admin: reply to ticket ── */
router.post("/tickets/:ticketId/reply", verifyToken, async (req, res) => {
  const { ticketId } = req.params;
  const { message, resolve = false } = req.body;
  const adminUid = req.user?.uid;

  if (!message?.trim()) return res.status(400).json({ error: "Message required." });

  try {
    const ticketRef = adminDb.collection("helpTickets").doc(ticketId);
    const snap      = await ticketRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Ticket not found." });

    const ticket = snap.data();

    // Add reply message
    await ticketRef.collection("replies").add({
      adminUid, message: message.trim(),
      createdAt: new Date(),
    });

    // Update ticket
    await ticketRef.update({
      status:        resolve ? "resolved" : "in_progress",
      updatedAt:     new Date(),
      unreadByAdmin: false,
      lastReply:     message.trim().slice(0, 120),
    });

    // Notify seller
    if (ticket.sellerId) {
      await adminDb
        .collection("sellerNotifications")
        .doc(ticket.sellerId)
        .collection("items")
        .add({
          type:    "system",
          title:   resolve ? "Your support request was resolved" : "New reply from Beme Support",
          body:    message.trim().slice(0, 200),
          linkTab: "help",
          read:    false,
          createdAt: new Date(),
        });
    }

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to send reply." });
  }
});

export default router;
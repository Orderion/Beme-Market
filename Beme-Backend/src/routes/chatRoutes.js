import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { getFirestore } from "firebase-admin/firestore";

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Plan-based auto-reply limits per day
const PLAN_LIMITS = {
  basic:   0,
  starter: 1000,
  growth:  20000,
  pro:     Infinity,
};

function getTodayKey() {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}

/**
 * POST /api/chat/auto-reply
 * Triggered by frontend after a customer sends a message.
 * Checks seller's AI auto-reply setting, plan limit, then replies as seller.
 */
router.post("/auto-reply", async (req, res) => {
  // Respond immediately so frontend isn't blocked
  res.json({ ok: true });

  const { chatId, sellerId, shopId, shopName, planId, message, productName } = req.body;
  if (!chatId || !sellerId || !message) return;

  const db = getFirestore();

  // Fetch seller's real plan from Firestore — don't trust client-sent planId
  let plan = "starter"; // default to starter so auto-reply works
  try {
    // Try storeApplications first (most reliable)
    const appSnap = await db.collection("storeApplications").doc(sellerId).get();
    if (appSnap.exists) {
      plan = String(appSnap.data().planId || "starter").toLowerCase();
    } else {
      // Fallback: try shops doc
      const shopSnap = await db.collection("shops").doc(shopId || sellerId).get();
      if (shopSnap.exists) {
        plan = String(shopSnap.data().planId || "starter").toLowerCase();
      }
    }
  } catch (e) {
    console.log("[chatRoutes] plan fetch failed, defaulting to starter:", e.message);
  }

  const limit = PLAN_LIMITS[plan] ?? 1000;
  console.log(`[chatRoutes] seller ${sellerId} plan: ${plan}, limit: ${limit}`);

  // Basic plan = no auto-replies
  if (limit === 0) return;

  try {
    // 1. Check seller's AI settings — is auto-reply enabled?
    const settingsSnap = await db.collection("aiSettings").doc(sellerId).get();
    const settings     = settingsSnap.exists ? settingsSnap.data() : {};
    if (!settings.customerAutoReplies) return; // Seller has it toggled OFF

    // Check if AI is paused for this specific chat
    const chatSnap = await db.collection("sellerChats").doc(chatId).get();
    if (chatSnap.exists && chatSnap.data().aiPaused === true) {
      console.log(`[chatRoutes] AI paused for chat ${chatId}`);
      return;
    }

    // 2. Check daily usage (skip check if Infinity plan)
    if (limit !== Infinity) {
      const today    = getTodayKey();
      const usageRef = db.collection("aiChatUsage").doc(sellerId);
      const usageSnap= await usageRef.get();
      const usage    = usageSnap.exists ? usageSnap.data() : {};

      const todayCount = (usage.date === today) ? (usage.count || 0) : 0;
      if (todayCount >= limit) {
        console.log(`[chatRoutes] auto-reply limit reached for ${sellerId} (${plan}: ${limit}/day)`);

        // D — Fallback message when limit is hit (only send once per day)
        if (todayCount === limit) {
          await db.collection("sellerChats").doc(chatId).collection("messages").add({
            text: "Thanks for reaching out! We'll get back to you shortly 😊",
            senderId: sellerId,
            senderRole: "seller",
            isAiReply: true,
            isFallback: true,
            createdAt: new Date(),
            read: false,
          });
          await db.collection("sellerChats").doc(chatId).set({
            lastMessage: "Thanks for reaching out! We'll get back to you shortly 😊",
            lastMessageAt: new Date(),
          }, { merge: true });
        }
        return;
      }

      // Increment usage
      await usageRef.set({
        date:  today,
        count: todayCount + 1,
        plan,
      }, { merge: true });
    }

    // 3. Get last few messages for context
    const msgsSnap = await db
      .collection("sellerChats").doc(chatId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(6)
      .get();

    const history = msgsSnap.docs
      .reverse()
      .map(d => ({
        role:    d.data().senderRole === "customer" ? "user" : "assistant",
        content: d.data().text || "",
      }))
      .filter(m => m.content);

    // Make sure last message is user
    if (!history.length || history[history.length - 1].role !== "user") {
      history.push({ role: "user", content: message });
    }

    // B — Smart context: fetch product details if productName provided
    let productContext = "";
    if (productName) {
      try {
        const pSnap = await db.collection("Products")
          .where("name", "==", productName)
          .where("sellerId", "==", sellerId)
          .limit(1)
          .get();
        if (!pSnap.empty) {
          const p = pSnap.docs[0].data();
          productContext = `\n\nProduct the customer is asking about:\n- Name: ${p.name || productName}\n- Price: GHS ${p.price || "?"}\n- Description: ${(p.description || "").slice(0, 200)}\n- In Stock: ${p.inStock !== false ? "Yes" : "No"}`;
        } else {
          productContext = `\n\nCustomer is asking about: ${productName}`;
        }
      } catch {
        productContext = `\n\nCustomer is asking about: ${productName}`;
      }
    }

    // 4. Call Claude
    const systemPrompt = `You are the friendly customer service assistant for "${shopName}", a store on Beme Market in Ghana.

Your job is to respond to customer messages professionally and helpfully on behalf of the seller.

Guidelines:
- Keep replies SHORT — 1-3 sentences maximum
- Sound natural and friendly, like a real seller
- Use GHS for prices when mentioning money
- If you don't know something specific, say the seller will get back to them shortly
- For delivery questions: default answer is 1-3 days in Ghana
- For availability questions: say "Yes, it's available! You can order it directly from our store."
- Never make up specific prices or stock numbers you don't know
- End with a helpful call to action when appropriate
${productContext}

Do not use asterisks, markdown, or any special formatting. Plain conversational text only.`;

    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system:     systemPrompt,
      messages:   history,
    });

    const replyText = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    if (!replyText) return;

    // 5. Save AI reply to Firestore
    await db
      .collection("sellerChats").doc(chatId)
      .collection("messages")
      .add({
        text:       replyText,
        senderId:   sellerId,
        senderRole: "seller",
        isAiReply:  true,
        createdAt:  new Date(),
        read:       false,
      });

    // Update chat metadata
    await db.collection("sellerChats").doc(chatId).set({
      lastMessage:    replyText.slice(0, 100),
      lastMessageAt:  new Date(),
      unreadByCustomer: (await db.collection("sellerChats").doc(chatId).get())
        .data()?.unreadByCustomer + 1 || 1,
    }, { merge: true });

    console.log(`[chatRoutes] auto-reply sent for chat ${chatId} by seller ${sellerId}`);

  } catch (err) {
    console.error("[chatRoutes] auto-reply error:", err?.message || err);
  }
});

/**
 * GET /api/chat/usage/:sellerId
 * Returns today's auto-reply usage for a seller.
 */
router.get("/usage/:sellerId", async (req, res) => {
  try {
    const db       = getFirestore();
    const today    = getTodayKey();
    const snap     = await db.collection("aiChatUsage").doc(req.params.sellerId).get();
    const data     = snap.exists ? snap.data() : {};
    const count    = data.date === today ? (data.count || 0) : 0;
    const plan     = data.plan || "basic";
    const limit    = PLAN_LIMITS[plan] ?? 0;
    res.json({ count, limit, plan, remaining: limit === Infinity ? Infinity : Math.max(0, limit - count) });
  } catch (err) {
    res.status(500).json({ error: "Usage fetch failed" });
  }
});

export default router;

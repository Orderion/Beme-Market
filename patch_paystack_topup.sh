#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Backend/src/routes/paystack.js","utf8").replace(/\r\n/g,"\n");

// Get FRONTEND_URL and BACKEND_URL pattern from existing code
const frontendMatch = src.match(/FRONTEND_URL\s*=\s*([^\n;]+)/);
console.log("FRONTEND_URL line:", frontendMatch?.[0]);

// Add topup routes before export default router
const TOPUP_ROUTES = `
/* ══════════════════════════════════════
   AI CREDITS TOPUP
══════════════════════════════════════ */

const TOPUP_PACKS = {
  small:          { credits: 50,   label: "50 Messages",     amountGHS: 15  },
  medium:         { credits: 200,  label: "200 Messages",    amountGHS: 45  },
  unlimited_week: { credits: 9999, label: "7-Day Unlimited", amountGHS: 75  },
};

router.post("/topup/init", async (req, res) => {
  let decoded;
  try {
    const auth  = req.headers.authorization || "";
    const match = auth.match(/^Bearer (.+)$/);
    if (!match?.[1]) return res.status(401).json({ error: "Unauthorized" });
    decoded = await firebaseAdmin.auth().verifyIdToken(match[1]);
  } catch { return res.status(401).json({ error: "Invalid token" }); }

  const { pack } = req.body;
  const packData = TOPUP_PACKS[pack];
  if (!packData) return res.status(400).json({ error: "Invalid pack" });

  const amountKobo = packData.amountGHS * 100;
  const reference  = \`topup_\${decoded.uid}_\${pack}_\${Date.now()}\`;

  try {
    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method:  "POST",
      headers: {
        Authorization: \`Bearer \${process.env.PAYSTACK_SECRET_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email:        decoded.email || \`\${decoded.uid}@bememarket.store\`,
        amount:       amountKobo,
        currency:     "GHS",
        reference,
        callback_url: \`\${process.env.FRONTEND_URL || "https://bememarket.store"}/seller-dashboard?tab=ai&topup_ref=\${reference}\`,
        metadata: {
          uid:     decoded.uid,
          pack,
          credits: packData.credits,
          type:    "ai_topup",
        },
      }),
    });
    const initData = await initRes.json();
    if (!initData?.status || !initData?.data?.authorization_url) {
      return res.status(500).json({ error: "Paystack init failed" });
    }
    return res.json({
      authorization_url: initData.data.authorization_url,
      reference,
    });
  } catch (e) {
    console.error("[topup/init]", e.message);
    return res.status(500).json({ error: "Payment initialization failed" });
  }
});

router.get("/topup/verify", async (req, res) => {
  const { reference } = req.query;
  if (!reference) return res.status(400).json({ error: "Missing reference" });

  // Only process topup references
  if (!reference.startsWith("topup_")) {
    return res.status(400).json({ error: "Invalid topup reference" });
  }

  try {
    const verifyRes = await fetch(
      \`https://api.paystack.co/transaction/verify/\${encodeURIComponent(reference)}\`,
      { headers: { Authorization: \`Bearer \${process.env.PAYSTACK_SECRET_KEY}\` } }
    );
    const verifyData = await verifyRes.json();
    if (!verifyData?.status || verifyData?.data?.status !== "success") {
      return res.status(400).json({ error: "Payment not successful", status: verifyData?.data?.status });
    }

    const { uid, pack, credits } = verifyData.data.metadata || {};
    if (!uid || !pack || !credits) {
      return res.status(400).json({ error: "Invalid metadata" });
    }

    // Add credits to seller's aiUsage
    const { FieldValue } = await import("firebase-admin/firestore");
    const usageRef = adminDb.collection("aiUsage").doc(uid);
    const snap     = await usageRef.get();
    const today    = new Date().toISOString().split("T")[0];

    if (!snap.exists()) {
      await usageRef.set({ count:0, date:today, extraCredits:Number(credits), lastUpdated:new Date() });
    } else {
      await usageRef.update({
        extraCredits: FieldValue.increment(Number(credits)),
        lastUpdated:  new Date(),
      });
    }

    // Log the topup
    await adminDb.collection("aiTopups").doc(\`\${uid}_\${Date.now()}\`).set({
      uid, pack, credits: Number(credits),
      reference, amount: verifyData.data.amount / 100,
      purchasedAt: new Date(),
    });

    return res.json({ success:true, credits: Number(credits), pack });
  } catch (e) {
    console.error("[topup/verify]", e.message);
    return res.status(500).json({ error: "Verification failed" });
  }
});

`;

// Insert before export default router
if (src.includes("export default router;")) {
  src = src.replace("export default router;", TOPUP_ROUTES + "\nexport default router;");
  console.log("✅ Topup routes added");
} else {
  console.log("❌ export default router not found");
}

fs.writeFileSync("Beme-Backend/src/routes/paystack.js", src.replace(/\n/g,"\r\n"),"utf8");
NODEEOF

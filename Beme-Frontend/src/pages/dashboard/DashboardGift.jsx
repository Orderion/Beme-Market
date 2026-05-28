import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

function Ico({ d, size = 20, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  heart:  "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  gift:   "M20 12v10H4V12|M2 7h20v5H2z|M12 22V7|M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z|M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  check:  "M20 6L9 17l-5-5",
  lock:   "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4",
  arrow:  "M5 12h14|M12 5l7 7-7 7",
};

const PRESETS = [10, 20, 50, 100, 200];

const IMPACT = [
  { amount: 10,  label: "Keeps the lights on for a day" },
  { amount: 20,  label: "Helps us support a new seller" },
  { amount: 50,  label: "Funds a week of platform improvements" },
  { amount: 100, label: "Sponsors a local seller training session" },
  { amount: 200, label: "Powers our community outreach for a month" },
];

export default function DashboardGift() {
  const { user } = useAuth();
  const [preset, setPreset]   = useState(null);
  const [custom, setCustom]   = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [phase, setPhase]     = useState("form"); // form | redirecting | success

  const finalAmount = custom ? parseInt(custom, 10) : preset;
  const impact = IMPACT.find(i => i.amount === finalAmount);

  const handleDonate = async () => {
    if (!finalAmount || finalAmount < 1) { setErr("Please choose or enter a donation amount."); return; }
    if (!user?.email) { setErr("You must be signed in to donate."); return; }
    setErr(""); setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "donations"), {
        amount: finalAmount,
        message: message.trim() || null,
        donorId: user.uid,
        donorEmail: user.email,
        status: "pending",
        reference: null,
        createdAt: serverTimestamp(),
      });
      const res = await fetch("https://beme-market-1.onrender.com/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount: finalAmount * 100,
          metadata: { type: "donation", message: message.trim() || "", donorId: user.uid, donationDocId: docRef.id },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Payment initialization failed.");
      const url = data?.data?.authorization_url || data?.authorization_url;
      if (!url) throw new Error("No payment URL returned.");
      setPhase("redirecting");
      setTimeout(() => { window.location.href = url; }, 1400);
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 0 60px", fontFamily: "var(--sd-font)" }}>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, var(--sd-accent) 0%, #9333ea 100%)", borderRadius: 20, padding: "36px 32px", marginBottom: 28, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -10, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Ico d={IC.heart} size={26} color="#fff" sw={1.5} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.03em" }}>Gift Beme</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.65, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
            Help keep Beme free and growing for small businesses across Ghana. Every contribution makes a real difference.
          </p>
        </div>
      </div>

      {phase === "form" && (
        <div style={{ background: "var(--sd-white)", borderRadius: 18, border: "1px solid var(--sd-border)", padding: 28 }}>
          {/* Amount presets */}
          <div style={{ marginBottom: 20 }}>
            <label className="sd-label">Choose Amount (GHS)</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 10 }}>
              {PRESETS.map(p => (
                <button key={p} onClick={() => { setPreset(p); setCustom(""); }}
                  style={{ padding: "11px 4px", borderRadius: 10, border: `1.5px solid ${preset === p && !custom ? "var(--sd-accent)" : "var(--sd-border)"}`, background: preset === p && !custom ? "var(--sd-accent-dim)" : "var(--sd-bg)", fontFamily: "var(--sd-font)", fontSize: 13, fontWeight: 700, color: preset === p && !custom ? "var(--sd-accent)" : "var(--sd-text)", cursor: "pointer", transition: "all 0.12s", boxShadow: preset === p && !custom ? "0 0 0 3px rgba(124,58,237,0.12)" : "none" }}>
                  GHS {p}
                </button>
              ))}
            </div>
            <input className="sd-input" type="number" min="1"
              placeholder="Or enter a custom amount…"
              value={custom}
              onChange={e => { setCustom(e.target.value); setPreset(null); }} />
          </div>

          {/* Impact hint */}
          {impact && (
            <div style={{ padding: "11px 14px", borderRadius: 10, background: "var(--sd-accent-dim)", border: "1px solid var(--sd-accent-border)", fontSize: 13, color: "var(--sd-accent)", fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Ico d={IC.heart} size={14} color="var(--sd-accent)" sw={1.5} />
              {impact.label}
            </div>
          )}

          {/* Message */}
          <div style={{ marginBottom: 20 }}>
            <label className="sd-label">Message for the Beme Team (Optional)</label>
            <textarea className="sd-textarea" rows={3}
              placeholder="Leave an encouraging message…"
              value={message} onChange={e => setMessage(e.target.value)}
              style={{ minHeight: 80 }} />
          </div>

          {err && <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--sd-danger-bg)", color: "var(--sd-danger)", fontSize: 13, fontWeight: 600, marginBottom: 16, border: "1px solid rgba(185,28,28,0.18)" }}>{err}</div>}

          <button className="sd-btn sd-btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, borderRadius: 12 }}
            onClick={handleDonate} disabled={loading}>
            {loading ? "Processing…" : <><Ico d={IC.heart} size={15} /> {finalAmount ? `Donate GHS ${finalAmount}` : "Donate"}</>}
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, fontSize: 12, color: "var(--sd-muted)" }}>
            <Ico d={IC.lock} size={13} color="var(--sd-muted)" />
            Secured by Paystack · All contributions are voluntary
          </div>
        </div>
      )}

      {phase === "redirecting" && (
        <div style={{ background: "var(--sd-white)", borderRadius: 18, border: "1px solid var(--sd-border)", padding: "60px 28px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--sd-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Ico d={IC.arrow} size={28} color="var(--sd-accent)" sw={2} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--sd-text)", marginBottom: 8 }}>Redirecting to Paystack…</h2>
          <p style={{ fontSize: 14, color: "var(--sd-muted)", marginBottom: 20 }}>Completing your donation of <strong>GHS {finalAmount}</strong>. Please do not close this tab.</p>
          <div style={{ width: 32, height: 32, border: "3px solid var(--sd-accent-dim)", borderTopColor: "var(--sd-accent)", borderRadius: "50%", margin: "0 auto", animation: "sd-spin 0.7s linear infinite" }} />
        </div>
      )}

      {/* How it helps */}
      <div style={{ marginTop: 20, background: "var(--sd-white)", borderRadius: 16, border: "1px solid var(--sd-border)", padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Where Your Contribution Goes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["Platform infrastructure", "Servers, databases, and uptime that keep Beme running 24/7"],
            ["Seller support team", "The humans who help sellers grow their businesses every day"],
            ["New features", "Tools we're building to help sellers compete and win"],
            ["Community outreach", "Training programs for new and aspiring sellers in Ghana"],
          ].map(([title, desc], i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--sd-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <Ico d={IC.check} size={12} color="var(--sd-accent)" sw={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sd-text)", marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: "var(--sd-muted)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes sd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
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
  message:  "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6|M15 3h6v6|M10 14L21 3",
  check:    "M20 6L9 17l-5-5",
  send:     "M22 2L11 13|M22 2L15 22l-4-9-9-4 22-7z",
  chevron:  "M6 9l6 6 6-6",
  help:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3|M12 17h.01",
  phone:    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.06 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16.92z",
  back:     "M19 12H5|M12 5l-7 7 7 7",
};

const FAQ = [
  { q: "How do I add a new product?", a: "Go to Products in your sidebar, click Add Product, fill in the details — name, price, description, category — then upload clear images. Add variants (size/color) if needed, set your stock, and save. The listing goes live immediately." },
  { q: "How do I receive payments from orders?", a: "All payments go through Paystack and are held in your Beme wallet. You can withdraw to a registered MoMo number or bank account from the Withdrawals tab. Processing takes 1–3 business days." },
  { q: "How do I apply for seller verification?", a: "Open Settings and select Verification. Prepare a valid government-issued ID (Ghana Card, Passport, or Driver's Licence) and optionally a business registration. Submit your request and our team reviews within 2–3 business days." },
  { q: "What are the subscription plans and their prices?", a: "Basic is free (5 products), Starter is GHS 59/month (10 products), Growth is GHS 129/month (25 products + Beme Delivery), and Pro is GHS 399/month (500 products + all features). Upgrade anytime from the Subscription tab." },
  { q: "How long do withdrawals take?", a: "MoMo withdrawals typically arrive within a few hours. Bank transfers take 1–2 business days. The minimum withdrawal is GHS 10. Always double-check your account details before submitting." },
  { q: "Why is my store showing as inactive or on hold?", a: "Your store may be under review, or your subscription may have expired. Check the Verification and Subscription tabs in Settings. If the problem persists, submit a support ticket and our team will investigate." },
  { q: "How does Beme Delivery work?", a: "Beme Delivery is available on Growth and Pro plans. When an order is placed, Beme coordinates a courier for pickup from your location and delivery to the customer. Configure your delivery zones and fees in Settings → Delivery Settings." },
  { q: "How do I use the AI features?", a: "Open Beme AI from the sidebar. You get 15 free messages per day to chat with the AI about your store, orders, analytics, and marketing. Additional message packs can be purchased. AI capabilities (auto-replies, descriptions, etc.) are managed in Settings → AI Capabilities." },
];

const CONTACT = [
  { icon: IC.message, title: "Live Chat Support", sub: "Usually replies within 2 hours", link: "/support", cta: "Start Chat" },
  { icon: IC.phone,   title: "WhatsApp Support", sub: "+233 XX XXX XXXX · Business hours", link: "https://wa.me/233000000000", cta: "Message Us" },
];

export default function DashboardHelp() {
  const { user } = useAuth();
  const [activeQ, setActiveQ]     = useState(null);
  const [view, setView]           = useState("main"); // main | ticket | success
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [err, setErr]             = useState("");

  const submitTicket = async () => {
    if (!issueType) { setErr("Please select an issue type."); return; }
    if (description.trim().length < 10) { setErr("Please provide more detail about your issue."); return; }
    setSubmitting(true); setErr("");
    try {
      await addDoc(collection(db, "support_tickets"), {
        issueType,
        description: description.trim(),
        userId: user?.uid || null,
        userEmail: user?.email || null,
        status: "open",
        source: "seller_dashboard_help",
        createdAt: serverTimestamp(),
      });
      setView("success");
    } catch {
      setErr("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 0 60px", fontFamily: "var(--sd-font)" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--sd-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico d={IC.help} size={20} color="var(--sd-accent)" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--sd-text)", margin: 0, letterSpacing: "-0.03em" }}>Get Help</h1>
        </div>
        <p style={{ fontSize: 14, color: "var(--sd-muted)", margin: 0, paddingLeft: 52 }}>
          Find answers, contact our team, or submit a support ticket.
        </p>
      </div>

      {view === "main" && (
        <>
          {/* Contact cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {CONTACT.map((c, i) => (
              <a key={i} href={c.link} target="_blank" rel="noreferrer"
                style={{ display: "flex", flexDirection: "column", gap: 12, padding: 18, borderRadius: 14, border: "1px solid var(--sd-border)", background: "var(--sd-white)", textDecoration: "none", transition: "box-shadow 0.15s, transform 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--sd-shadow)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--sd-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ico d={c.icon} size={18} color="var(--sd-accent)" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--sd-text)", marginBottom: 3 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "var(--sd-muted)" }}>{c.sub}</div>
                </div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--sd-accent)" }}>
                  {c.cta} <Ico d={IC.external} size={13} color="var(--sd-accent)" />
                </div>
              </a>
            ))}
          </div>

          {/* FAQ */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Frequently Asked Questions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {FAQ.map((item, i) => (
                <div key={i} style={{ border: "1px solid var(--sd-border)", borderRadius: 12, overflow: "hidden" }}>
                  <button onClick={() => setActiveQ(activeQ === i ? null : i)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", padding: "13px 16px", background: "var(--sd-white)", border: "none", cursor: "pointer", fontFamily: "var(--sd-font)", fontSize: 13.5, fontWeight: 600, color: "var(--sd-text)", textAlign: "left" }}>
                    <span>{item.q}</span>
                    <span style={{ flexShrink: 0, color: "var(--sd-muted)", transform: activeQ === i ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "flex" }}>
                      <Ico d={IC.chevron} size={14} />
                    </span>
                  </button>
                  {activeQ === i && (
                    <div style={{ padding: "0 16px 14px", fontSize: 13, color: "var(--sd-text2)", lineHeight: 1.7, background: "var(--sd-white)" }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ticket CTA */}
          <div style={{ padding: 20, borderRadius: 14, border: "1px solid var(--sd-border)", background: "var(--sd-accent-dim)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--sd-text)", marginBottom: 4 }}>Can't find what you need?</div>
              <div style={{ fontSize: 13, color: "var(--sd-muted)" }}>Submit a ticket and our team will respond within 24 hours.</div>
            </div>
            <button onClick={() => setView("ticket")} className="sd-btn sd-btn-primary">
              Submit a Ticket
            </button>
          </div>
        </>
      )}

      {view === "ticket" && (
        <div style={{ background: "var(--sd-white)", borderRadius: 16, border: "1px solid var(--sd-border)", padding: 28 }}>
          <button onClick={() => { setView("main"); setErr(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--sd-accent)", fontFamily: "var(--sd-font)", padding: 0, marginBottom: 20 }}>
            <Ico d={IC.back} size={13} /> Back to Help
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--sd-text)", marginBottom: 4, letterSpacing: "-0.02em" }}>Submit a Support Ticket</h2>
          <p style={{ fontSize: 13, color: "var(--sd-muted)", marginBottom: 24 }}>We'll respond to <strong>{user?.email}</strong> within 24 hours.</p>

          <div className="sd-form-group">
            <label className="sd-label">Issue Type</label>
            <select className="sd-select" value={issueType} onChange={e => setIssueType(e.target.value)}>
              <option value="">Select an issue…</option>
              <option value="order">Order issue</option>
              <option value="payment">Payment or withdrawal</option>
              <option value="product">Product listing</option>
              <option value="account">Account access</option>
              <option value="delivery">Delivery</option>
              <option value="subscription">Subscription or billing</option>
              <option value="verification">Verification</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sd-form-group">
            <label className="sd-label">Description</label>
            <textarea className="sd-textarea" rows={5}
              placeholder="Describe your issue in as much detail as possible. Include any error messages you saw."
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {err && <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--sd-danger-bg)", color: "var(--sd-danger)", fontSize: 13, fontWeight: 600, marginBottom: 14, border: "1px solid rgba(185,28,28,0.18)" }}>{err}</div>}
          <button className="sd-btn sd-btn-primary" style={{ width: "100%", justifyContent: "center" }}
            onClick={submitTicket} disabled={submitting}>
            {submitting ? "Submitting…" : <><Ico d={IC.send} size={14} /> Submit Ticket</>}
          </button>
        </div>
      )}

      {view === "success" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "60px 24px" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(21,128,61,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Ico d={IC.check} size={32} color="#15803d" sw={2.5} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--sd-text)", marginBottom: 8, letterSpacing: "-0.02em" }}>Ticket Submitted</h2>
          <p style={{ fontSize: 14, color: "var(--sd-muted)", marginBottom: 28, maxWidth: 320, lineHeight: 1.65 }}>
            Our team will respond to <strong>{user?.email}</strong> within 24 hours.
          </p>
          <button className="sd-btn sd-btn-primary" onClick={() => setView("main")}>Back to Help</button>
        </div>
      )}
    </div>
  );
}
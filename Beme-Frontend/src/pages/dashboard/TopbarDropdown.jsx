import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

/* ── SVG helper ── */
function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

/* ── Icon paths ── */
const D = {
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  help:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3|M12 17h.01",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  book:     "M4 19.5A2.5 2.5 0 0 1 6.5 17H20|M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  gift:     "M20 12v10H4V12|M2 7h20v5H2z|M12 22V7|M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z|M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  logout:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9",
  close:    "M18 6L6 18|M6 6l12 12",
  check:    "M20 6L9 17l-5-5",
  send:     "M22 2L11 13|M22 2L15 22l-4-9-9-4 22-7z",
  chevron:  "M6 9l6 6 6-6",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6|M15 3h6v6|M10 14L21 3",
  message:  "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  arrowUp:  "M12 19V5|M5 12l7-7 7 7",
  heart:    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4",
};

/* ── Shared modal backdrop ── */
function ModalBackdrop({ onClose, children, wide = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="sd-modal-backdrop" onClick={onClose}>
      <div
        className="sd-modal"
        style={wide ? { maxWidth: 600 } : {}}
        onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   1. GET HELP MODAL
═══════════════════════════════ */
const FAQ = [
  {
    q: "How do I add a new product?",
    a: "Go to Products in your sidebar, click Add Product, fill in the details, upload images, set variants if needed, and save. The product goes live immediately.",
  },
  {
    q: "How do I receive payments from orders?",
    a: "Payments go through Paystack directly to your connected account. Make sure your MoMo number or bank details are saved under Withdrawals before requesting a payout.",
  },
  {
    q: "How do I apply for seller verification?",
    a: "Open the Verification tab in your sidebar. Upload a valid ID and, if applicable, a business registration. Reviews take 1–3 business days.",
  },
  {
    q: "What are the subscription plans and prices?",
    a: "Beme offers Basic (free, 5 products), Starter (GHS 59/mo, 10 products), Growth (GHS 129/mo, 25 products), and Pro (GHS 399/mo, 500 products). Upgrade anytime from the Subscription tab.",
  },
  {
    q: "How long do withdrawals take?",
    a: "Withdrawals to MoMo typically arrive within a few hours. Bank transfers take 1–2 business days. Minimum withdrawal is GHS 10.",
  },
  {
    q: "Why is my store showing as inactive?",
    a: "Your store may be pending review or your subscription may have lapsed. Check the Verification and Subscription tabs. Contact support if the issue persists.",
  },
];

function GetHelpModal({ onClose, user }) {
  const [activeQ, setActiveQ] = useState(null);
  const [view, setView] = useState("main"); // "main" | "ticket" | "success"
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const submitTicket = async () => {
    if (!issueType) { setErr("Please select an issue type."); return; }
    if (description.trim().length < 10) { setErr("Please describe the issue in more detail."); return; }
    setSubmitting(true); setErr("");
    try {
      await addDoc(collection(db, "support_tickets"), {
        issueType,
        description: description.trim(),
        userId: user?.uid || null,
        userEmail: user?.email || null,
        status: "open",
        source: "seller_dashboard",
        createdAt: serverTimestamp(),
      });
      setView("success");
    } catch {
      setErr("Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="sd-modal-header">
        <div className="sd-modal-title">
          <Ico d={D.help} size={17} color="var(--sd-accent)" />
          Get Help
        </div>
        <button className="sd-modal-close" onClick={onClose}>
          <Ico d={D.close} size={15} />
        </button>
      </div>

      <div className="sd-modal-body">
        {view === "main" && (
          <>
            {/* Live chat link */}
            <a href="/support" className="sd-help-chat-card" target="_blank" rel="noreferrer">
              <span className="sd-help-chat-icon">
                <Ico d={D.message} size={18} color="var(--sd-accent)" />
              </span>
              <div className="sd-help-chat-info">
                <div className="sd-help-chat-title">Live Chat Support</div>
                <div className="sd-help-chat-sub">Chat with our team · Usually replies within 2 hours</div>
              </div>
              <Ico d={D.external} size={13} color="var(--sd-muted)" />
            </a>

            {/* FAQ */}
            <div className="sd-help-section-label">Frequently Asked Questions</div>
            <div className="sd-faq">
              {FAQ.map((item, i) => (
                <div key={i} className="sd-faq-item">
                  <button
                    className="sd-faq-q"
                    onClick={() => setActiveQ(activeQ === i ? null : i)}>
                    <span>{item.q}</span>
                    <span className={`sd-faq-chevron ${activeQ === i ? "open" : ""}`}>
                      <Ico d={D.chevron} size={13} />
                    </span>
                  </button>
                  {activeQ === i && (
                    <div className="sd-faq-a">{item.a}</div>
                  )}
                </div>
              ))}
            </div>

            <button
              className="sd-btn sd-btn-secondary"
              style={{ width: "100%", justifyContent: "center", marginTop: 18 }}
              onClick={() => setView("ticket")}>
              Submit a Support Ticket
            </button>
          </>
        )}

        {view === "ticket" && (
          <>
            <button className="sd-modal-back-btn" onClick={() => { setView("main"); setErr(""); }}>
              <Ico d="M19 12H5|M12 5l-7 7 7 7" size={13} />
              Back
            </button>
            <div className="sd-form-group">
              <label className="sd-label">Issue Type</label>
              <select
                className="sd-select"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}>
                <option value="">Select an issue…</option>
                <option value="order">Order issue</option>
                <option value="payment">Payment or withdrawal</option>
                <option value="product">Product listing</option>
                <option value="account">Account access</option>
                <option value="delivery">Delivery</option>
                <option value="subscription">Subscription or billing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Description</label>
              <textarea
                className="sd-textarea"
                rows={4}
                placeholder="Describe your issue in detail…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {err && <div className="sd-modal-err">{err}</div>}
            <button
              className="sd-btn sd-btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={submitTicket}
              disabled={submitting}>
              {submitting
                ? "Submitting…"
                : <><Ico d={D.send} size={13} /> Submit Ticket</>}
            </button>
          </>
        )}

        {view === "success" && (
          <div className="sd-modal-success-view">
            <div className="sd-modal-success-icon" style={{ background: "rgba(21,128,61,0.1)" }}>
              <Ico d={D.check} size={28} color="#15803d" sw={2.5} />
            </div>
            <div className="sd-modal-success-title">Ticket Submitted</div>
            <div className="sd-modal-success-sub">
              Our team will follow up at <strong>{user?.email || "your email"}</strong> within 24 hours.
            </div>
            <button
              className="sd-btn sd-btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
              onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
}

/* ═══════════════════════════════
   2. LEARN MORE MODAL
═══════════════════════════════ */
const RESOURCES = [
  {
    tag: "Products",
    tagColor: "#7c3aed",
    title: "Adding Your First Product",
    desc: "Write great titles, upload clear photos, set pricing and stock, and choose the right category.",
    link: "/help/adding-products",
  },
  {
    tag: "Sales",
    tagColor: "#15803d",
    title: "Getting Your First Sale",
    desc: "Tips on sharing your store link, pricing competitively, and attracting your first customers.",
    link: "/help/first-sale",
  },
  {
    tag: "Payments",
    tagColor: "#b45309",
    title: "Setting Up Payouts",
    desc: "Add your MoMo or bank account, understand withdrawal timelines, and set a payout schedule.",
    link: "/help/payouts",
  },
  {
    tag: "Verification",
    tagColor: "#1d4ed8",
    title: "Getting Verified",
    desc: "What documents you need, how the review works, and what the verified badge unlocks.",
    link: "/help/verification",
  },
  {
    tag: "Marketing",
    tagColor: "#be185d",
    title: "Using AI Marketing Tools",
    desc: "Generate captions, ad copy, and product descriptions with the built-in AI tools.",
    link: "/help/ai-tools",
  },
  {
    tag: "Delivery",
    tagColor: "#0891b2",
    title: "Beme Delivery Network",
    desc: "How Beme coordinates pickup and delivery for Growth and Pro sellers, rates and coverage.",
    link: "/help/delivery",
  },
];

function LearnMoreModal({ onClose }) {
  return (
    <ModalBackdrop onClose={onClose} wide>
      <div className="sd-modal-header">
        <div className="sd-modal-title">
          <Ico d={D.book} size={17} color="var(--sd-accent)" />
          Resource Hub
        </div>
        <button className="sd-modal-close" onClick={onClose}>
          <Ico d={D.close} size={15} />
        </button>
      </div>
      <div className="sd-modal-body">
        <div className="sd-resource-intro">Guides to help you grow your Beme store</div>
        <div className="sd-resource-grid">
          {RESOURCES.map((r, i) => (
            <a key={i} href={r.link} className="sd-resource-card" target="_blank" rel="noreferrer">
              <div className="sd-resource-top">
                <span
                  className="sd-resource-tag"
                  style={{ color: r.tagColor, background: r.tagColor + "1a" }}>
                  {r.tag}
                </span>
                <Ico d={D.external} size={12} color="var(--sd-muted)" />
              </div>
              <div className="sd-resource-title">{r.title}</div>
              <div className="sd-resource-desc">{r.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </ModalBackdrop>
  );
}

/* ═══════════════════════════════
   3. GIFT BEME (DONATE) MODAL
═══════════════════════════════ */
const PRESETS = [10, 20, 50, 100];

function GiftBemeModal({ onClose, user }) {
  const [preset, setPreset] = useState(null);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [phase, setPhase] = useState("form"); // "form" | "redirecting"

  const finalAmount = custom ? parseInt(custom, 10) : preset;

  const handleDonate = async () => {
    if (!finalAmount || finalAmount < 1) {
      setErr("Please select or enter a donation amount.");
      return;
    }
    if (!user?.email) { setErr("Please sign in to donate."); return; }
    setErr(""); setLoading(true);

    try {
      // Write pending record to Firestore first
      const docRef = await addDoc(collection(db, "donations"), {
        amount: finalAmount,
        message: message.trim() || null,
        donorId: user.uid,
        donorEmail: user.email,
        status: "pending",
        reference: null,
        createdAt: serverTimestamp(),
      });

      // Initialize Paystack payment
      const res = await fetch(
        "https://beme-market-1.onrender.com/api/payments/initialize",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            amount: finalAmount * 100, // pesewas
            metadata: {
              type: "donation",
              message: message.trim() || "",
              donorId: user.uid,
              donationDocId: docRef.id,
            },
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Payment initialization failed.");

      const url =
        data?.data?.authorization_url ||
        data?.authorization_url;
      if (!url) throw new Error("No payment URL received from server.");

      setPhase("redirecting");
      setTimeout(() => { window.location.href = url; }, 1400);
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <ModalBackdrop onClose={phase === "redirecting" ? undefined : onClose}>
      <div className="sd-modal-header">
        <div className="sd-modal-title">
          <Ico d={D.gift} size={17} color="var(--sd-accent)" />
          Gift Beme
        </div>
        {phase !== "redirecting" && (
          <button className="sd-modal-close" onClick={onClose}>
            <Ico d={D.close} size={15} />
          </button>
        )}
      </div>

      <div className="sd-modal-body">
        {phase === "form" && (
          <>
            <div className="sd-gift-hero">
              <div className="sd-gift-heart-wrap">
                <Ico d={D.heart} size={28} color="#e11d48" sw={1.5} />
              </div>
              <div className="sd-gift-title">Support Beme</div>
              <div className="sd-gift-sub">
                Your contribution helps keep the platform free and growing for small businesses across Ghana.
              </div>
            </div>

            <div className="sd-form-group">
              <label className="sd-label">Choose Amount (GHS)</label>
              <div className="sd-amount-grid">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    className={`sd-amount-btn${preset === p && !custom ? " active" : ""}`}
                    onClick={() => { setPreset(p); setCustom(""); }}>
                    GHS {p}
                  </button>
                ))}
              </div>
              <input
                className="sd-input"
                type="number"
                placeholder="Or enter a custom amount…"
                min="1"
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setPreset(null); }}
                style={{ marginTop: 8 }}
              />
            </div>

            <div className="sd-form-group">
              <label className="sd-label">Message (Optional)</label>
              <textarea
                className="sd-textarea"
                rows={3}
                placeholder="Leave an encouraging message for the Beme team…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ minHeight: 72 }}
              />
            </div>

            {err && <div className="sd-modal-err">{err}</div>}

            <button
              className="sd-btn sd-btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleDonate}
              disabled={loading}>
              {loading
                ? "Processing…"
                : <>
                    <Ico d={D.heart} size={13} />
                    {finalAmount ? `Donate GHS ${finalAmount}` : "Donate"}
                  </>}
            </button>

            <div className="sd-gift-secure-note">
              Secured by Paystack · All contributions are voluntary and non-refundable
            </div>
          </>
        )}

        {phase === "redirecting" && (
          <div className="sd-modal-success-view">
            <div className="sd-modal-success-icon" style={{ background: "rgba(124,58,237,0.1)" }}>
              <Ico d={D.external} size={28} color="var(--sd-accent)" sw={2} />
            </div>
            <div className="sd-modal-success-title">Redirecting to Paystack…</div>
            <div className="sd-modal-success-sub">
              Completing your donation of <strong>GHS {finalAmount}</strong>. Do not close this tab.
            </div>
            <div className="sd-gift-spinner" />
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
}

/* ═══════════════════════════════
   4. LOGOUT SHEET
═══════════════════════════════ */
function LogoutSheet({ onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleLogout = async () => {
    setLoading(true);
    await logout().catch(console.error);
    navigate("/");
  };

  return (
    <div className="sd-sheet-backdrop" onClick={onClose}>
      <div className="sd-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sd-sheet-handle" />
        <div className="sd-sheet-body">
          <div className="sd-sheet-icon-wrap">
            <Ico d={D.logout} size={22} color="var(--sd-danger)" />
          </div>
          <div className="sd-sheet-title">Sign out of Beme?</div>
          <div className="sd-sheet-sub">
            You'll be returned to the homepage. Your store stays live and orders keep coming in.
          </div>
          <div className="sd-sheet-actions">
            <button
              className="sd-btn sd-btn-secondary"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={onClose}
              disabled={loading}>
              Cancel
            </button>
            <button
              className="sd-btn sd-btn-danger"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={handleLogout}
              disabled={loading}>
              {loading ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   MAIN DROPDOWN EXPORT
═══════════════════════════════ */
export default function TopbarDropdown({ user, subscriptionPlan, onTabChange }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null); // "help" | "learn" | "gift" | "logout"
  const wrapRef = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const keyHandler = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  const openModal = (m) => { setModal(m); setOpen(false); };
  const closeModal = () => setModal(null);

  const planLabel = subscriptionPlan
    ? subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1)
    : "Basic";

  const initial = (user?.displayName || user?.email || "S")[0].toUpperCase();

  const ITEMS = [
    {
      id: "settings",
      icon: D.settings,
      label: "Settings",
      action: () => { onTabChange("security"); setOpen(false); },
    },
    {
      id: "help",
      icon: D.help,
      label: "Get Help",
      action: () => openModal("help"),
    },
    {
      id: "upgrade",
      icon: D.star,
      label: "Upgrade Plan",
      badge: planLabel,
      action: () => { onTabChange("subscription"); setOpen(false); },
    },
    {
      id: "learn",
      icon: D.book,
      label: "Learn More",
      action: () => openModal("learn"),
    },
    {
      id: "gift",
      icon: D.gift,
      label: "Gift Beme",
      action: () => openModal("gift"),
    },
    {
      id: "logout",
      icon: D.logout,
      label: "Log Out",
      action: () => openModal("logout"),
      danger: true,
    },
  ];

  return (
    <div className="sd-dd-wrap" ref={wrapRef}>
      {/* Avatar trigger */}
      <button
        className={`sd-avatar-btn${open ? " sd-avatar-btn--open" : ""}`}
        title={user?.displayName || user?.email}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true">
        {initial}
      </button>

      {/* Dropdown card */}
      {open && (
        <div className="sd-dd" role="menu">
          {/* User email header */}
          <div className="sd-dd-header">
            <div className="sd-dd-email">{user?.email || "—"}</div>
          </div>

          {/* Menu items — no dividers */}
          {ITEMS.map((item) => (
            <button
              key={item.id}
              className={`sd-dd-item${item.danger ? " danger" : ""}`}
              onClick={item.action}
              role="menuitem">
              <span className="sd-dd-item-icon">
                <Ico d={item.icon} size={15} />
              </span>
              <span className="sd-dd-item-label">{item.label}</span>
              {item.badge && (
                <span className="sd-dd-plan-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {modal === "help"   && <GetHelpModal   onClose={closeModal} user={user} />}
      {modal === "learn"  && <LearnMoreModal  onClose={closeModal} />}
      {modal === "gift"   && <GiftBemeModal   onClose={closeModal} user={user} />}
      {modal === "logout" && <LogoutSheet     onClose={closeModal} />}
    </div>
  );
}
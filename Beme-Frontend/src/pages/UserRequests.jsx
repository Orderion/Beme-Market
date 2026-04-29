// src/pages/UserRequests.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProductRequests, getStatusLabel, getStatusClass } from "../hooks/useProductRequests";
import ProductRequestModal from "../components/productRequest/ProductRequestModal";
import ChatPanel from "../components/productRequest/ChatPanel";
import { subscribeToUnreadCount } from "../services/productRequestService";
import "./UserRequests.css";

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5"  y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 0.25s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    icon: "📋",
    title: "Submit a request",
    desc: "Tell us what product you're looking for — include a description, budget, and a reference image if you have one.",
  },
  {
    icon: "🔍",
    title: "We source it",
    desc: "Our team searches for the product. Status changes to Sourcing while we work on it.",
  },
  {
    icon: "💬",
    title: "Chat for updates",
    desc: "Use the chat on each request to ask questions or give more details. We'll reply directly.",
  },
  {
    icon: "🛍️",
    title: "Order when ready",
    desc: "Once sourced, you'll get a notification and an exclusive link to order — available for 7 days.",
  },
];

function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="ur-howto">
      <button
        type="button"
        className="ur-howto-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ur-howto-toggle-label">
          <span className="ur-howto-toggle-icon">✦</span>
          How product requests work
        </span>
        <IconChevron open={open} />
      </button>

      {open && (
        <div className="ur-howto-body">
          <div className="ur-howto-steps">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className="ur-howto-step">
                <div className="ur-howto-step-num">
                  <span className="ur-howto-step-emoji">{step.icon}</span>
                </div>
                <div>
                  <p className="ur-howto-step-title">{step.title}</p>
                  <p className="ur-howto-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="ur-howto-note">
            <strong>🔒 Sourced products are exclusive to you.</strong>{" "}
            When we find your product, it's linked to your account only and expires after 7 days.
            Other customers won't see it.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="ur-list">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ur-skel-card">
          <div className="ur-skel-icon" />
          <div className="ur-skel-lines">
            <div className="ur-skel-line ur-skel-line--title" />
            <div className="ur-skel-line ur-skel-line--full" />
            <div className="ur-skel-line ur-skel-line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── REQUEST CARD ─────────────────────────────────────────────────────────────
function RequestCard({ request, currentUser }) {
  const navigate    = useNavigate();
  const isAvailable = request.status === "available";
  const statusClass = getStatusClass(request.status);
  const statusLabel = getStatusLabel(request.status);

  const [chatOpen, setChatOpen] = useState(false);
  const [unread,   setUnread]   = useState(0);

  // ── Real-time unread badge ──
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeToUnreadCount(request.id, currentUser.uid, setUnread);
    return unsub;
  }, [request.id, currentUser?.uid]);

  // ── Mark messages read when chat opens ──
  useEffect(() => {
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  const createdAt = request.createdAt?.toDate?.()
    ? request.createdAt.toDate().toLocaleDateString("en-GH", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

  // ── Expiry badge for available requests ──
  const isExpired = (() => {
    if (!isAvailable || !request.expiresAt) return false;
    const exp = typeof request.expiresAt.toDate === "function"
      ? request.expiresAt.toDate()
      : new Date(request.expiresAt);
    return exp < new Date();
  })();

  function handleViewProduct() {
    if (request.offeredProductId && !isExpired) navigate(`/product/${request.offeredProductId}`);
  }

  function handleOrderNow() {
    if (request.offeredProductId && !isExpired) {
      navigate(`/checkout?productId=${request.offeredProductId}&qty=1&source=request`);
    }
  }

  return (
    <div className={`ur-card${isAvailable && !isExpired ? " ur-card--available" : ""}`}>

      {/* ── Top ── */}
      <div className="ur-card-top">
        <div className={`ur-card-icon${isAvailable && !isExpired ? " ur-card-icon--available" : ""}`}>
          <IconBox />
        </div>

        <div className="ur-card-info">
          <p className="ur-card-name">{request.productName}</p>
          <p className="ur-card-desc">{request.description}</p>
          <div className="ur-card-meta">
            {request.category && (
              <span className="ur-meta-pill">{request.category}</span>
            )}
            {request.preferredBudget && (
              <span className="ur-meta-pill">
                GH₵ {Number(request.preferredBudget).toLocaleString()}
              </span>
            )}
            <span className="ur-meta-pill">{createdAt}</span>
          </div>
        </div>

        <span className={`ur-status ur-status--${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {/* ── Sourced-for-you badge ── */}
      {isAvailable && !isExpired && (
        <div className="ur-sourced-badge">
          <span className="ur-sourced-badge-icon">✦</span>
          Sourced exclusively for you
          {request.expiresAt && (() => {
            const exp = typeof request.expiresAt.toDate === "function"
              ? request.expiresAt.toDate()
              : new Date(request.expiresAt);
            const daysLeft = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
            return daysLeft > 0 ? (
              <span className="ur-sourced-badge-expiry">
                · Expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </span>
            ) : null;
          })()}
        </div>
      )}

      {/* ── Expired notice ── */}
      {isAvailable && isExpired && (
        <div className="ur-expired-notice">
          This product link has expired. Contact support to renew.
        </div>
      )}

      {/* ── Admin note ── */}
      {request.adminResponse && (
        <p className="ur-admin-note">
          Admin note: {request.adminResponse}
        </p>
      )}

      {/* ── CTA — only if available and not expired ── */}
      {isAvailable && !isExpired && request.offeredProductId && (
        <div className="ur-card-cta">
          <button type="button" className="ur-btn-view" onClick={handleViewProduct}>
            View product
          </button>
          <button type="button" className="ur-btn-order" onClick={handleOrderNow}>
            Order now
          </button>
        </div>
      )}

      {/* ── Chat toggle ── */}
      <div className="ur-card-chat-row">
        <button
          type="button"
          className={`ur-chat-btn${chatOpen ? " ur-chat-btn--open" : ""}`}
          onClick={() => setChatOpen((v) => !v)}
        >
          <IconChat />
          {chatOpen ? "Close chat" : "Chat with us"}
          {!chatOpen && unread > 0 && (
            <span className="ur-chat-badge">{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      </div>

      {/* ── Chat panel ── */}
      {chatOpen && (
        <ChatPanel
          requestId={request.id}
          currentUser={currentUser}
          currentUserRole="customer"
        />
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function UserRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requests, loading, error } = useUserProductRequests();
  const [modalOpen, setModalOpen] = useState(false);

  // ── Compute counts ──
  const counts = requests.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; },
    { pending: 0, sourcing: 0, available: 0, rejected: 0 }
  );

  // ── Not logged in ──
  if (!user) {
    return (
      <div className="ur-page">
        <div className="ur-topbar">
          <div className="ur-topbar-inner">
            <button type="button" className="ur-back-btn" onClick={() => navigate(-1)}>
              <IconBack />
            </button>
            <h1 className="ur-topbar-title">My Requests</h1>
          </div>
        </div>
        <div className="ur-content-wrap">
          <div className="ur-login-prompt">
            <p>Please log in to view your product requests.</p>
            <button type="button" className="ur-login-btn" onClick={() => navigate("/login")}>
              Log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ur-page">

      {/* ── Top bar ── */}
      <div className="ur-topbar">
        <div className="ur-topbar-inner">
          <button type="button" className="ur-back-btn" onClick={() => navigate(-1)}>
            <IconBack />
          </button>
          <h1 className="ur-topbar-title">My Requests</h1>
          <button
            type="button"
            className="ur-request-btn"
            onClick={() => setModalOpen(true)}
          >
            <IconPlus /> New request
          </button>
        </div>
      </div>

      {/* ── Centered content ── */}
      <div className="ur-body">
        <div className="ur-content-wrap">

          {/* ── How it works ── */}
          <HowItWorks />

          {/* ── Summary strip ── */}
          {!loading && requests.length > 0 && (
            <div className="ur-summary">
              <div className="ur-sum-card">
                <span className="ur-sum-label">Total</span>
                <span className="ur-sum-val">{requests.length}</span>
              </div>
              <div className="ur-sum-card">
                <span className="ur-sum-label">Pending</span>
                <span className="ur-sum-val ur-sum-val--amber">{counts.pending + counts.sourcing}</span>
              </div>
              <div className="ur-sum-card">
                <span className="ur-sum-label">Available</span>
                <span className="ur-sum-val ur-sum-val--green">{counts.available}</span>
              </div>
              <div className="ur-sum-card">
                <span className="ur-sum-label">Rejected</span>
                <span className="ur-sum-val ur-sum-val--red">{counts.rejected}</span>
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {loading && <Skeleton />}

          {/* ── Error ── */}
          {!loading && error && (
            <div style={{
              padding: "14px 16px",
              borderRadius: "14px",
              background: "rgba(217,79,79,0.07)",
              border: "1px solid rgba(217,79,79,0.18)",
              fontSize: "13px",
              fontWeight: 600,
              color: "#d94f4f",
              fontFamily: "var(--font-main)",
            }}>
              {error}
            </div>
          )}

          {/* ── Empty ── */}
          {!loading && !error && requests.length === 0 && (
            <div className="ur-empty">
              <div className="ur-empty-icon">
                <IconSearch />
              </div>
              <p className="ur-empty-title">No requests yet</p>
              <p className="ur-empty-sub">
                Can't find a product? Submit a request and we'll source it for you.
              </p>
              <button
                type="button"
                className="ur-empty-btn"
                onClick={() => setModalOpen(true)}
              >
                Request a product
              </button>
            </div>
          )}

          {/* ── List ── */}
          {!loading && !error && requests.length > 0 && (
            <div className="ur-list">
              {requests.map((req) => (
                <RequestCard key={req.id} request={req} currentUser={user} />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <ProductRequestModal onClose={() => setModalOpen(false)} />
      )}

    </div>
  );
}
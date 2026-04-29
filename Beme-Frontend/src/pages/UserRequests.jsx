// src/pages/UserRequests.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProductRequests, getStatusLabel, getStatusClass } from "../hooks/useProductRequests";
import ProductRequestModal from "../components/productRequest/ProductRequestModal";
import ChatPanel from "../components/productRequest/ChatPanel";
import { subscribeToUnreadCount } from "../services/productRequestService";
import "./UserRequests.css";

// ─── ICONS ────────────────────────────────────────────────────────────────────
function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconXCircle() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function IconMagnify() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconMessageSquare() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconShoppingBag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function IconAlertTriangle() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconChevronDown({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    Icon: IconClipboard,
    title: "Submit a Request",
    desc: "Describe what you're looking for — product name, budget, and an optional reference image.",
  },
  {
    Icon: IconMagnify,
    title: "We Source It",
    desc: "Our team searches for your product. Status updates to Sourcing while we work.",
  },
  {
    Icon: IconMessageSquare,
    title: "Chat for Updates",
    desc: "Use the built-in chat to ask questions or share more details. We reply directly.",
  },
  {
    Icon: IconShoppingBag,
    title: "Order When Ready",
    desc: "Once sourced, get an exclusive link to order — available for 7 days.",
  },
];

function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`ur-howto${open ? " ur-howto--open" : ""}`}>
      <button type="button" className="ur-howto-toggle" onClick={() => setOpen(v => !v)}>
        <span className="ur-howto-toggle-label">
          <span className="ur-howto-badge">Guide</span>
          How product requests work
        </span>
        <IconChevronDown open={open} />
      </button>

      <div className="ur-howto-body">
        <div className="ur-howto-steps">
          {HOW_STEPS.map(({ Icon, title, desc }, i) => (
            <div key={i} className="ur-howto-step">
              <div className="ur-howto-step-num">
                <span className="ur-howto-step-index">{i + 1}</span>
                <div className="ur-howto-step-icon-wrap">
                  <Icon />
                </div>
              </div>
              <p className="ur-howto-step-title">{title}</p>
              <p className="ur-howto-step-desc">{desc}</p>
            </div>
          ))}
        </div>
        <div className="ur-howto-note">
          <IconStar />
          <span>
            <strong>Sourced products are exclusive to you.</strong> When we find your item, it's linked to your account only and expires after 7 days.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── FILTER TABS ──────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "sourcing",  label: "Sourcing" },
  { key: "available", label: "Available" },
  { key: "rejected",  label: "Rejected" },
];

function FilterTabs({ active, counts, onChange }) {
  return (
    <div className="ur-tabs-wrap">
      <div className="ur-tabs">
        {FILTER_TABS.map(({ key, label }) => {
          const count = key === "all"
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : (counts[key] || 0);
          return (
            <button
              key={key}
              type="button"
              className={`ur-tab${active === key ? " ur-tab--active" : ""}`}
              onClick={() => onChange(key)}
            >
              {label}
              {count > 0 && <span className="ur-tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="ur-list">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ur-skel-card">
          <div className="ur-skel-thumb" />
          <div className="ur-skel-lines">
            <div className="ur-skel-line ur-skel-line--title" />
            <div className="ur-skel-line ur-skel-line--full" />
            <div className="ur-skel-line ur-skel-line--short" />
            <div className="ur-skel-pills">
              <div className="ur-skel-pill" />
              <div className="ur-skel-pill" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── REQUEST CARD ─────────────────────────────────────────────────────────────
const STATUS_STEPS = ["pending", "sourcing", "available"];

function StatusProgress({ status }) {
  if (status === "rejected") {
    return (
      <div className="ur-status-rejected">
        <IconXCircle />
        Not fulfilled
      </div>
    );
  }
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="ur-progress">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className={`ur-progress-step${i <= currentIdx ? " ur-progress-step--done" : ""}${i === currentIdx ? " ur-progress-step--active" : ""}`}>
          <div className="ur-progress-dot" />
          {i < STATUS_STEPS.length - 1 && <div className="ur-progress-line" />}
        </div>
      ))}
      <span className="ur-progress-label">{getStatusLabel(status)}</span>
    </div>
  );
}

function ExpiryBadge({ expiresAt }) {
  const exp = typeof expiresAt?.toDate === "function"
    ? expiresAt.toDate()
    : new Date(expiresAt);
  const daysLeft = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 2;

  if (daysLeft <= 0) return null;

  return (
    <div className={`ur-expiry-badge${isUrgent ? " ur-expiry-badge--urgent" : ""}`}>
      <IconClock />
      <span>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>
      {isUrgent && <span className="ur-expiry-pulse" />}
    </div>
  );
}

function RequestCard({ request, currentUser }) {
  const navigate = useNavigate();
  const isAvailable = request.status === "available";

  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeToUnreadCount(request.id, currentUser.uid, setUnread);
    return unsub;
  }, [request.id, currentUser?.uid]);

  useEffect(() => {
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  const createdAt = request.createdAt?.toDate?.()
    ? request.createdAt.toDate().toLocaleDateString("en-GH", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

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

  const cardClass = [
    "ur-card",
    isAvailable && !isExpired ? "ur-card--available" : "",
    request.status === "rejected" ? "ur-card--rejected" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cardClass}>

      {/* ── Top strip ── */}
      <div className="ur-card-header">
        <div className="ur-card-thumb">
          {request.imageUrl
            ? <img src={request.imageUrl} alt={request.productName} className="ur-card-thumb-img" />
            : <IconBox />
          }
        </div>

        <div className="ur-card-info">
          <p className="ur-card-name">{request.productName}</p>
          <p className="ur-card-desc">{request.description}</p>
          <div className="ur-card-meta">
            {request.category && <span className="ur-meta-pill">{request.category}</span>}
            {request.preferredBudget && (
              <span className="ur-meta-pill ur-meta-pill--budget">
                GH₵ {Number(request.preferredBudget).toLocaleString()}
              </span>
            )}
            <span className="ur-meta-pill">{createdAt}</span>
          </div>
        </div>

        {/* Status */}
        <div className="ur-card-status-col">
          <StatusProgress status={request.status} />
        </div>
      </div>

      {/* ── Available: sourced banner ── */}
      {isAvailable && !isExpired && (
        <div className="ur-sourced-banner">
          <div className="ur-sourced-banner-left">
            <span className="ur-sourced-dot" />
            <span>Sourced exclusively for you</span>
          </div>
          {request.expiresAt && <ExpiryBadge expiresAt={request.expiresAt} />}
        </div>
      )}

      {/* ── Expired ── */}
      {isAvailable && isExpired && (
        <div className="ur-expired-strip">
          <IconAlertTriangle />
          This product link has expired. Contact support to renew.
        </div>
      )}

      {/* ── Admin note ── */}
      {request.adminResponse && (
        <div className="ur-admin-note">
          <span className="ur-admin-label">Note</span>
          {request.adminResponse}
        </div>
      )}

      {/* ── CTA ── */}
      {isAvailable && !isExpired && request.offeredProductId && (
        <div className="ur-card-cta">
          <button type="button" className="ur-btn-order" onClick={handleOrderNow}>
            Order now
          </button>
          <button type="button" className="ur-btn-view" onClick={handleViewProduct}>
            View product
          </button>
        </div>
      )}

      {/* ── Chat row ── */}
      <div className="ur-card-footer">
        <button
          type="button"
          className={`ur-chat-btn${chatOpen ? " ur-chat-btn--open" : ""}`}
          onClick={() => setChatOpen(v => !v)}
        >
          <IconChat />
          {chatOpen ? "Close chat" : "Chat with us"}
          {!chatOpen && unread > 0 && (
            <span className="ur-chat-badge">{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      </div>

      {chatOpen && (
        <div className="ur-chat-panel-wrap">
          <ChatPanel
            requestId={request.id}
            currentUser={currentUser}
            currentUserRole="customer"
          />
        </div>
      )}
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ onRequest }) {
  return (
    <div className="ur-empty">
      <div className="ur-empty-art">
        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="ur-empty-svg">
          <rect x="30" y="40" width="140" height="100" rx="14" fill="currentColor" opacity="0.05" />
          <rect x="44" y="54" width="112" height="72" rx="10" fill="currentColor" opacity="0.05" />
          <rect x="58" y="70" width="42" height="40" rx="8" fill="currentColor" opacity="0.08" />
          <rect x="110" y="74" width="34" height="8" rx="4" fill="currentColor" opacity="0.1" />
          <rect x="110" y="88" width="26" height="6" rx="3" fill="currentColor" opacity="0.08" />
          <rect x="110" y="100" width="22" height="6" rx="3" fill="currentColor" opacity="0.06" />
          <circle cx="150" cy="42" r="20" fill="currentColor" opacity="0.06" />
          <line x1="144" y1="42" x2="156" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
          <line x1="150" y1="36" x2="150" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
        </svg>
      </div>
      <p className="ur-empty-title">No requests yet</p>
      <p className="ur-empty-sub">Can't find a product in our store? Submit a request and we'll source it exclusively for you.</p>
      <button type="button" className="ur-empty-btn" onClick={onRequest}>
        <IconPlus /> Make your first request
      </button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function UserRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requests, loading, error } = useUserProductRequests();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const counts = useMemo(() => requests.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; },
    { pending: 0, sourcing: 0, available: 0, rejected: 0 }
  ), [requests]);

  const filtered = useMemo(() =>
    activeFilter === "all" ? requests : requests.filter(r => r.status === activeFilter),
    [requests, activeFilter]
  );

  if (!user) {
    return (
      <div className="ur-page">
        <div className="ur-topbar">
          <div className="ur-topbar-inner">
            <button type="button" className="ur-back-btn" onClick={() => navigate(-1)}><IconBack /></button>
            <h1 className="ur-topbar-title">My Requests</h1>
          </div>
        </div>
        <div className="ur-body">
          <div className="ur-login-prompt">
            <p>Please log in to view your product requests.</p>
            <button type="button" className="ur-login-btn" onClick={() => navigate("/login")}>Log in</button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.displayName?.split(" ")[0] || "there";

  return (
    <div className="ur-page">

      {/* ── Topbar ── */}
      <div className="ur-topbar">
        <div className="ur-topbar-inner">
          <button type="button" className="ur-back-btn" onClick={() => navigate(-1)}><IconBack /></button>
          <h1 className="ur-topbar-title">My Requests</h1>
          <button type="button" className="ur-request-btn" onClick={() => setModalOpen(true)}>
            <IconPlus /> New request
          </button>
        </div>
      </div>

      <div className="ur-body">

        {/* ── Hero ── */}
        <div className="ur-hero">
          <div className="ur-hero-text">
            <p className="ur-hero-greeting">Hello, {displayName}</p>
            <h2 className="ur-hero-title">Your Product Requests</h2>
            <p className="ur-hero-sub">Can't find what you're looking for? We'll source it — just for you.</p>
          </div>
          <div className="ur-hero-stat">
            <span className="ur-hero-stat-num">{requests.length}</span>
            <span className="ur-hero-stat-label">Total requests</span>
          </div>
        </div>

        {/* ── How it works ── */}
        <HowItWorks />

        {/* ── Summary ── */}
        {!loading && requests.length > 0 && (
          <div className="ur-summary">
            {[
              { label: "Pending",   val: counts.pending,   color: "amber", Icon: IconTrendUp },
              { label: "Sourcing",  val: counts.sourcing,  color: "blue",  Icon: IconMagnify },
              { label: "Available", val: counts.available, color: "green", Icon: IconCheckCircle },
              { label: "Rejected",  val: counts.rejected,  color: "red",   Icon: IconXCircle },
            ].map(({ label, val, color, Icon }) => (
              <button
                key={label}
                type="button"
                className={`ur-sum-card ur-sum-card--${color}${activeFilter === label.toLowerCase() ? " ur-sum-card--active" : ""}`}
                onClick={() => setActiveFilter(f => f === label.toLowerCase() ? "all" : label.toLowerCase())}
              >
                <div className="ur-sum-icon-wrap">
                  <Icon />
                </div>
                <span className="ur-sum-val">{val}</span>
                <span className="ur-sum-label">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Filter tabs ── */}
        {!loading && requests.length > 0 && (
          <FilterTabs active={activeFilter} counts={counts} onChange={setActiveFilter} />
        )}

        {/* ── Loading ── */}
        {loading && <Skeleton />}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="ur-error-strip">
            <IconAlertTriangle />
            {error}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && requests.length === 0 && (
          <EmptyState onRequest={() => setModalOpen(true)} />
        )}

        {/* ── Filtered empty ── */}
        {!loading && !error && requests.length > 0 && filtered.length === 0 && (
          <div className="ur-filter-empty">
            <IconLayers />
            <span>No {activeFilter} requests</span>
          </div>
        )}

        {/* ── List ── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="ur-list">
            {filtered.map((req) => (
              <RequestCard key={req.id} request={req} currentUser={user} />
            ))}
          </div>
        )}

      </div>

      {/* ── Floating CTA ── */}
      <button type="button" className="ur-fab" onClick={() => setModalOpen(true)}>
        <IconPlus />
        <span>Request product</span>
      </button>

      {/* ── Modal ── */}
      {modalOpen && <ProductRequestModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
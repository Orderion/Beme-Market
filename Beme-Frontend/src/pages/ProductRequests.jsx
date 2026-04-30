// src/pages/ProductRequests.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminProductRequests, getStatusLabel, getStatusClass } from "../hooks/useProductRequests";
import ChatPanel from "../components/productRequest/ChatPanel";
import { subscribeToUnreadCount } from "../services/productRequestService";
import "./ProductRequests.css";

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconInbox() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IconGHS() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
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

function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
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

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
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

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ─── FILTERS ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { value: null,        label: "All" },
  { value: "pending",   label: "Pending" },
  { value: "sourcing",  label: "Sourcing" },
  { value: "available", label: "Available" },
  { value: "rejected",  label: "Rejected" },
];

// ─── ADMIN GUIDE ─────────────────────────────────────────────────────────────
function AdminGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`pr-guide${open ? " pr-guide--open" : ""}`}>
      <button type="button" className="pr-guide-toggle" onClick={() => setOpen(v => !v)}>
        <span className="pr-guide-toggle-label">
          <span className="pr-guide-badge">Admin</span>
          How to fulfil a product request
        </span>
        <IconChevronDown open={open} />
      </button>

      <div className="pr-guide-body">
        <div className="pr-guide-inner">
          <ol className="pr-guide-steps">
            <li>
              <strong>Mark as Sourcing</strong> — click "Mark sourcing" so the customer knows you're working on it. Chat with them if you need more details.
            </li>
            <li>
              <strong>Add the product to your Products collection</strong> in Firestore/your admin panel. Set these extra fields on the product:
              <div className="pr-guide-code">
                <code>isCustomRequest: <span className="kw">true</span></code>
                <code>allowedUserId: <span className="str">"&lt;customer's userId&gt;"</span></code>
                <code>expiresAt: <span className="str">Timestamp (e.g. +7 days from now)</span></code>
              </div>
              <p className="pr-guide-note">
                These flags make the product private — only the intended customer can see it. The product auto-hides after the expiry date.
              </p>
            </li>
            <li>
              <strong>Copy the product's Firestore document ID</strong> (or its full URL — the system extracts the ID automatically).
            </li>
            <li>
              <strong>Click "Link product"</strong>, paste the ID, add an optional note, then confirm. The customer is notified immediately.
            </li>
          </ol>
          <div className="pr-guide-tip">
            <IconInfo />
            <span><strong>Tip:</strong> Use the chat on each request to communicate with the customer at any stage — clarify specs, share an ETA, or let them know the product is ready.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="pr-skel-card">
      <div className="pr-skel-top">
        <div className="pr-skel-avatar" />
        <div className="pr-skel-lines">
          <div className="pr-skel-line pr-skel-line--title" />
          <div className="pr-skel-line pr-skel-line--short" />
        </div>
        <div className="pr-skel-badge" />
      </div>
      <div className="pr-skel-line pr-skel-line--full" />
      <div className="pr-skel-line pr-skel-line--full" style={{ width: "80%" }} />
      <div className="pr-skel-pills">
        <div className="pr-skel-pill" />
        <div className="pr-skel-pill" />
      </div>
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:   { label: "Pending",   cls: "amber" },
    sourcing:  { label: "Sourcing",  cls: "blue"  },
    available: { label: "Available", cls: "green" },
    rejected:  { label: "Rejected",  cls: "red"   },
  };
  const cfg = map[status] || { label: status, cls: "muted" };
  return (
    <span className={`pr-status pr-status--${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── REQUEST CARD ─────────────────────────────────────────────────────────────
function RequestCard({ request, onChangeStatus, updating, currentUser }) {
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [productId,    setProductId]    = useState(request.offeredProductId || "");
  const [adminNote,    setAdminNote]    = useState(request.adminResponse || "");
  const [working,      setWorking]      = useState(false);
  const [chatOpen,     setChatOpen]     = useState(false);
  const [unread,       setUnread]       = useState(0);

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

  async function handleAction(status, extras = {}) {
    setWorking(true);
    try {
      await onChangeStatus(request.id, status, extras);
    } finally {
      setWorking(false);
      setShowLinkForm(false);
    }
  }

  async function handleLinkSubmit() {
    if (!productId.trim()) return;
    await handleAction("available", {
      offeredProductId: productId.trim(),
      adminResponse:    adminNote.trim() || null,
    });
  }

  const isBusy = working || updating;

  return (
    <div className="pr-card" id={`req-${request.id}`}>

      {/* ── Header ── */}
      <div className="pr-card-header">
        <div className="pr-card-avatar">
          <IconUser />
        </div>

        <div className="pr-card-info">
          <p className="pr-card-name">{request.productName}</p>
          <p className="pr-card-email">{request.userEmail}</p>
        </div>

        <div className="pr-card-header-right">
          <StatusBadge status={request.status} />
          {request.referenceImageUrl && (
            <img
              src={request.referenceImageUrl}
              alt="Reference"
              className="pr-card-img"
            />
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="pr-card-body">
        <p className="pr-card-desc">{request.description}</p>

        <div className="pr-card-meta">
          {request.category && (
            <span className="pr-meta-pill">
              <IconTag /> {request.category}
            </span>
          )}
          {request.preferredBudget && (
            <span className="pr-meta-pill pr-meta-pill--budget">
              <IconGHS /> GH₵ {Number(request.preferredBudget).toLocaleString()}
            </span>
          )}
          <span className="pr-meta-pill">{createdAt}</span>
          {request.userId && (
            <span className="pr-meta-pill pr-meta-pill--id">
              UID: {request.userId.slice(0, 10)}…
            </span>
          )}
        </div>
      </div>

      {/* ── Admin note ── */}
      {request.adminResponse && (
        <div className="pr-admin-note">
          <span className="pr-admin-label">Note</span>
          {request.adminResponse}
        </div>
      )}

      {/* ── Linked product ── */}
      {request.offeredProductId && (
        <div className="pr-linked-product">
          <IconLink />
          <span>Linked product: <code>{request.offeredProductId}</code></span>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="pr-card-actions">

        {/* Mark sourcing */}
        {request.status === "pending" && (
          <button
            type="button"
            className="pr-action-btn pr-action-btn--outline"
            disabled={isBusy}
            onClick={() => handleAction("sourcing")}
          >
            {working ? <span className="pr-spinner pr-spinner--dark" /> : <>Mark sourcing</>}
          </button>
        )}

        {/* Link product */}
        {(request.status === "pending" || request.status === "sourcing") && (
          <button
            type="button"
            className={`pr-action-btn pr-action-btn--green${showLinkForm ? " pr-action-btn--active" : ""}`}
            disabled={isBusy}
            onClick={() => setShowLinkForm(v => !v)}
          >
            <IconLink />
            {showLinkForm ? "Cancel" : "Link product"}
          </button>
        )}

        {/* Reject */}
        {(request.status === "pending" || request.status === "sourcing") && (
          <button
            type="button"
            className="pr-action-btn pr-action-btn--red"
            disabled={isBusy}
            onClick={() => handleAction("rejected")}
          >
            {working ? <span className="pr-spinner" /> : <><IconX /> Reject</>}
          </button>
        )}

        {/* Re-open */}
        {request.status === "rejected" && (
          <button
            type="button"
            className="pr-action-btn pr-action-btn--outline"
            disabled={isBusy}
            onClick={() => handleAction("pending")}
          >
            <IconRefresh /> Re-open
          </button>
        )}

        {/* Done */}
        {request.status === "available" && (
          <div className="pr-fulfilled-tag">
            <IconCheck />
            Product linked &amp; user notified
          </div>
        )}

        {/* Chat */}
        <button
          type="button"
          className={`pr-chat-btn${chatOpen ? " pr-chat-btn--open" : ""}`}
          onClick={() => setChatOpen(v => !v)}
        >
          <IconChat />
          {chatOpen ? "Close chat" : "Chat"}
          {!chatOpen && unread > 0 && (
            <span className="pr-chat-badge">{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      </div>

      {/* ── Link form ── */}
      {showLinkForm && (
        <div className="pr-link-form-wrap">
          <div className="pr-link-form">
            <p className="pr-link-form-title">Link a product to this request</p>

            <div className="pr-link-field">
              <label className="pr-link-label">Product ID or URL</label>
              <input
                className="pr-link-input"
                type="text"
                placeholder="e.g. abc123ProductId or full product URL"
                value={productId}
                onChange={e => setProductId(e.target.value)}
              />
            </div>

            <div className="pr-link-field">
              <label className="pr-link-label">Admin note (optional)</label>
              <input
                className="pr-link-input"
                type="text"
                placeholder="e.g. Sourced from Ghana Electro, 2-day delivery"
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
              />
            </div>

            <div className="pr-link-hint">
              Ensure the product has <code>isCustomRequest: true</code>, <code>allowedUserId: "{request.userId}"</code>, and <code>expiresAt</code> set.
            </div>

            <div className="pr-link-row">
              <button
                type="button"
                className="pr-action-btn pr-action-btn--green"
                style={{ flex: 1 }}
                disabled={!productId.trim() || isBusy}
                onClick={handleLinkSubmit}
              >
                {working ? <span className="pr-spinner" /> : <><IconCheck /> Confirm &amp; notify user</>}
              </button>
              <button
                type="button"
                className="pr-action-btn pr-action-btn--outline"
                onClick={() => setShowLinkForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat panel ── */}
      {chatOpen && currentUser && (
        <div className="pr-chat-panel-wrap">
          <ChatPanel
            requestId={request.id}
            currentUser={currentUser}
            currentUserRole="super_admin"
          />
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProductRequests() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isSuperAdmin, loading: authLoading, user } = useAuth();

  const {
    requests,
    loading,
    updating,
    error,
    changeStatus,
    statusFilter,
    setStatusFilter,
  } = useAdminProductRequests(null);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate("/", { replace: true });
  }, [authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    const id = params.get("id");
    if (!id || loading) return;
    setTimeout(() => {
      const el = document.getElementById(`req-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, [params, loading]);

  const counts = useMemo(() => requests.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; },
    { pending: 0, sourcing: 0, available: 0, rejected: 0 }
  ), [requests]);

  if (authLoading) return null;

  return (
    <div className="pr-page">
      <div className="pr-shell">

        {/* ── Hero ── */}
        <div className="pr-hero">
          <div className="pr-hero-text">
            <p className="pr-hero-eyebrow">Admin Panel</p>
            <h1 className="pr-hero-title">Product Requests</h1>
            <p className="pr-hero-sub">Review and fulfil customer product requests</p>
          </div>
          <div className="pr-hero-stats">
            {[
              { label: "Total",     val: requests.length, Icon: IconUsers,      color: "" },
              { label: "Pending",   val: counts.pending,  Icon: IconTrendUp,    color: "amber" },
              { label: "Available", val: counts.available,Icon: IconCheckCircle,color: "green" },
              { label: "Rejected",  val: counts.rejected, Icon: IconXCircle,    color: "red" },
            ].map(({ label, val, Icon, color }) => (
              <div key={label} className={`pr-hero-stat${color ? ` pr-hero-stat--${color}` : ""}`}>
                <div className="pr-hero-stat-icon"><Icon /></div>
                <span className="pr-hero-stat-val">{val}</span>
                <span className="pr-hero-stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Admin guide ── */}
        <AdminGuide />

        {/* ── Filter tabs ── */}
        <div className="pr-tabs-wrap">
          <div className="pr-tabs">
            {FILTERS.map((f) => {
              const count = f.value === null ? requests.length : (counts[f.value] || 0);
              return (
                <button
                  key={String(f.value)}
                  type="button"
                  className={`pr-tab${statusFilter === f.value ? " pr-tab--active" : ""}`}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                  {count > 0 && <span className="pr-tab-badge">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="pr-error-box">
            <IconXCircle />
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="pr-list">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && requests.length === 0 && (
          <div className="pr-empty">
            <div className="pr-empty-icon"><IconInbox /></div>
            <p className="pr-empty-title">No requests found</p>
            <p className="pr-empty-sub">
              {statusFilter
                ? `No ${getStatusLabel(statusFilter).toLowerCase()} requests at the moment`
                : "No product requests have been submitted yet"}
            </p>
          </div>
        )}

        {/* ── List ── */}
        {!loading && !error && requests.length > 0 && (
          <div className="pr-list">
            {requests.map(req => (
              <RequestCard
                key={req.id}
                request={req}
                onChangeStatus={changeStatus}
                updating={updating}
                currentUser={user}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
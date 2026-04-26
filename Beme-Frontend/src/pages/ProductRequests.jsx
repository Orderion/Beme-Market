// src/pages/ProductRequests.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminProductRequests, getStatusLabel, getStatusClass } from "../hooks/useProductRequests";
import "./ProductRequests.css";

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconInbox() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

function IconGHS() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  );
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const FILTERS = [
  { value: null,        label: "All" },
  { value: "pending",   label: "Pending" },
  { value: "sourcing",  label: "Sourcing" },
  { value: "available", label: "Available" },
  { value: "rejected",  label: "Rejected" },
];

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="pr-skel-card">
      <div className="pr-skel-line pr-skel-line--title" />
      <div className="pr-skel-line pr-skel-line--short" />
      <div className="pr-skel-line pr-skel-line--full" />
      <div className="pr-skel-line pr-skel-line--full" />
    </div>
  );
}

// ─── REQUEST CARD ─────────────────────────────────────────────────────────────
function RequestCard({ request, onChangeStatus, updating }) {
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [productId,    setProductId]    = useState(request.offeredProductId || "");
  const [adminNote,    setAdminNote]    = useState(request.adminResponse || "");
  const [working,      setWorking]      = useState(false);

  const statusClass = getStatusClass(request.status);
  const statusLabel = getStatusLabel(request.status);

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

      {/* ── Top ── */}
      <div className="pr-card-top">
        <div className="pr-card-left">
          <p className="pr-card-name">{request.productName}</p>
          <p className="pr-card-email">{request.userEmail}</p>
          <p className="pr-card-desc">{request.description}</p>

          <div className="pr-card-meta">
            {request.category && (
              <span className="pr-meta-pill">
                <IconTag /> {request.category}
              </span>
            )}
            {request.preferredBudget && (
              <span className="pr-meta-pill">
                <IconGHS /> GH₵ {Number(request.preferredBudget).toLocaleString()}
              </span>
            )}
            <span className="pr-meta-pill">{createdAt}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
          <span className={`pr-status pr-status--${statusClass}`}>
            {statusLabel}
          </span>
          {request.referenceImageUrl && (
            <img
              src={request.referenceImageUrl}
              alt="Reference"
              className="pr-card-img"
            />
          )}
        </div>
      </div>

      {/* ── Admin response ── */}
      {request.adminResponse && (
        <div style={{
          padding: "0 18px 12px",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--muted)",
          fontFamily: "var(--font-main)",
          lineHeight: 1.55,
        }}>
          Note: {request.adminResponse}
        </div>
      )}

      {/* ── Linked product ── */}
      {request.offeredProductId && (
        <div style={{
          padding: "0 18px 12px",
          fontSize: "12px",
          fontWeight: 700,
          color: "#22a058",
          fontFamily: "var(--font-main)",
        }}>
          Linked product ID: {request.offeredProductId}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="pr-card-actions">

        {/* Mark sourcing */}
        {request.status === "pending" && (
          <button
            type="button"
            className="pr-action-btn"
            disabled={isBusy}
            onClick={() => handleAction("sourcing")}
          >
            {working ? <span className="pr-spinner pr-spinner--dark" /> : "Mark sourcing"}
          </button>
        )}

        {/* Link product → available */}
        {(request.status === "pending" || request.status === "sourcing") && (
          <button
            type="button"
            className="pr-action-btn pr-action-btn--green"
            disabled={isBusy}
            onClick={() => setShowLinkForm((v) => !v)}
          >
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
            {working ? <span className="pr-spinner" /> : "Reject"}
          </button>
        )}

        {/* Re-open if rejected */}
        {request.status === "rejected" && (
          <button
            type="button"
            className="pr-action-btn"
            disabled={isBusy}
            onClick={() => handleAction("pending")}
          >
            Re-open
          </button>
        )}

        {/* Already done */}
        {request.status === "available" && (
          <span style={{
            fontSize: "12px", fontWeight: 700,
            color: "#22a058", fontFamily: "var(--font-main)",
          }}>
            ✓ Product linked & user notified
          </span>
        )}
      </div>

      {/* ── Link product form ── */}
      {showLinkForm && (
        <div style={{ padding: "0 18px 18px" }}>
          <div className="pr-link-form">
            <span className="pr-link-label">Paste product ID to link</span>
            <input
              className="pr-link-input"
              type="text"
              placeholder="e.g. abc123ProductId"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />
            <span className="pr-link-label" style={{ marginTop: 2 }}>
              Admin note (optional)
            </span>
            <input
              className="pr-link-input"
              type="text"
              placeholder="e.g. Sourced from Ghana Electro, 2-day delivery"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
            <div className="pr-link-row">
              <button
                type="button"
                className="pr-action-btn pr-action-btn--green"
                style={{ flex: 1 }}
                disabled={!productId.trim() || isBusy}
                onClick={handleLinkSubmit}
              >
                {working
                  ? <span className="pr-spinner" />
                  : "Confirm & notify user"}
              </button>
              <button
                type="button"
                className="pr-link-cancel"
                onClick={() => setShowLinkForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProductRequests() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const { isSuperAdmin, loading: authLoading } = useAuth();

  const {
    requests,
    loading,
    updating,
    error,
    changeStatus,
    statusFilter,
    setStatusFilter,
  } = useAdminProductRequests(null);

  // Guard — only super_admin
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate("/", { replace: true });
  }, [authLoading, isSuperAdmin, navigate]);

  // Scroll to highlighted request from notification
  useEffect(() => {
    const id = params.get("id");
    if (!id || loading) return;
    setTimeout(() => {
      const el = document.getElementById(`req-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, [params, loading]);

  // ── Compute stats ──
  const counts = requests.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; },
    { pending: 0, sourcing: 0, available: 0, rejected: 0 }
  );

  if (authLoading) return null;

  return (
    <div className="pr-page">
      <div className="pr-shell">

        {/* ── Head ── */}
        <div className="pr-head">
          <div className="pr-head-left">
            <h1 className="pr-title">Product Requests</h1>
            <p className="pr-subtitle">
              Review and action customer product requests
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="pr-stats">
          <div className="pr-stat-card">
            <span className="pr-stat-label">Total</span>
            <span className="pr-stat-val">{requests.length}</span>
          </div>
          <div className="pr-stat-card">
            <span className="pr-stat-label">Pending</span>
            <span className="pr-stat-val pr-stat-val--amber">{counts.pending}</span>
          </div>
          <div className="pr-stat-card">
            <span className="pr-stat-label">Available</span>
            <span className="pr-stat-val pr-stat-val--green">{counts.available}</span>
          </div>
          <div className="pr-stat-card">
            <span className="pr-stat-label">Rejected</span>
            <span className="pr-stat-val pr-stat-val--red">{counts.rejected}</span>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="pr-filters">
          {FILTERS.map((f) => {
            const count = f.value === null
              ? requests.length
              : (counts[f.value] || 0);
            return (
              <button
                key={String(f.value)}
                type="button"
                className={`pr-filter-btn${statusFilter === f.value ? " active" : ""}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
                <span className="pr-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Error ── */}
        {error && <div className="pr-error-box">{error}</div>}

        {/* ── Loading ── */}
        {loading && (
          <div className="pr-list">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && requests.length === 0 && (
          <div className="pr-empty">
            <div className="pr-empty-icon">
              <IconInbox />
            </div>
            <p>No requests found</p>
            <p style={{ opacity: 0.6, fontSize: "12px" }}>
              {statusFilter
                ? `No ${getStatusLabel(statusFilter).toLowerCase()} requests at the moment`
                : "No product requests have been submitted yet"}
            </p>
          </div>
        )}

        {/* ── List ── */}
        {!loading && !error && requests.length > 0 && (
          <div className="pr-list">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onChangeStatus={changeStatus}
                updating={updating}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
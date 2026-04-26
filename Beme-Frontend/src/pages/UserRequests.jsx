// src/pages/UserRequests.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProductRequests, getStatusLabel, getStatusClass } from "../hooks/useProductRequests";
import ProductRequestModal from "../components/productRequest/ProductRequestModal";
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
function RequestCard({ request }) {
  const navigate     = useNavigate();
  const isAvailable  = request.status === "available";
  const statusClass  = getStatusClass(request.status);
  const statusLabel  = getStatusLabel(request.status);

  const createdAt = request.createdAt?.toDate?.()
    ? request.createdAt.toDate().toLocaleDateString("en-GH", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

  function handleViewProduct() {
    if (request.offeredProductId) navigate(`/product/${request.offeredProductId}`);
  }

  function handleOrderNow() {
    if (request.offeredProductId) {
      navigate(`/checkout?productId=${request.offeredProductId}&qty=1&source=request`);
    }
  }

  return (
    <div className={`ur-card${isAvailable ? " ur-card--available" : ""}`}>

      {/* ── Top ── */}
      <div className="ur-card-top">
        <div className={`ur-card-icon${isAvailable ? " ur-card-icon--available" : ""}`}>
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

      {/* ── Admin note ── */}
      {request.adminResponse && (
        <p className="ur-admin-note">
          Admin note: {request.adminResponse}
        </p>
      )}

      {/* ── CTA — only if available ── */}
      {isAvailable && request.offeredProductId && (
        <div className="ur-card-cta">
          <button type="button" className="ur-btn-view" onClick={handleViewProduct}>
            View product
          </button>
          <button type="button" className="ur-btn-order" onClick={handleOrderNow}>
            Order now
          </button>
        </div>
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
          <button type="button" className="ur-back-btn" onClick={() => navigate(-1)}>
            <IconBack />
          </button>
          <h1 className="ur-topbar-title">My Requests</h1>
        </div>
        <div className="ur-login-prompt">
          <p>Please log in to view your product requests.</p>
          <button type="button" className="ur-login-btn" onClick={() => navigate("/login")}>
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ur-page">

      {/* ── Top bar ── */}
      <div className="ur-topbar">
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

      <div className="ur-body">

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
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        )}

      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <ProductRequestModal onClose={() => setModalOpen(false)} />
      )}

    </div>
  );
}
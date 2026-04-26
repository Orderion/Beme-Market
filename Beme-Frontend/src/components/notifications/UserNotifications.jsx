// src/components/notifications/UserNotifications.jsx
import { useNavigate } from "react-router-dom";
import { useUserNotifications } from "../../hooks/useNotifications";
import "./UserNotifications.css";

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconPackage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}

function IconGeneric() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getIcon(type) {
  if (type === "product_available") return <IconPackage />;
  return <IconGeneric />;
}

// ─── SKELETON ────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="un-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="un-skel-row">
          <div className="un-skel-icon" />
          <div className="un-skel-lines">
            <div className="un-skel-line" />
            <div className="un-skel-line un-skel-line--short" />
            <div className="un-skel-line un-skel-line--xshort" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
/**
 * UserNotifications
 * Displays real-time notifications for the logged-in customer.
 * For "product_available" type — shows "View Product" + "Order Now" CTAs.
 *
 * Props: none — self-contained via useUserNotifications hook
 */
export default function UserNotifications() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    formatTime,
  } = useUserNotifications();

  // ── Mark read then navigate to product ──
  async function handleViewProduct(notif) {
    if (!notif.isRead) await markRead(notif.id);
    if (notif.productId) navigate(`/product/${notif.productId}`);
  }

  // ── Mark read then go straight to checkout ──
  async function handleOrderNow(notif) {
    if (!notif.isRead) await markRead(notif.id);
    if (notif.productId) {
      navigate(`/checkout?productId=${notif.productId}&qty=1&source=request`);
    }
  }

  // ── Mark read for generic notifications ──
  async function handleGenericClick(notif) {
    if (!notif.isRead) await markRead(notif.id);
  }

  const isProductAvailable = (type) => type === "product_available";

  return (
    <div className="un-wrap">

      {/* ── Header ── */}
      <div className="un-header">
        <h2 className="un-title">
          Notifications
          {unreadCount > 0 && (
            <span className="un-badge">{unreadCount}</span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            className="un-mark-all"
            onClick={markAllRead}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && <Skeleton />}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="un-error">{error}</div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && notifications.length === 0 && (
        <div className="un-empty">
          <div className="un-empty-icon">
            <IconBell />
          </div>
          <p>No notifications yet</p>
          <p style={{ opacity: 0.6, fontSize: "12px" }}>
            We'll let you know when your requested products are available
          </p>
        </div>
      )}

      {/* ── List ── */}
      {!loading && !error && notifications.length > 0 && (
        <div className="un-list">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`un-item${!notif.isRead ? " un-item--unread" : ""}`}
              onClick={
                !isProductAvailable(notif.type)
                  ? () => handleGenericClick(notif)
                  : undefined
              }
              style={!isProductAvailable(notif.type) ? { cursor: "pointer" } : undefined}
            >
              {!notif.isRead && <span className="un-dot" />}

              {/* Top row — icon + text */}
              <div className="un-item-top">
                <div className="un-icon-wrap">
                  {getIcon(notif.type)}
                </div>

                <div className="un-body">
                  <span className="un-msg">{notif.message}</span>
                  {notif.subMessage && (
                    <span className="un-sub">{notif.subMessage}</span>
                  )}
                  <span className="un-time">
                    {notif.createdAt ? formatTime(notif.createdAt) : ""}
                  </span>
                </div>
              </div>

              {/* CTA buttons — only for product_available */}
              {isProductAvailable(notif.type) && notif.productId && (
                <div className="un-actions">
                  <button
                    type="button"
                    className="un-btn-view"
                    onClick={() => handleViewProduct(notif)}
                  >
                    View product
                  </button>
                  <button
                    type="button"
                    className="un-btn-order"
                    onClick={() => handleOrderNow(notif)}
                  >
                    Order now
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
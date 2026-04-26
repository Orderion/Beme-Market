// src/components/notifications/AdminNotifications.jsx
import { useNavigate } from "react-router-dom";
import { useAdminNotifications } from "../../hooks/useNotifications";
import "./AdminNotifications.css";

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconBox() {
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}

// ─── SKELETON ────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="an-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="an-skel-row">
          <div className="an-skel-icon" />
          <div className="an-skel-lines">
            <div className="an-skel-line" />
            <div className="an-skel-line an-skel-line--short" />
            <div className="an-skel-line an-skel-line--xshort" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
/**
 * AdminNotifications
 * Displays real-time product request notifications for super_admin.
 * Clicking a notification navigates to the request detail in the admin panel.
 *
 * Props: none — self-contained via useAdminNotifications hook
 */
export default function AdminNotifications() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    formatTime,
  } = useAdminNotifications();

  // ── Handle item click ──
  async function handleClick(notif) {
    if (!notif.isRead) await markRead(notif.id);
    if (notif.requestId) {
      navigate(`/admin/product-requests?id=${notif.requestId}`);
    }
  }

  return (
    <div className="an-wrap">
      {/* Header */}
      <div className="an-header">
        <h2 className="an-title">
          Notifications
          {unreadCount > 0 && (
            <span className="an-badge">{unreadCount}</span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            className="an-mark-all"
            onClick={markAllRead}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <Skeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="an-error">{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && notifications.length === 0 && (
        <div className="an-empty">
          <div className="an-empty-icon">
            <IconBell />
          </div>
          <p>No notifications yet</p>
          <p style={{ opacity: 0.6, fontSize: "12px" }}>
            New product requests will appear here
          </p>
        </div>
      )}

      {/* List */}
      {!loading && !error && notifications.length > 0 && (
        <div className="an-list">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              className={`an-item${!notif.isRead ? " an-item--unread" : ""}`}
              onClick={() => handleClick(notif)}
            >
              {!notif.isRead && <span className="an-dot" />}

              <div className="an-icon-wrap">
                <IconBox />
              </div>

              <div className="an-body">
                <span className="an-msg">{notif.message}</span>
                {notif.subMessage && (
                  <span className="an-sub">{notif.subMessage}</span>
                )}
                <span className="an-time">
                  {notif.createdAt ? formatTime(notif.createdAt) : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
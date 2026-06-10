// src/pages/dashboard/DashboardNotifications.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeToSellerNotifications,
  markSellerNotifRead,
  markAllSellerNotifsRead,
  NOTIF_META,
  fmtNotifTime,
} from "../../services/sellerNotificationService";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {String(d).split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  bell:   "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 0 1-3.46 0",
  check:  "M20 6L9 17l-5-5",
  empty:  "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 0 1-3.46 0",
};

const FILTERS = ["all", "unread", "orders", "payments", "system"];

export default function DashboardNotifications() {
  const { user }       = useAuth();
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [marking,  setMarking]  = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const unsub = subscribeToSellerNotifications(
      user.uid,
      data => { setNotifs(data); setLoading(false); },
      ()   => setLoading(false),
    );
    return unsub;
  }, [user?.uid]);

  const filtered = notifs.filter(n => {
    if (filter === "unread")   return !n.read;
    if (filter === "orders")   return ["new_order","order_paid","order_status"].includes(n.type);
    if (filter === "payments") return ["withdrawal_approved","withdrawal_rejected","order_paid"].includes(n.type);
    if (filter === "system")   return ["announcement","system","subscription_expiry","store_verified","store_suspended"].includes(n.type);
    return true;
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  const handleRead = async (n) => {
    if (n.read) return;
    await markSellerNotifRead(user.uid, n.id);
  };

  const handleMarkAll = async () => {
    if (marking || !unreadCount) return;
    setMarking(true);
    await markAllSellerNotifsRead(user.uid);
    setMarking(false);
  };

  return (
    <div className="dn-root">
      {/* Header */}
      <div className="dn-header">
        <div>
          <div className="dn-title">Notifications</div>
          <div className="dn-sub">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </div>
        </div>
        {unreadCount > 0 && (
          <button className="dn-mark-all" onClick={handleMarkAll} disabled={marking}>
            <Ico d={IC.check} size={12} /> {marking ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="dn-filters">
        {FILTERS.map(f => (
          <button key={f} className={`dn-filter${filter === f ? " dn-filter--active" : ""}`}
            onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="dn-list">
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="dn-skel" style={{ height:72, marginBottom:8, borderRadius:12 }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="dn-empty">
            <Ico d={IC.bell} size={36} color="var(--sd-border)" sw={1.2} />
            <div className="dn-empty-title">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </div>
            <div className="dn-empty-sub">
              {filter === "unread"
                ? "You're all caught up."
                : "Order updates, payments and announcements appear here."}
            </div>
          </div>
        ) : (
          filtered.map(n => {
            const meta = NOTIF_META[n.type] || NOTIF_META.system;
            return (
              <div key={n.id}
                className={`dn-item${n.read ? "" : " dn-item--unread"}`}
                onClick={() => handleRead(n)}>
                <div className="dn-item-icon" style={{ background: `${meta.color}15` }}>
                  <span style={{ fontSize:18 }}>{meta.icon}</span>
                </div>
                <div className="dn-item-body">
                  <div className="dn-item-title">{n.title}</div>
                  {n.body && <div className="dn-item-body-text">{n.body}</div>}
                  <div className="dn-item-time">{fmtNotifTime(n.createdAt)}</div>
                </div>
                {!n.read && <div className="dn-unread-dot" style={{ background: meta.color }} />}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .dn-root {
          font-family: var(--sd-font,'DM Sans',system-ui,sans-serif);
          color: var(--sd-text); background: transparent;
          max-width: 680px;
        }
        .dn-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 16px; gap: 12px;
        }
        .dn-title {
          font-size: 11px; font-weight: 700; color: var(--sd-muted);
          text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px;
        }
        .dn-sub { font-size: 12px; color: var(--sd-muted); }
        .dn-mark-all {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 8px; border: 1px solid var(--sd-border);
          background: var(--sd-white); color: var(--sd-text);
          font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
          transition: all 0.12s; white-space: nowrap;
        }
        .dn-mark-all:hover:not(:disabled) { border-color: var(--sd-accent); color: var(--sd-accent); }
        .dn-mark-all:disabled { opacity: 0.5; cursor: default; }

        .dn-filters {
          display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;
        }
        .dn-filter {
          padding: 5px 12px; border-radius: 20px; border: 1px solid var(--sd-border);
          background: var(--sd-white); color: var(--sd-muted);
          font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
          transition: all 0.12s; text-transform: capitalize;
        }
        .dn-filter--active {
          background: var(--sd-accent); color: #fff; border-color: var(--sd-accent);
        }

        .dn-list { display: flex; flex-direction: column; gap: 6px; }

        .dn-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px; border-radius: 12px; cursor: pointer;
          border: 1px solid var(--sd-border); background: var(--sd-white);
          transition: background 0.12s; position: relative;
        }
        .dn-item:hover { background: var(--sd-border-light); }
        .dn-item--unread { background: var(--sd-accent-dim); border-color: rgba(124,58,237,0.15); }
        .dn-item--unread:hover { background: rgba(124,58,237,0.08); }

        .dn-item-icon {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .dn-item-body { flex: 1; min-width: 0; }
        .dn-item-title {
          font-size: 13px; font-weight: 700; color: var(--sd-text);
          margin-bottom: 3px; line-height: 1.4;
        }
        .dn-item-body-text {
          font-size: 12px; color: var(--sd-muted); line-height: 1.5;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 4px;
        }
        .dn-item-time { font-size: 11px; color: var(--sd-muted); font-weight: 600; }

        .dn-unread-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
        }

        .dn-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 56px 24px; text-align: center;
        }
        .dn-empty-title { font-size: 15px; font-weight: 800; color: var(--sd-text); margin-top: 8px; }
        .dn-empty-sub   { font-size: 13px; color: var(--sd-muted); max-width: 280px; line-height: 1.6; }

        .dn-skel {
          background: var(--sd-border-light);
          background-image: linear-gradient(90deg, var(--sd-border-light) 25%, var(--sd-border) 50%, var(--sd-border-light) 75%);
          background-size: 600px 100%;
          animation: dn-shimmer 1.4s ease infinite;
        }
        @keyframes dn-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: calc(600px + 100%) 0; }
        }
      `}</style>
    </div>
  );
}
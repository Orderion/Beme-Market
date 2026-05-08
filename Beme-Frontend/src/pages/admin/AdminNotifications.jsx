// src/pages/admin/AdminNotifications.jsx
// Admin page to compose & send notifications to users.
// Matches the dark AdminDashboard shell — same sidebar, topbar, DM Sans.
// Images uploaded via Cloudinary. Link URL field added to payload.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  uploadNotificationImage,
  sendNotificationToAllUsers,
  sendNotificationToSelectedUsers,
  sendNotificationToUser,
  fetchAllCustomers,
  subscribeToSentNotifications,
  logSentNotification,
} from "../../services/notificationService";
import "./AdminNotifications.css";

/* ═══════════════════════════════════════
   ICON HELPER
═══════════════════════════════════════ */
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  dashboard:  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  orders:     "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  review:     "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  analytics:  "M18 20V10 M12 20V4 M6 20v-6",
  payouts:    "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  shops:      "M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9",
  accounts:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  homepage:   "M4 5h16 M4 10h16 M4 15h7 M14 15l2 2 4-4",
  products:   "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
  media:      "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7",
  support:    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  notif:      "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  logout:     "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  menu:       "M3 12h18 M3 6h18 M3 18h18",
  close:      "M18 6L6 18 M6 6l12 12",
  send:       "M22 2L11 13 M22 2L15 22 9 13 2 9l20-7z",
  users:      "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  upload:     "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  check:      "M20 6L9 17l-5-5",
  history:    "M12 8v4l3 3 M3.05 11a9 9 0 1 0 .5-3.5",
  search:     "M21 21l-4.35-4.35 M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0",
  broadcast:  "M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10",
  link:       "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  externalLink: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3",
};

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard",         path: "/admin" },
  { key: "orders",    label: "Orders",            path: "/admin-orders" },
  { key: "review",    label: "Review Queue",      path: "/admin-review-queue" },
  { key: "analytics", label: "Analytics",         path: "/analytics" },
  { key: "payouts",   label: "Payout Requests",   path: "/payout-requests" },
  { key: "shops",     label: "Shop Applications", path: "/shop-applications" },
  { key: "accounts",  label: "Account Mgmt",      path: "/account-management" },
  { key: "homepage",  label: "Homepage Editor",   path: "/admin/homepage" },
  { key: "products",  label: "Product Requests",  path: "/admin/product-requests" },
  { key: "media",     label: "Media Manager",     path: "/admin/media" },
  { key: "support",   label: "Support Inbox",     path: "/admin/support" },
  { key: "notif",     label: "Notifications",     path: "/admin/notifications" },
];

/* ═══════════════════════════════════════
   NAV ITEM
═══════════════════════════════════════ */
function NavItem({ item, isActive, collapsed, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onClick(item.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? item.label : undefined}
      className={[
        "an-nav-btn",
        isActive  ? "an-nav-btn--active"    : "",
        hovered   ? "an-nav-btn--hover"     : "",
        collapsed ? "an-nav-btn--collapsed" : "",
      ].join(" ")}
    >
      <span className="an-nav-icon"><Icon d={ICONS[item.key]} size={17} /></span>
      {!collapsed && <span className="an-nav-label">{item.label}</span>}
      {isActive && !collapsed && <span className="an-nav-dot" />}
    </button>
  );
}

/* ═══════════════════════════════════════
   LOGO
═══════════════════════════════════════ */
const Logo = () => (
  <svg width={26} height={26} viewBox="0 0 32 32">
    <path d="M6 8 L16 4 L26 8 L26 24 L16 28 L6 24 Z" fill="#e67e22" opacity=".9" />
    <path d="M6 8 L16 12 L16 28 L6 24 Z"             fill="#c0580c" />
    <path d="M26 8 L16 12 L16 28 L26 24 Z"           fill="#f0a050" opacity=".7" />
  </svg>
);

/* ═══════════════════════════════════════
   FORMAT SENT TIME
═══════════════════════════════════════ */
function formatSentTime(ts) {
  if (!ts) return "—";
  let ms;
  if (typeof ts?.toMillis === "function")   ms = ts.toMillis();
  else if (ts instanceof Date)              ms = ts.getTime();
  else if (typeof ts?.seconds === "number") ms = ts.seconds * 1000;
  else return "—";
  return new Date(ms).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ═══════════════════════════════════════
   USER PICKER MODAL
═══════════════════════════════════════ */
function UserPickerModal({ customers, selected, onToggle, onDone, onClose }) {
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => {
    const name  = String(c.displayName || c.email || "").toLowerCase();
    const email = String(c.email || "").toLowerCase();
    const q     = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="an-picker-backdrop" onClick={onClose}>
      <div className="an-picker" onClick={(e) => e.stopPropagation()}>
        <div className="an-picker__head">
          <span className="an-picker__title">Select Users</span>
          <button className="an-icon-btn" onClick={onClose}>
            <Icon d={ICONS.close} size={17} />
          </button>
        </div>
        <div className="an-picker__search-wrap">
          <Icon d={ICONS.search} size={15} />
          <input
            className="an-picker__search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <p className="an-picker__count">
          {selected.length} selected · {filtered.length} shown
        </p>
        <div className="an-picker__list">
          {filtered.length === 0 ? (
            <p className="an-picker__empty">No users found.</p>
          ) : (
            filtered.map((c) => {
              const isOn   = selected.includes(c.uid);
              const name   = c.displayName || c.email || c.uid;
              const initials = String(name).charAt(0).toUpperCase();
              return (
                <button
                  key={c.uid}
                  className={`an-picker__row ${isOn ? "an-picker__row--on" : ""}`}
                  onClick={() => onToggle(c.uid)}
                >
                  <div className="an-picker__avatar">{initials}</div>
                  <div className="an-picker__info">
                    <span className="an-picker__name">{name}</span>
                    {c.email && c.displayName && (
                      <span className="an-picker__email">{c.email}</span>
                    )}
                  </div>
                  <div className={`an-picker__check ${isOn ? "an-picker__check--on" : ""}`}>
                    {isOn && <Icon d={ICONS.check} size={12} />}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <button
          className="an-picker__done"
          onClick={onDone}
          disabled={selected.length === 0}
        >
          Confirm {selected.length > 0 ? `(${selected.length})` : ""} →
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function AdminNotifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const [tab,         setTab]         = useState("compose");

  /* ── form fields ── */
  const [title,      setTitle]      = useState("");
  const [body,       setBody]       = useState("");
  const [linkUrl,    setLinkUrl]    = useState("");
  const [linkLabel,  setLinkLabel]  = useState("");
  const [target,     setTarget]     = useState("all");
  const [singleUid,  setSingleUid]  = useState("");

  /* ── image ── */
  const [imageFile,      setImageFile]      = useState(null);
  const [imagePreview,   setImagePreview]   = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading,      setUploading]      = useState(false);
  const fileRef = useRef(null);

  /* ── user picker ── */
  const [showPicker,       setShowPicker]       = useState(false);
  const [customers,        setCustomers]        = useState([]);
  const [customersLoaded,  setCustomersLoaded]  = useState(false);
  const [selectedUids,     setSelectedUids]     = useState([]);

  /* ── send state ── */
  const [sending, setSending] = useState(false);
  const [toast,   setToast]   = useState(null);

  /* ── history ── */
  const [history,        setHistory]        = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const active = location.pathname;

  /* ── load customers ── */
  const loadCustomers = useCallback(async () => {
    if (customersLoaded) return;
    try {
      const list = await fetchAllCustomers();
      setCustomers(list);
      setCustomersLoaded(true);
    } catch (e) {
      console.error("fetchAllCustomers:", e);
    }
  }, [customersLoaded]);

  /* ── history subscription ── */
  useEffect(() => {
    if (tab !== "history") return;
    setHistoryLoading(true);
    const unsub = subscribeToSentNotifications(
      (data) => { setHistory(data); setHistoryLoading(false); },
      (err)  => { console.error(err); setHistoryLoading(false); }
    );
    return () => unsub();
  }, [tab]);

  /* ── image select ── */
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadProgress(0);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ── toast ── */
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── SEND ── */
  const handleSend = async () => {
    if (!title.trim()) { showToast("err", "Title is required.");          return; }
    if (!body.trim())  { showToast("err", "Message body is required.");   return; }
    if (target === "select" && selectedUids.length === 0) {
      showToast("err", "Please select at least one user."); return;
    }
    if (target === "single" && !singleUid.trim()) {
      showToast("err", "Please enter a user UID."); return;
    }

    /* basic URL validation if provided */
    if (linkUrl.trim()) {
      try { new URL(linkUrl.trim()); }
      catch { showToast("err", "Link URL is invalid. Include https://"); return; }
    }

    setSending(true);
    try {
      /* ── Upload image to Cloudinary first ── */
      let imageUrl = null;
      if (imageFile) {
        setUploading(true);
        try {
          imageUrl = await uploadNotificationImage(imageFile, (pct) => {
            setUploadProgress(pct);
          });
        } catch (uploadErr) {
          showToast("err", `Image upload failed: ${uploadErr.message}`);
          setSending(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const payload = {
        title:     title.trim(),
        body:      body.trim(),
        imageUrl,
        linkUrl:   linkUrl.trim()   || null,
        linkLabel: linkLabel.trim() || null,
        type:      "admin",
      };

      if (target === "all") {
        await sendNotificationToAllUsers(payload);
        await logSentNotification({ ...payload, targetType: "all", targetCount: "all" });
      } else if (target === "select") {
        await sendNotificationToSelectedUsers(selectedUids, payload);
        await logSentNotification({ ...payload, targetType: "select", targetCount: selectedUids.length });
      } else {
        await sendNotificationToUser(singleUid.trim(), payload);
        await logSentNotification({ ...payload, targetType: "single", targetUid: singleUid.trim() });
      }

      /* reset */
      setTitle(""); setBody("");
      setLinkUrl(""); setLinkLabel("");
      setSelectedUids([]); setSingleUid("");
      clearImage();
      showToast("ok", "Notification sent successfully!");
    } catch (e) {
      console.error("handleSend:", e);
      showToast("err", "Failed to send. Please try again.");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const toggleUser  = (uid) =>
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );

  const openPicker = async () => {
    await loadCustomers();
    setShowPicker(true);
  };

  /* ═══════════════════════════════════
     RENDER
  ═══════════════════════════════════ */
  return (
    <div className="an-root">

      {/* ── Desktop sidebar ── */}
      <aside className={`an-sidebar ${collapsed ? "an-sidebar--collapsed" : "an-sidebar--expanded"}`}>
        <div className={`an-logo-row ${collapsed ? "an-logo-row--collapsed" : ""}`}>
          <Logo />
          {!collapsed && <span className="an-logo-text">BEME MARKET</span>}
        </div>
        <nav className="an-nav">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.key} item={item}
              isActive={active === item.path}
              collapsed={collapsed} onClick={navigate} />
          ))}
        </nav>
        <div className="an-sidebar-footer">
          <button
            className={`an-footer-btn ${collapsed ? "an-footer-btn--collapsed" : ""}`}
            onClick={() => setCollapsed((c) => !c)}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.8}>
              <path d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7M19 19l-7-7 7-7"} />
            </svg>
            {!collapsed && <span>Collapse</span>}
          </button>
          <button
            className={`an-footer-btn ${collapsed ? "an-footer-btn--collapsed" : ""}`}
            onClick={() => navigate("/")}>
            <Icon d={ICONS.logout} size={17} />
            {!collapsed && <span>Exit Admin</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer ── */}
      {sidebarOpen && (
        <>
          <div className="an-drawer-overlay" onClick={() => setSidebarOpen(false)} />
          <div className="an-drawer an-drawer--open">
            <div className="an-logo-row" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Logo /><span className="an-logo-text">BEME MARKET</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="an-icon-btn">
                <Icon d={ICONS.close} size={18} />
              </button>
            </div>
            <nav className="an-nav" style={{ overflowY: "auto" }}>
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.key} item={item}
                  isActive={active === item.path}
                  collapsed={false}
                  onClick={(path) => { navigate(path); setSidebarOpen(false); }} />
              ))}
            </nav>
            <div className="an-sidebar-footer">
              <button className="an-footer-btn" onClick={() => navigate("/")}>
                <Icon d={ICONS.logout} size={17} /><span>Exit Admin</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Main ── */}
      <div className="an-main">
        <header className="an-topbar">
          <div className="an-topbar-left">
            <button className="an-hamburger an-icon-btn" onClick={() => setSidebarOpen(true)}>
              <Icon d={ICONS.menu} size={22} />
            </button>
            <div>
              <div className="an-topbar-eyebrow">Admin</div>
              <div className="an-topbar-title">Notifications</div>
            </div>
          </div>
          <div className="an-topbar-right">
            <button onClick={() => window.open("/", "_blank")} className="an-preview-btn">
              Preview ↗
            </button>
            <div className="an-avatar">A</div>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className={`an-toast an-toast--${toast.type}`}>
            <Icon d={toast.type === "ok" ? ICONS.check : ICONS.close} size={15} />
            {toast.msg}
          </div>
        )}

        <div className="an-content">

          {/* Tabs */}
          <div className="an-tabs">
            <button className={`an-tab ${tab === "compose" ? "an-tab--active" : ""}`}
              onClick={() => setTab("compose")}>
              <Icon d={ICONS.send} size={14} /> Compose
            </button>
            <button className={`an-tab ${tab === "history" ? "an-tab--active" : ""}`}
              onClick={() => setTab("history")}>
              <Icon d={ICONS.history} size={14} /> Sent History
            </button>
          </div>

          {/* ═══ COMPOSE TAB ═══ */}
          {tab === "compose" && (
            <div className="an-compose-grid">

              {/* ── Left: Form ── */}
              <div className="an-panel">
                <p className="an-panel-title">New Notification</p>

                {/* Title */}
                <div className="an-field">
                  <label className="an-label">Title <span className="an-req">*</span></label>
                  <input className="an-input" type="text"
                    placeholder="e.g. Flash Sale — 50% off today!"
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    maxLength={80} disabled={sending} />
                  <span className="an-charcount">{title.length}/80</span>
                </div>

                {/* Body */}
                <div className="an-field">
                  <label className="an-label">Message <span className="an-req">*</span></label>
                  <textarea className="an-textarea"
                    placeholder="Write your notification message here…"
                    value={body} onChange={(e) => setBody(e.target.value)}
                    maxLength={400} rows={5} disabled={sending} />
                  <span className="an-charcount">{body.length}/400</span>
                </div>

                {/* ── LINK SECTION ── */}
                <div className="an-field">
                  <label className="an-label">
                    <Icon d={ICONS.link} size={12} />
                    &nbsp;Attach a Link <span className="an-optional">(optional)</span>
                  </label>
                  <input className="an-input" type="url"
                    placeholder="https://bememarket.com/shop or any URL"
                    value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                    disabled={sending} />
                  {/* Quick link presets */}
                  <div className="an-link-presets">
                    <span className="an-link-presets__label">Quick:</span>
                    {[
                      { label: "Shop",        url: "/shop"        },
                      { label: "Offers",      url: "/offers"      },
                      { label: "Flash Deals", url: "/flash-deals" },
                      { label: "Orders",      url: "/orders"      },
                    ].map((preset) => (
                      <button key={preset.label}
                        className="an-link-preset-btn"
                        onClick={() => setLinkUrl(preset.url)}
                        disabled={sending} type="button">
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Link button label */}
                {linkUrl.trim() && (
                  <div className="an-field">
                    <label className="an-label">Link Button Label</label>
                    <input className="an-input" type="text"
                      placeholder='e.g. "Shop Now", "View Deals", "See Order"'
                      value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)}
                      maxLength={40} disabled={sending} />
                    <span className="an-charcount">{linkLabel.length}/40</span>
                  </div>
                )}

                {/* Image upload */}
                <div className="an-field">
                  <label className="an-label">
                    Attach Image <span className="an-optional">(optional — Cloudinary)</span>
                  </label>

                  {imagePreview ? (
                    <div className="an-img-preview">
                      <img src={imagePreview} alt="Preview" />
                      {/* Upload progress bar */}
                      {uploading && (
                        <div className="an-upload-progress">
                          <div
                            className="an-upload-progress__bar"
                            style={{ width: `${uploadProgress}%` }}
                          />
                          <span className="an-upload-progress__label">
                            Uploading… {uploadProgress}%
                          </span>
                        </div>
                      )}
                      {!uploading && (
                        <button className="an-img-clear" onClick={clearImage} disabled={sending}>
                          <Icon d={ICONS.close} size={14} /> Remove
                        </button>
                      )}
                    </div>
                  ) : (
                    <button className="an-upload-btn"
                      onClick={() => fileRef.current?.click()}
                      disabled={sending}>
                      <Icon d={ICONS.upload} size={18} />
                      <span>Click to upload image</span>
                      <span className="an-upload-hint">PNG, JPG, WebP — uploaded to Cloudinary</span>
                    </button>
                  )}

                  <input ref={fileRef} type="file" accept="image/*"
                    style={{ display: "none" }} onChange={handleImageChange} />
                </div>

                {/* Send button */}
                <button className="an-send-btn" onClick={handleSend}
                  disabled={sending || uploading || !title.trim() || !body.trim()}>
                  {uploading ? (
                    <><span className="an-spinner" /> Uploading image… {uploadProgress}%</>
                  ) : sending ? (
                    <><span className="an-spinner" /> Sending…</>
                  ) : (
                    <><Icon d={ICONS.send} size={16} /> Send Notification</>
                  )}
                </button>
              </div>

              {/* ── Right: Target + Preview ── */}
              <div className="an-side-col">

                {/* Target selector */}
                <div className="an-panel">
                  <p className="an-panel-title">Send To</p>

                  {/* All users */}
                  <button
                    className={`an-target-opt ${target === "all" ? "an-target-opt--on" : ""}`}
                    onClick={() => setTarget("all")} disabled={sending}>
                    <div className="an-target-icon">
                      <Icon d={ICONS.broadcast} size={18} />
                    </div>
                    <div className="an-target-text">
                      <span className="an-target-label">All Users</span>
                      <span className="an-target-sub">Broadcast to every customer</span>
                    </div>
                    <div className={`an-target-radio ${target === "all" ? "an-target-radio--on" : ""}`} />
                  </button>

                  {/* Select users */}
                  <button
                    className={`an-target-opt ${target === "select" ? "an-target-opt--on" : ""}`}
                    onClick={() => setTarget("select")} disabled={sending}>
                    <div className="an-target-icon">
                      <Icon d={ICONS.users} size={18} />
                    </div>
                    <div className="an-target-text">
                      <span className="an-target-label">Select Users</span>
                      <span className="an-target-sub">Pick specific customers</span>
                    </div>
                    <div className={`an-target-radio ${target === "select" ? "an-target-radio--on" : ""}`} />
                  </button>

                  {target === "select" && (
                    <div className="an-select-section">
                      <button className="an-pick-btn" onClick={openPicker} disabled={sending}>
                        <Icon d={ICONS.users} size={15} />
                        {selectedUids.length === 0
                          ? "Choose users…"
                          : `${selectedUids.length} user${selectedUids.length > 1 ? "s" : ""} selected`}
                      </button>
                      {selectedUids.length > 0 && (
                        <button className="an-clear-btn"
                          onClick={() => setSelectedUids([])} disabled={sending}>
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  {/* Single UID */}
                  <button
                    className={`an-target-opt ${target === "single" ? "an-target-opt--on" : ""}`}
                    onClick={() => setTarget("single")} disabled={sending}>
                    <div className="an-target-icon">
                      <Icon d={ICONS.send} size={18} />
                    </div>
                    <div className="an-target-text">
                      <span className="an-target-label">Single User UID</span>
                      <span className="an-target-sub">Direct — paste a user ID</span>
                    </div>
                    <div className={`an-target-radio ${target === "single" ? "an-target-radio--on" : ""}`} />
                  </button>

                  {target === "single" && (
                    <input className="an-input an-input--uid" type="text"
                      placeholder="Paste Firebase UID…"
                      value={singleUid} onChange={(e) => setSingleUid(e.target.value)}
                      disabled={sending} />
                  )}
                </div>

                {/* Live preview */}
                <div className="an-panel an-panel--preview">
                  <p className="an-panel-title">Preview</p>
                  <div className="an-preview-card">
                    <div className="an-preview-card__top">
                      <div className="an-preview-card__dot" />
                      <span className="an-preview-card__app">Beme Market</span>
                      <span className="an-preview-card__time">now</span>
                    </div>
                    {imagePreview && (
                      <img className="an-preview-card__img" src={imagePreview} alt="" />
                    )}
                    <p className="an-preview-card__title">
                      {title || "Your notification title…"}
                    </p>
                    <p className="an-preview-card__body">
                      {body || "Your message will appear here. Keep it short and clear."}
                    </p>
                    {/* Link preview */}
                    {linkUrl.trim() && (
                      <div className="an-preview-card__link">
                        <Icon d={ICONS.externalLink} size={12} />
                        <span>{linkLabel.trim() || "Open Link"}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ═══ HISTORY TAB ═══ */}
          {tab === "history" && (
            <div className="an-panel an-panel--history">
              <p className="an-panel-title">Sent Notifications</p>

              {historyLoading ? (
                <div className="an-history-skeletons">
                  {[1, 2, 3].map((n) => <div key={n} className="an-history-skeleton" />)}
                </div>
              ) : history.length === 0 ? (
                <div className="an-empty">
                  <Icon d={ICONS.notif} size={32} />
                  <p>No notifications sent yet.</p>
                </div>
              ) : (
                <div className="an-history-list">
                  {history.map((item) => {
                    const targetLabel =
                      item.targetType === "all"    ? "All users" :
                      item.targetType === "select" ? `${item.targetCount} users` :
                      `UID: ${String(item.targetUid || "").slice(0, 12)}…`;
                    return (
                      <div key={item.id} className="an-history-row">
                        {item.imageUrl && (
                          <img className="an-history-row__img" src={item.imageUrl} alt="" />
                        )}
                        <div className="an-history-row__body">
                          <div className="an-history-row__head">
                            <span className="an-history-row__title">{item.title}</span>
                            <span className="an-history-row__target">{targetLabel}</span>
                          </div>
                          <p className="an-history-row__msg">{item.body}</p>
                          {item.linkUrl && (
                            <a href={item.linkUrl} target="_blank" rel="noreferrer"
                              className="an-history-row__link">
                              <Icon d={ICONS.externalLink} size={11} />
                              {item.linkLabel || item.linkUrl}
                            </a>
                          )}
                          <span className="an-history-row__time">{formatSentTime(item.sentAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Picker Modal */}
      {showPicker && (
        <UserPickerModal
          customers={customers}
          selected={selectedUids}
          onToggle={toggleUser}
          onDone={() => setShowPicker(false)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
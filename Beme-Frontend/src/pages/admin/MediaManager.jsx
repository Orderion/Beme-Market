import { useState, useEffect, useCallback, useRef } from "react";
import "./MediaManager.css";

const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/* ── Helpers ── */
const fmt = (bytes) => {
  if (!bytes && bytes !== 0) return "—";
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(2) + " GB";
  if (bytes >= 1_048_576)     return (bytes / 1_048_576).toFixed(1) + " MB";
  if (bytes >= 1_024)         return (bytes / 1_024).toFixed(0) + " KB";
  return bytes + " B";
};
const fmtDuration = (secs) => {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};
const pct = (used, limit) => (limit ? Math.min(100, (used / limit) * 100) : 0);
const fmtDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const downloadAsset = async (url, filename) => {
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  } catch {
    window.open(url, "_blank");
  }
};

/* ── Icon component matching AdminPanel's Ico ── */
function Ico({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {d.split(" | ").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const I = {
  upload:    "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 | M17 8l-5-5-5 5 | M12 3v12",
  copy:      "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.912 4.895 3 6 3h8c1.105 0 2 .912 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.088 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
  trash:     "M3 6h18 | M8 6V4h8v2 | M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 | M10 11v6 | M14 11v6",
  download:  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 | M7 10l5 5 5-5 | M12 15V3",
  refresh:   "M23 4v6h-6 | M20.49 15a9 9 0 1 1-2.12-9.36L23 10",
  play:      "M5 3l14 9-14 9V3z",
  grid:      "M3 3h7v7H3z | M14 3h7v7h-7z | M3 14h7v7H3z | M14 14h7v7h-7z",
  list:      "M8 6h13 | M8 12h13 | M8 18h13 | M3 6h.01 | M3 12h.01 | M3 18h.01",
  search:    "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  folder:    "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  image:     "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z | M4 22v-7",
  video:     "M23 7l-7 5 7 5V7z | M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  eye:       "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z | M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  check:     "M20 6L9 17l-5-5",
  warn:      "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z | M12 9v4 | M12 17h.01",
  x:         "M18 6L6 18 | M6 6l12 12",
  filter:    "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  sort:      "M3 6h18 | M7 12h10 | M11 18h2",
  analytics: "M18 20V10 | M12 20V4 | M6 20v-6",
  select:    "M9 11l3 3L22 4 | M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  link:      "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 | M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
};

const PER_PAGE = 28;

/* ── Custom Confirm Dialog ── */
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Delete", danger = true }) {
  return (
    <div className="mm-modal-backdrop" onClick={onCancel}>
      <div className="mm-modal" onClick={e => e.stopPropagation()}>
        <div className="mm-modal-head">
          <span className="mm-modal-title">{title}</span>
          <button className="mm-modal-close" onClick={onCancel}><Ico d={I.x} size={14} /></button>
        </div>
        <div className="mm-modal-body">
          <p className="mm-modal-msg">{message}</p>
        </div>
        <div className="mm-modal-footer">
          <button className="mm-btn mm-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className={`mm-btn ${danger ? "mm-btn--danger" : "mm-btn--primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Analytics Mini Panel ── */
function AnalyticsTab({ images, videos, usage }) {
  const allAssets = [
    ...images.map(a => ({ ...a, _type: "image" })),
    ...videos.map(a => ({ ...a, _type: "video" })),
  ];
  const totalSize = allAssets.reduce((s, a) => s + (a.bytes || 0), 0);
  const storageUsed  = usage?.storage?.usage    || 0;
  const storageLimit = usage?.storage?.limit    || 0;
  const storagePct   = pct(storageUsed, storageLimit);
  const bandUsed     = usage?.bandwidth?.usage  || 0;
  const bandLimit    = usage?.bandwidth?.limit  || 0;
  const bandPct      = pct(bandUsed, bandLimit);
  const txUsed       = usage?.transformations?.usage || 0;
  const txLimit      = usage?.transformations?.limit || 0;
  const txPct        = pct(txUsed, txLimit);

  // Format breakdown by format type
  const formatCounts = {};
  allAssets.forEach(a => {
    const f = (a.format || "unknown").toUpperCase();
    formatCounts[f] = (formatCounts[f] || 0) + 1;
  });
  const formatEntries = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);
  const maxFormatCount = Math.max(...formatEntries.map(([, c]) => c), 1);

  // Size distribution
  const sizeGroups = { "<100KB": 0, "100KB-1MB": 0, "1MB-10MB": 0, ">10MB": 0 };
  allAssets.forEach(a => {
    const b = a.bytes || 0;
    if (b < 102400) sizeGroups["<100KB"]++;
    else if (b < 1048576) sizeGroups["100KB-1MB"]++;
    else if (b < 10485760) sizeGroups["1MB-10MB"]++;
    else sizeGroups[">10MB"]++;
  });

  const barColor = (p) => p > 85 ? "#ef4444" : p > 65 ? "#f59e0b" : "#7c3aed";

  const meters = [
    { label: "Storage", pct: storagePct, used: fmt(storageUsed), limit: storageLimit ? fmt(storageLimit) : "Unlimited" },
    { label: "Bandwidth", pct: bandPct, used: fmt(bandUsed), limit: bandLimit ? fmt(bandLimit) : "Unlimited" },
    { label: "Transformations", pct: txPct, used: txUsed.toLocaleString(), limit: txLimit ? txLimit.toLocaleString() : "Unlimited" },
  ];

  return (
    <div className="mm-analytics">
      {/* Stat cards */}
      <div className="mm-an-stats">
        {[
          { label: "Total Files",  value: allAssets.length.toLocaleString() },
          { label: "Images",       value: images.length.toLocaleString() },
          { label: "Videos",       value: videos.length.toLocaleString() },
          { label: "Total Size",   value: fmt(totalSize) },
        ].map(s => (
          <div key={s.label} className="mm-an-stat">
            <div className="mm-an-stat-label">{s.label}</div>
            <div className="mm-an-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mm-an-grid">
        {/* Resource meters */}
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Resource Usage</span></div>
          <div className="ap-card-body">
            {meters.map(m => (
              <div key={m.label} className="mm-meter-row">
                <div className="mm-meter-meta">
                  <span className="mm-meter-label">{m.label}</span>
                  <div className="mm-meter-nums">
                    <span className="mm-meter-used" style={{ color: barColor(m.pct) }}>{m.used}</span>
                    <span className="mm-meter-limit">/ {m.limit}</span>
                  </div>
                </div>
                <div className="mm-meter-track">
                  <div className="mm-meter-fill" style={{ width: `${m.pct}%`, background: barColor(m.pct) }} />
                  {[25, 50, 75].map(t => <div key={t} className="mm-meter-tick" style={{ left: t + "%" }} />)}
                </div>
                {m.pct > 0 && (
                  <div className="mm-meter-badge" style={{ left: `min(${m.pct}%, calc(100% - 40px))`, background: barColor(m.pct) }}>
                    {Math.round(m.pct)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Format breakdown */}
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Format Breakdown</span></div>
          <div className="ap-card-body">
            {formatEntries.length === 0
              ? <div className="ap-empty"><div className="ap-empty-title">No data</div></div>
              : formatEntries.slice(0, 8).map(([fmt, count]) => (
                <div key={fmt} className="mm-fmt-row">
                  <span className="mm-fmt-name">{fmt}</span>
                  <div className="mm-fmt-track">
                    <div className="mm-fmt-fill" style={{ width: `${(count / maxFormatCount) * 100}%` }} />
                  </div>
                  <span className="mm-fmt-count">{count}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Size distribution */}
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Size Distribution</span></div>
          <div className="ap-card-body">
            <div className="mm-an-bars">
              {Object.entries(sizeGroups).map(([label, count]) => {
                const h = allAssets.length > 0 ? Math.max((count / allAssets.length) * 100, count > 0 ? 6 : 0) : 0;
                return (
                  <div key={label} className="mm-an-bar-col" title={`${label}: ${count} files`}>
                    <div className="mm-an-bar-track">
                      <div className="mm-an-bar-fill" style={{ height: `${h}%` }} />
                    </div>
                    <span className="mm-an-bar-label">{label}</span>
                    <span className="mm-an-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upload timeline (last 10 by date) */}
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Recent Uploads</span></div>
          <div style={{ padding: "6px 0" }}>
            {allAssets.slice(0, 6).map(a => (
              <div key={a.public_id} className="mm-an-recent-row">
                <div className="mm-an-recent-thumb">
                  <img
                    src={a._type === "video"
                      ? `https://res.cloudinary.com/${CLOUD}/video/upload/w_60,h_60,c_fill,so_0/${a.public_id}.jpg`
                      : a.secure_url.replace("/upload/", "/upload/w_60,h_60,c_fill/")}
                    alt="" loading="lazy"
                    onError={e => { e.currentTarget.style.opacity = "0.2"; }}
                  />
                </div>
                <div className="mm-an-recent-info">
                  <div className="mm-an-recent-name">{a.public_id.split("/").pop()}</div>
                  <div className="mm-an-recent-meta">{fmt(a.bytes)} · {fmtDate(a.created_at)}</div>
                </div>
                <span className={`ap-badge ${a._type === "video" ? "ap-badge--blue" : "ap-badge--purple"}`} style={{ fontSize: 10 }}>
                  {(a.format || a._type).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function MediaManager() {
  const [images,      setImages]      = useState([]);
  const [videos,      setVideos]      = useState([]);
  const [usage,       setUsage]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [navTab,      setNavTab]      = useState("files"); // "files" | "analytics"
  const [fileTab,     setFileTab]     = useState("all");   // "all" | "images" | "videos"
  const [view,        setView]        = useState("list");
  const [search,      setSearch]      = useState("");
  const [folder,      setFolder]      = useState("");
  const [page,        setPage]        = useState(0);
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState(new Set());
  const [downloading, setDownloading] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [drag,        setDrag]        = useState(false);
  const [selected,    setSelected]    = useState(null);    // detail panel
  const [multiSel,    setMultiSel]    = useState(new Set()); // multi-select keys
  const [multiMode,   setMultiMode]   = useState(false);
  const [confirmDlg,  setConfirmDlg]  = useState(null);   // { title, message, onConfirm }
  const fileRef = useRef();

  const credsOk = Boolean(CLOUD && PRESET);

  /* ── Toast ── */
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Confirm dialog helper (replaces window.confirm) ── */
  const showConfirm = (title, message) =>
    new Promise(resolve => {
      setConfirmDlg({
        title, message,
        onConfirm: () => { setConfirmDlg(null); resolve(true); },
        onCancel:  () => { setConfirmDlg(null); resolve(false); },
      });
    });

  /* ── API ── */
  const apiFetch = useCallback(async (params, options = {}) => {
    const qs  = new URLSearchParams(params).toString();
    const res = await fetch(`/api/cloudinary?${qs}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, []);

  const fetchResourceType = useCallback(async (type) => {
    const data = await apiFetch({ action: "resources", type });
    return data.resources || [];
  }, [apiFetch]);

  const loadAll = useCallback(async () => {
    if (!credsOk) {
      setLoadError("Missing env vars — add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [usageData, imgs, vids] = await Promise.all([
        apiFetch({ action: "usage" }),
        fetchResourceType("image"),
        fetchResourceType("video"),
      ]);
      setUsage(usageData);
      setImages(imgs);
      setVideos(vids);
    } catch (e) {
      setLoadError(e.message);
      notify(e.message, "error");
    }
    setLoading(false);
  }, [apiFetch, credsOk, fetchResourceType]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { setPage(0); }, [fileTab, search, folder]);

  /* ── Derived ── */
  const allAssets = [
    ...images.map(a => ({ ...a, _type: "image" })),
    ...videos.map(a => ({ ...a, _type: "video" })),
  ];
  const baseList =
    fileTab === "images" ? images.map(a => ({ ...a, _type: "image" })) :
    fileTab === "videos" ? videos.map(a => ({ ...a, _type: "video" })) :
    allAssets;

  const filtered = baseList.filter(a => {
    const q = search.toLowerCase();
    return (!q || a.public_id.toLowerCase().includes(q)) &&
           (!folder || (a.folder || "(root)") === folder);
  });

  const slice      = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const folders    = [...new Set(allAssets.map(a => a.folder || "(root)"))].sort();
  const totalSize  = allAssets.reduce((s, a) => s + (a.bytes || 0), 0);
  const storagePct = pct(usage?.storage?.usage || 0, usage?.storage?.limit || 0);

  /* ── Multi-select helpers ── */
  const assetKey = (a) => a.public_id + ":" + a._type;
  const toggleMultiSel = (a) => {
    const k = assetKey(a);
    setMultiSel(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };
  const selectAll = () => {
    setMultiSel(new Set(slice.map(assetKey)));
  };
  const clearSel = () => setMultiSel(new Set());
  const selectedAssets = slice.filter(a => multiSel.has(assetKey(a)));

  /* ── DELETE — fixed: POST with JSON body; action in query only ── */
  const deleteOne = async (publicId, resourceType) => {
    setDeleting(prev => new Set([...prev, publicId]));
    try {
      // Key fix: send as POST to /api/cloudinary?action=delete
      // Body contains the payload — no auth issue because action is the query param
      // and credentials are read server-side from env vars, not from the request body.
      const res = await fetch("/api/cloudinary?action=delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ publicId, resourceType }),
      });

      if (res.status === 401) {
        // Server-side Cloudinary API key/secret env vars are missing
        throw new Error("Server returned 401 — ensure CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are set in your server environment (Render/Vercel), NOT prefixed with VITE_");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const deleted = data.deleted || {};
      const ok = deleted[publicId] === "deleted" || Object.values(deleted).includes("deleted");

      if (ok) {
        if (resourceType === "image") setImages(p => p.filter(a => a.public_id !== publicId));
        else                          setVideos(p => p.filter(a => a.public_id !== publicId));
        if (selected?.public_id === publicId) setSelected(null);
        setMultiSel(prev => { const n = new Set(prev); n.delete(publicId + ":" + resourceType); return n; });
        return true;
      } else {
        throw new Error("Cloudinary returned: " + JSON.stringify(deleted));
      }
    } catch (e) {
      notify("Delete failed: " + e.message, "error");
      return false;
    } finally {
      setDeleting(prev => { const n = new Set(prev); n.delete(publicId); return n; });
    }
  };

  const handleDelete = async (asset) => {
    const name = asset.public_id.split("/").pop();
    const ok = await showConfirm(
      "Delete File",
      `Delete "${name}"?\n\nThis action cannot be undone.`
    );
    if (!ok) return;
    const success = await deleteOne(asset.public_id, asset._type);
    if (success) notify("File deleted successfully");
  };

  const handleDeleteSelected = async () => {
    const count = multiSel.size;
    const ok = await showConfirm(
      "Delete Multiple Files",
      `Delete ${count} selected file${count > 1 ? "s" : ""}?\n\nThis action cannot be undone.`
    );
    if (!ok) return;
    let deleted = 0;
    for (const asset of selectedAssets) {
      const success = await deleteOne(asset.public_id, asset._type);
      if (success) deleted++;
    }
    clearSel();
    if (deleted > 0) notify(`${deleted} file${deleted > 1 ? "s" : ""} deleted`);
  };

  /* ── Download ── */
  const handleDownload = async (asset) => {
    const name     = asset.public_id.split("/").pop();
    const filename = name + "." + (asset.format || (asset._type === "video" ? "mp4" : "jpg"));
    setDownloading(asset.public_id);
    notify("Starting download…");
    await downloadAsset(asset.secure_url, filename);
    setDownloading(null);
  };

  /* ── Upload ── */
  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    let done = 0;
    for (const file of files) {
      const isVid = file.type.startsWith("video/");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", PRESET);
      try {
        const r = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD}/${isVid ? "video" : "image"}/upload`,
          { method: "POST", body: fd }
        );
        const d = await r.json();
        if (d.secure_url) {
          if (isVid) setVideos(p => [{ ...d, _type: "video" }, ...p]);
          else       setImages(p => [{ ...d, _type: "image" }, ...p]);
          done++;
        } else {
          notify("Upload failed: " + (d.error?.message || "unknown"), "error");
        }
      } catch (e) {
        notify("Upload error: " + e.message, "error");
      }
    }
    if (done) {
      notify(`Uploaded ${done} file${done > 1 ? "s" : ""}`);
      try { const u = await apiFetch({ action: "usage" }); setUsage(u); } catch (_) {}
    }
    setUploading(false);
  };

  /* ── Copy ── */
  const copyURL = (url) =>
    navigator.clipboard.writeText(url)
      .then(() => notify("URL copied!"))
      .catch(() => window.prompt("Copy this URL:", url));

  /* ── Thumb ── */
  const thumbURL = (a) =>
    a._type === "video"
      ? `https://res.cloudinary.com/${CLOUD}/video/upload/w_400,h_400,c_fill,so_0/${a.public_id}.jpg`
      : a.secure_url.replace("/upload/", "/upload/w_400,h_400,c_fill/");

  /* ── Render ── */
  return (
    <div className="mm-root">

      {/* Confirm Dialog */}
      {confirmDlg && (
        <ConfirmDialog
          title={confirmDlg.title}
          message={confirmDlg.message}
          onConfirm={confirmDlg.onConfirm}
          onCancel={confirmDlg.onCancel}
          confirmLabel="Delete"
          danger={true}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`mm-toast mm-toast--${toast.type}`}>
          {toast.type === "success"
            ? <Ico d={I.check} size={13} />
            : <Ico d={I.warn}  size={13} />}
          {toast.msg}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="mm-sidebar">
        <div className="mm-logo">
          <div className="mm-logo-icon">M</div>
          <span className="mm-logo-text">MediaVault</span>
        </div>

        <nav className="mm-nav">
          <div className="mm-nav-section-label">Library</div>

          {/* Nav tabs */}
          {[
            { key: "files",     label: "File Manager", icon: I.grid },
            { key: "analytics", label: "Analytics",    icon: I.analytics },
          ].map(t => (
            <button
              key={t.key}
              className={`mm-nav-item${navTab === t.key ? " mm-nav-item--active" : ""}`}
              onClick={() => setNavTab(t.key)}
            >
              <span className="mm-nav-icon"><Ico d={t.icon} size={15} /></span>
              <span className="mm-nav-label">{t.label}</span>
            </button>
          ))}

          {navTab === "files" && (
            <>
              <div className="mm-nav-section-label" style={{ marginTop: "1.25rem" }}>Filter</div>
              {[
                { key: "all",    label: "All Files", icon: I.grid,  count: allAssets.length },
                { key: "images", label: "Images",    icon: I.image, count: images.length },
                { key: "videos", label: "Videos",    icon: I.video, count: videos.length },
              ].map(t => (
                <button
                  key={t.key}
                  className={`mm-nav-item${fileTab === t.key && navTab === "files" ? " mm-nav-item--active" : ""}`}
                  onClick={() => { setFileTab(t.key); setNavTab("files"); }}
                >
                  <span className="mm-nav-icon"><Ico d={t.icon} size={15} /></span>
                  <span className="mm-nav-label">{t.label}</span>
                  {t.count > 0 && <span className="mm-nav-badge">{t.count}</span>}
                </button>
              ))}

              {folders.length > 0 && (
                <>
                  <div className="mm-nav-section-label" style={{ marginTop: "1.25rem" }}>Folders</div>
                  {folders.map(f => (
                    <button
                      key={f}
                      className={`mm-nav-item${folder === f ? " mm-nav-item--active" : ""}`}
                      onClick={() => setFolder(folder === f ? "" : f)}
                    >
                      <span className="mm-nav-icon"><Ico d={I.folder} size={15} /></span>
                      <span className="mm-nav-label mm-nav-folder-name">{f}</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </nav>

        {/* Storage meter */}
        <div className="mm-sidebar-storage">
          <div className="mm-storage-header">
            <span className="mm-storage-title">Storage</span>
            <span className="mm-storage-pct">{Math.round(storagePct)}%</span>
          </div>
          <div className="mm-storage-track">
            <div className="mm-storage-fill" style={{
              width: `${storagePct}%`,
              background: storagePct > 85 ? "#ef4444" : storagePct > 65 ? "#f59e0b" : "var(--ap-purple)",
            }} />
          </div>
          <div className="mm-storage-nums">
            <span>{fmt(usage?.storage?.usage || 0)}</span>
            {usage?.storage?.limit > 0 && <span>{fmt(usage.storage.limit)}</span>}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="mm-main">

        {/* Topbar */}
        <header className="mm-topbar">
          <div className="mm-topbar-left">
            <div className="ap-breadcrumb">
              <span className="ap-breadcrumb-sub">Admin</span>
              <span className="ap-breadcrumb-title">Media</span>
            </div>
          </div>
          <div className="mm-topbar-right">
            {/* Search */}
            {navTab === "files" && (
              <div className="mm-search-wrap">
                <Ico d={I.search} size={14} />
                <input
                  className="mm-search-input"
                  type="text"
                  placeholder="Search files…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            )}

            {/* Folder filter */}
            {navTab === "files" && folders.length > 0 && (
              <select className="mm-select" value={folder} onChange={e => setFolder(e.target.value)}>
                <option value="">All folders</option>
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}

            {/* View toggle */}
            {navTab === "files" && (
              <div className="mm-view-toggle">
                <button className={`mm-vt-btn${view === "grid" ? " mm-vt-btn--on" : ""}`} onClick={() => setView("grid")} title="Grid view">
                  <Ico d={I.grid} size={14} />
                </button>
                <button className={`mm-vt-btn${view === "list" ? " mm-vt-btn--on" : ""}`} onClick={() => setView("list")} title="List view">
                  <Ico d={I.list} size={14} />
                </button>
              </div>
            )}

            {/* Multi-select toggle */}
            {navTab === "files" && (
              <button
                className={`mm-topbar-btn${multiMode ? " mm-topbar-btn--active" : ""}`}
                onClick={() => { setMultiMode(m => !m); clearSel(); }}
                title="Multi-select"
              >
                <Ico d={I.select} size={13} />
                Select
              </button>
            )}

            {/* Upload */}
            <button
              className={`mm-topbar-btn mm-topbar-btn--primary${uploading ? " mm-topbar-btn--busy" : ""}`}
              onClick={() => !uploading && fileRef.current?.click()}
              disabled={uploading}
            >
              <Ico d={I.upload} size={13} />
              {uploading ? "Uploading…" : "Upload"}
            </button>

            {/* Refresh */}
            <button className="ap-topbar-btn ap-topbar-btn--icon" onClick={loadAll} disabled={loading} title="Refresh">
              <span className={loading ? "mm-spin" : ""}><Ico d={I.refresh} size={14} /></span>
            </button>
          </div>
        </header>

        {/* Stats bar */}
        {!loading && !loadError && navTab === "files" && (
          <div className="mm-stats-bar">
            <div className="mm-stat-pill"><span className="mm-stat-val">{allAssets.length}</span><span className="mm-stat-lbl">files</span></div>
            <div className="mm-stat-divider" />
            <div className="mm-stat-pill"><span className="mm-stat-val">{images.length}</span><span className="mm-stat-lbl">images</span></div>
            <div className="mm-stat-divider" />
            <div className="mm-stat-pill"><span className="mm-stat-val">{videos.length}</span><span className="mm-stat-lbl">videos</span></div>
            <div className="mm-stat-divider" />
            <div className="mm-stat-pill"><span className="mm-stat-val">{fmt(totalSize)}</span><span className="mm-stat-lbl">used</span></div>
            <div className="mm-stat-spacer" />
            <span className="mm-stat-count">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Multi-select action bar */}
        {multiMode && multiSel.size > 0 && (
          <div className="mm-multibar">
            <span className="mm-multibar-count">{multiSel.size} selected</span>
            <div className="mm-multibar-actions">
              <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={selectAll}>Select page</button>
              <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={clearSel}>Clear</button>
              <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={handleDeleteSelected}>
                <Ico d={I.trash} size={13} /> Delete selected
              </button>
            </div>
          </div>
        )}

        {/* Drop zone */}
        {navTab === "files" && (
          <div
            className={`mm-drop${drag ? " mm-drop--drag" : ""}${uploading ? " mm-drop--busy" : ""}`}
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); uploadFiles(e.dataTransfer.files); }}
          >
            <Ico d={I.upload} size={18} />
            <span className="mm-drop-primary">{uploading ? "Uploading…" : drag ? "Drop to upload" : "Drop files here or click to browse"}</span>
            <span className="mm-drop-hint">PNG · JPG · WebP · GIF · MP4 · MOV · WebM</span>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={e => uploadFiles(e.target.files)} />

        {/* Missing creds warning */}
        {!credsOk && (
          <div className="mm-warn">
            <Ico d={I.warn} size={16} />
            <div>
              <p className="mm-warn-title">Missing credentials</p>
              <p>Add <code>VITE_CLOUDINARY_CLOUD_NAME</code> and <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> to your <code>.env</code></p>
              <p style={{ marginTop: 4, fontSize: 12 }}>⚠️ <strong>Delete 401 fix:</strong> Also ensure <code>CLOUDINARY_API_KEY</code> and <code>CLOUDINARY_API_SECRET</code> are set in your <strong>server</strong> environment (Render/Vercel env vars), <em>without</em> the <code>VITE_</code> prefix.</p>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <div className="mm-content-wrap">
          <div className="mm-content">

            {/* Analytics tab */}
            {navTab === "analytics" ? (
              <AnalyticsTab images={images} videos={videos} usage={usage} />
            ) : loading ? (
              <div className="mm-center">
                <div className="mm-spinner" />
                <p>Loading your media library…</p>
              </div>
            ) : loadError ? (
              <div className="mm-center mm-center--err">
                <Ico d={I.warn} size={40} />
                <p>{loadError}</p>
                <button className="ap-btn ap-btn--primary" onClick={loadAll}>Try again</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="mm-center">
                <Ico d={I.image} size={48} />
                <p>No files found</p>
              </div>
            ) : view === "grid" ? (
              /* Grid view */
              <div className="mm-grid">
                {slice.map(a => {
                  const isVideo = a._type === "video";
                  const name    = a.public_id.split("/").pop();
                  const isDel   = deleting.has(a.public_id);
                  const isDl    = downloading === a.public_id;
                  const isSel   = selected?.public_id === a.public_id && !multiMode;
                  const isMulti = multiSel.has(assetKey(a));
                  const dur     = isVideo ? fmtDuration(a.duration) : null;

                  return (
                    <div
                      key={a.public_id + a._type}
                      className={`mm-card${isSel ? " mm-card--selected" : ""}${isMulti ? " mm-card--multi" : ""}`}
                      onClick={() => {
                        if (multiMode) toggleMultiSel(a);
                        else setSelected(isSel ? null : a);
                      }}
                    >
                      {/* Multi-select checkbox */}
                      {multiMode && (
                        <div className={`mm-checkbox${isMulti ? " mm-checkbox--on" : ""}`}>
                          {isMulti && <Ico d={I.check} size={10} />}
                        </div>
                      )}

                      <div className="mm-thumb">
                        <img src={thumbURL(a)} alt={name} loading="lazy" onError={e => { e.currentTarget.style.opacity = "0.15"; }} />
                        {isVideo && <div className="mm-play-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21"/></svg></div>}
                        {dur && <span className="mm-dur">{dur}</span>}

                        {!multiMode && (
                          <div className="mm-overlay" onClick={e => e.stopPropagation()}>
                            <button className="mm-ob mm-ob--copy" onClick={() => copyURL(a.secure_url)} title="Copy URL"><Ico d={I.copy} size={12} /></button>
                            <button className="mm-ob mm-ob--dl" onClick={() => handleDownload(a)} disabled={isDl} title="Download">
                              {isDl ? <span className="mm-mini-spin" /> : <Ico d={I.download} size={12} />}
                            </button>
                            <button className="mm-ob mm-ob--del" onClick={() => handleDelete(a)} disabled={isDel} title="Delete">
                              {isDel ? <span className="mm-mini-spin" /> : <Ico d={I.trash} size={12} />}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mm-card-body">
                        <p className="mm-card-name" title={a.public_id}>{name}</p>
                        <div className="mm-card-meta">
                          <span className={`ap-badge ${isVideo ? "ap-badge--blue" : "ap-badge--purple"}`} style={{ fontSize: 9 }}>
                            {a.format?.toUpperCase() || (isVideo ? "VID" : "IMG")}
                          </span>
                          {a.bytes > 0 && <span className="mm-card-size">{fmt(a.bytes)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List view */
              <div className="mm-list">
                <div className="mm-list-header">
                  {multiMode && <span style={{ width: 28 }} />}
                  <span>Name</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span>Dimensions</span>
                  <span>Modified</span>
                  <span>Actions</span>
                </div>
                {slice.map(a => {
                  const isVideo = a._type === "video";
                  const name    = a.public_id.split("/").pop();
                  const isDel   = deleting.has(a.public_id);
                  const isDl    = downloading === a.public_id;
                  const isSel   = selected?.public_id === a.public_id && !multiMode;
                  const isMulti = multiSel.has(assetKey(a));

                  return (
                    <div
                      key={a.public_id + a._type}
                      className={`mm-list-row${isSel ? " mm-list-row--selected" : ""}${isMulti ? " mm-list-row--multi" : ""}`}
                      onClick={() => {
                        if (multiMode) toggleMultiSel(a);
                        else setSelected(isSel ? null : a);
                      }}
                    >
                      {multiMode && (
                        <div className={`mm-checkbox${isMulti ? " mm-checkbox--on" : ""}`} style={{ flexShrink: 0 }}>
                          {isMulti && <Ico d={I.check} size={10} />}
                        </div>
                      )}
                      <div className="mm-list-name">
                        <div className="mm-list-thumb">
                          <img src={thumbURL(a)} alt={name} loading="lazy" onError={e => { e.currentTarget.style.opacity = "0.15"; }} />
                          {isVideo && <div className="mm-list-play"><svg width="8" height="8" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21"/></svg></div>}
                        </div>
                        <span title={a.public_id}>{name}</span>
                      </div>
                      <span>
                        <span className={`ap-badge ${isVideo ? "ap-badge--blue" : "ap-badge--purple"}`} style={{ fontSize: 10 }}>
                          {a.format?.toUpperCase() || (isVideo ? "VID" : "IMG")}
                        </span>
                      </span>
                      <span className="mm-list-muted">{fmt(a.bytes)}</span>
                      <span className="mm-list-muted">{a.width && a.height ? `${a.width}×${a.height}` : "—"}</span>
                      <span className="mm-list-muted">{fmtDate(a.created_at)}</span>
                      <div className="mm-list-actions" onClick={e => e.stopPropagation()}>
                        {!multiMode && (
                          <>
                            <button className="mm-ia-btn" onClick={() => copyURL(a.secure_url)} title="Copy URL"><Ico d={I.copy} size={13} /></button>
                            <button className="mm-ia-btn" onClick={() => handleDownload(a)} disabled={isDl} title="Download">
                              {isDl ? <span className="mm-mini-spin mm-mini-spin--muted" /> : <Ico d={I.download} size={13} />}
                            </button>
                            <button className="mm-ia-btn mm-ia-btn--del" onClick={() => handleDelete(a)} disabled={isDel} title="Delete">
                              {isDel ? <span className="mm-mini-spin" /> : <Ico d={I.trash} size={13} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {navTab === "files" && totalPages > 1 && (
              <div className="mm-pager">
                <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
                <span className="mm-pg-info">Page {page + 1} of {totalPages}</span>
                <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && !multiMode && navTab === "files" && (
            <aside className="mm-detail">
              <div className="mm-detail-header">
                <span className="ap-card-title">File Details</span>
                <button className="ap-modal-close" onClick={() => setSelected(null)}><Ico d={I.x} size={13} /></button>
              </div>

              <div className="mm-detail-thumb">
                <img src={thumbURL(selected)} alt={selected.public_id.split("/").pop()} />
                {selected._type === "video" && (
                  <div className="mm-detail-play"><svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><polygon points="5 3 19 12 5 21"/></svg></div>
                )}
              </div>

              <div className="mm-detail-name">
                {selected.public_id.split("/").pop()}
                <span className={`ap-badge ${selected._type === "video" ? "ap-badge--blue" : "ap-badge--purple"}`} style={{ marginLeft: 8, fontSize: 10 }}>
                  {selected.format?.toUpperCase() || selected._type.toUpperCase()}
                </span>
              </div>

              <div className="mm-detail-rows">
                {[
                  { label: "Size",       value: fmt(selected.bytes) },
                  { label: "Dimensions", value: selected.width && selected.height ? `${selected.width} × ${selected.height}` : "—" },
                  { label: "Folder",     value: selected.folder || "(root)" },
                  { label: "Uploaded",   value: fmtDate(selected.created_at) },
                  { label: "Format",     value: selected.format?.toUpperCase() || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="mm-detail-row">
                    <span className="mm-detail-label">{label}</span>
                    <span className="mm-detail-val">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mm-detail-actions">
                <button className="ap-btn ap-btn--primary ap-btn--full ap-btn--sm" onClick={() => copyURL(selected.secure_url)}>
                  <Ico d={I.copy} size={13} /> Copy URL
                </button>
                <button className="ap-btn ap-btn--ghost ap-btn--full ap-btn--sm" onClick={() => handleDownload(selected)} disabled={downloading === selected.public_id}>
                  {downloading === selected.public_id ? <span className="mm-mini-spin mm-mini-spin--muted" /> : <Ico d={I.download} size={13} />}
                  Download
                </button>
                <button className="ap-btn ap-btn--danger ap-btn--full ap-btn--sm" onClick={() => handleDelete(selected)} disabled={deleting.has(selected.public_id)}>
                  {deleting.has(selected.public_id) ? <span className="mm-mini-spin" /> : <Ico d={I.trash} size={13} />}
                  Delete
                </button>
                <a href={selected.secure_url} target="_blank" rel="noopener noreferrer" className="mm-detail-link">
                  <Ico d={I.eye} size={13} /> Preview in new tab
                </a>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
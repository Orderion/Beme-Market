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

/* ── Icons ── */
const Icon = ({ d, size = 18, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  copy:     "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.912 4.895 3 6 3h8c1.105 0 2 .912 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.088 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  refresh:  "M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10",
  play:     "M5 3l14 9-14 9V3z",
  grid:     "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  list:     "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  search:   "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  folder:   "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  image:    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  video:    "M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  check:    "M20 6L9 17l-5-5",
  warn:     "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  x:        "M18 6L6 18M6 6l12 12",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  link:     "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  filter:   "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  sort:     "M3 6h18M7 12h10M11 18h2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
};

const Ico = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {name === "play" ? <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/> : <path d={icons[name]} />}
  </svg>
);

const PER_PAGE = 24;

export default function MediaManager() {
  const [images,      setImages]      = useState([]);
  const [videos,      setVideos]      = useState([]);
  const [usage,       setUsage]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [tab,         setTab]         = useState("all");
  const [view,        setView]        = useState("grid");
  const [search,      setSearch]      = useState("");
  const [folder,      setFolder]      = useState("");
  const [page,        setPage]        = useState(0);
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [drag,        setDrag]        = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileRef = useRef();

  const credsOk = Boolean(CLOUD && PRESET);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Secure API fetch ── */
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
  useEffect(() => { setPage(0); }, [tab, search, folder]);

  /* ── Derived lists ── */
  const allAssets = [
    ...images.map((a) => ({ ...a, _type: "image" })),
    ...videos.map((a) => ({ ...a, _type: "video" })),
  ];
  const baseList =
    tab === "images" ? images.map((a) => ({ ...a, _type: "image" })) :
    tab === "videos" ? videos.map((a) => ({ ...a, _type: "video" })) :
    allAssets;

  const filtered = baseList.filter((a) => {
    const q       = search.toLowerCase();
    const nameOk  = !q      || a.public_id.toLowerCase().includes(q);
    const foldOk  = !folder || (a.folder || "(root)") === folder;
    return nameOk && foldOk;
  });

  const slice      = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const folders    = [...new Set(allAssets.map((a) => a.folder || "(root)"))].sort();

  /* ── Storage metrics ── */
  const storageUsed  = usage?.storage?.usage    || 0;
  const storageLimit = usage?.storage?.limit    || 0;
  const storagePct   = pct(storageUsed, storageLimit);
  const bandUsed     = usage?.bandwidth?.usage  || 0;
  const bandLimit    = usage?.bandwidth?.limit  || 0;
  const bandPct      = pct(bandUsed, bandLimit);

  /* ── DELETE — fixed: action goes in body, not query string ── */
  const deleteAsset = async (publicId, resourceType) => {
    if (!window.confirm(`Delete "${publicId}"?\n\nThis cannot be undone.`)) return;
    setDeleting(publicId);
    try {
      // Action stays in the query string; body carries the payload
      const res = await fetch(`/api/cloudinary?action=delete`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ publicId, resourceType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const ok =
        data.deleted?.[publicId] === "deleted" ||
        Object.values(data.deleted || {}).includes("deleted");

      if (ok) {
        if (resourceType === "image") setImages((p) => p.filter((a) => a.public_id !== publicId));
        else                          setVideos((p) => p.filter((a) => a.public_id !== publicId));
        if (selected?.public_id === publicId) setSelected(null);
        notify("Deleted successfully");
      } else {
        throw new Error("Delete failed — " + JSON.stringify(data.deleted));
      }
    } catch (e) {
      notify("Error: " + e.message, "error");
    }
    setDeleting(null);
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
      const fd    = new FormData();
      fd.append("file",          file);
      fd.append("upload_preset", PRESET);
      try {
        const r = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD}/${isVid ? "video" : "image"}/upload`,
          { method: "POST", body: fd }
        );
        const d = await r.json();
        if (d.secure_url) {
          if (isVid) setVideos((p) => [{ ...d, _type: "video" }, ...p]);
          else       setImages((p) => [{ ...d, _type: "image" }, ...p]);
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
      try {
        const usageData = await apiFetch({ action: "usage" });
        setUsage(usageData);
      } catch (_) {}
    }
    setUploading(false);
  };

  /* ── Copy URL ── */
  const copyURL = (url) =>
    navigator.clipboard.writeText(url)
      .then(() => notify("URL copied!"))
      .catch(() => window.prompt("Copy this URL:", url));

  /* ── Thumb URL ── */
  const thumbURL = (a) =>
    a._type === "video"
      ? `https://res.cloudinary.com/${CLOUD}/video/upload/w_400,h_400,c_fill,so_0/${a.public_id}.jpg`
      : a.secure_url.replace("/upload/", "/upload/w_400,h_400,c_fill/");

  /* ── Format date ── */
  const fmtDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const totalSize = allAssets.reduce((s, a) => s + (a.bytes || 0), 0);

  return (
    <div className="mm-root">

      {/* Toast */}
      {toast && (
        <div className={`mm-toast mm-toast--${toast.type}`}>
          <Ico name={toast.type === "success" ? "check" : "warn"} size={14} />
          {toast.msg}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className={`mm-sidebar${sidebarOpen ? "" : " mm-sidebar--closed"}`}>
        <div className="mm-logo">
          <div className="mm-logo-mark">M</div>
          <span className="mm-logo-name">MediaVault</span>
        </div>

        <nav className="mm-nav">
          <div className="mm-nav-label">Library</div>
          {[
            { key: "all",    label: "All Files",  icon: "grid",   count: allAssets.length },
            { key: "images", label: "Images",     icon: "image",  count: images.length },
            { key: "videos", label: "Videos",     icon: "video",  count: videos.length },
          ].map((t) => (
            <button
              key={t.key}
              className={`mm-nav-item${tab === t.key ? " mm-nav-item--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <Ico name={t.icon} size={16} />
              <span>{t.label}</span>
              {t.count > 0 && <span className="mm-nav-badge">{t.count}</span>}
            </button>
          ))}

          {folders.length > 0 && (
            <>
              <div className="mm-nav-label" style={{ marginTop: "1.5rem" }}>Folders</div>
              {folders.map((f) => (
                <button
                  key={f}
                  className={`mm-nav-item${folder === f ? " mm-nav-item--active" : ""}`}
                  onClick={() => setFolder(folder === f ? "" : f)}
                >
                  <Ico name="folder" size={16} />
                  <span className="mm-nav-folder-name">{f}</span>
                </button>
              ))}
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
            <div
              className="mm-storage-fill"
              style={{
                width: `${storagePct}%`,
                background: storagePct > 85 ? "#ef4444" : storagePct > 65 ? "#f59e0b" : "var(--accent)",
              }}
            />
          </div>
          <div className="mm-storage-nums">
            <span>{fmt(storageUsed)}</span>
            {storageLimit > 0 && <span>{fmt(storageLimit)}</span>}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="mm-main">

        {/* Topbar */}
        <header className="mm-topbar">
          <button className="mm-icon-btn" onClick={() => setSidebarOpen((p) => !p)} title="Toggle sidebar">
            <Ico name="sort" size={18} />
          </button>

          <div className="mm-search-wrap">
            <Ico name="search" size={16} />
            <input
              className="mm-search"
              type="text"
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mm-topbar-right">
            {/* Folder filter */}
            {folders.length > 0 && (
              <select
                className="mm-select"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                <option value="">All folders</option>
                {folders.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            )}

            {/* View toggle */}
            <div className="mm-view-toggle">
              <button className={`mm-vt-btn${view === "grid" ? " mm-vt-btn--on" : ""}`} onClick={() => setView("grid")} title="Grid view">
                <Ico name="grid" size={15} />
              </button>
              <button className={`mm-vt-btn${view === "list" ? " mm-vt-btn--on" : ""}`} onClick={() => setView("list")} title="List view">
                <Ico name="list" size={15} />
              </button>
            </div>

            {/* Upload */}
            <button
              className={`mm-upload-btn${uploading ? " mm-upload-btn--busy" : ""}`}
              onClick={() => !uploading && fileRef.current?.click()}
              disabled={uploading}
            >
              <Ico name="upload" size={15} />
              {uploading ? "Uploading…" : "Upload"}
            </button>

            {/* Refresh */}
            <button className="mm-icon-btn" onClick={loadAll} disabled={loading} title="Refresh">
              <span className={loading ? "mm-spin" : ""}><Ico name="refresh" size={16} /></span>
            </button>
          </div>
        </header>

        {/* Stats bar */}
        {!loading && !loadError && (
          <div className="mm-stats-bar">
            <div className="mm-stat-pill">
              <span className="mm-stat-val">{allAssets.length.toLocaleString()}</span>
              <span className="mm-stat-lbl">Total files</span>
            </div>
            <div className="mm-stat-divider" />
            <div className="mm-stat-pill">
              <span className="mm-stat-val">{images.length.toLocaleString()}</span>
              <span className="mm-stat-lbl">Images</span>
            </div>
            <div className="mm-stat-divider" />
            <div className="mm-stat-pill">
              <span className="mm-stat-val">{videos.length.toLocaleString()}</span>
              <span className="mm-stat-lbl">Videos</span>
            </div>
            <div className="mm-stat-divider" />
            <div className="mm-stat-pill">
              <span className="mm-stat-val">{fmt(totalSize)}</span>
              <span className="mm-stat-lbl">Used</span>
            </div>
            <div className="mm-stat-divider" />
            <div className="mm-stat-pill">
              <span className="mm-stat-val">{Math.round(bandPct)}%</span>
              <span className="mm-stat-lbl">Bandwidth</span>
            </div>
            <div className="mm-stat-spacer" />
            <span className="mm-stat-count">{filtered.length} file{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Drop zone (compact) */}
        <div
          className={`mm-drop${drag ? " mm-drop--drag" : ""}${uploading ? " mm-drop--busy" : ""}`}
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e)  => { e.preventDefault(); setDrag(true); }}
          onDragLeave={()  => setDrag(false)}
          onDrop={(e)      => { e.preventDefault(); setDrag(false); uploadFiles(e.dataTransfer.files); }}
        >
          <Ico name="upload" size={20} />
          <span>{uploading ? "Uploading…" : drag ? "Drop to upload" : "Drop files here or click to browse"}</span>
          <span className="mm-drop-hint">PNG · JPG · WebP · GIF · MP4 · MOV · WebM</span>
        </div>

        <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => uploadFiles(e.target.files)} />

        {/* Missing creds */}
        {!credsOk && (
          <div className="mm-warn">
            <Ico name="warn" size={18} />
            <div>
              <p className="mm-warn-title">Missing credentials</p>
              <p>Add <code>VITE_CLOUDINARY_CLOUD_NAME</code> and <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> to your <code>.env</code> file.</p>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="mm-content-wrap">
          <div className="mm-content">
            {loading ? (
              <div className="mm-center">
                <div className="mm-spinner" />
                <p>Loading your media library…</p>
              </div>
            ) : loadError ? (
              <div className="mm-center mm-center--err">
                <Ico name="warn" size={40} />
                <p>{loadError}</p>
                <button className="mm-upload-btn" onClick={loadAll}>Try again</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="mm-center">
                <Ico name="image" size={48} />
                <p>No files found</p>
              </div>
            ) : view === "grid" ? (
              /* ── Grid view ── */
              <div className="mm-grid">
                {slice.map((a) => {
                  const isVideo = a._type === "video";
                  const name    = a.public_id.split("/").pop();
                  const isDel   = deleting    === a.public_id;
                  const isDl    = downloading === a.public_id;
                  const isSel   = selected?.public_id === a.public_id;
                  const dur     = isVideo ? fmtDuration(a.duration) : null;

                  return (
                    <div
                      key={a.public_id + a._type}
                      className={`mm-card${isSel ? " mm-card--selected" : ""}`}
                      onClick={() => setSelected(isSel ? null : a)}
                    >
                      <div className="mm-thumb">
                        <img src={thumbURL(a)} alt={name} loading="lazy" onError={(e) => { e.currentTarget.style.opacity = "0.2"; }} />
                        {isVideo && <div className="mm-play-badge"><Ico name="play" size={14} /></div>}
                        {dur      && <span className="mm-dur">{dur}</span>}
                        {isSel    && <div className="mm-sel-check"><Ico name="check" size={12} /></div>}

                        {/* Overlay actions */}
                        <div className="mm-overlay" onClick={(e) => e.stopPropagation()}>
                          <button className="mm-ob mm-ob--copy" onClick={() => copyURL(a.secure_url)} title="Copy URL">
                            <Ico name="copy" size={13} />
                          </button>
                          <button className={`mm-ob mm-ob--dl`} onClick={() => handleDownload(a)} disabled={isDl} title="Download">
                            {isDl ? <span className="mm-mini-spin" /> : <Ico name="download" size={13} />}
                          </button>
                          <button className="mm-ob mm-ob--del" onClick={() => deleteAsset(a.public_id, a._type)} disabled={isDel} title="Delete">
                            {isDel ? <span className="mm-mini-spin" /> : <Ico name="trash" size={13} />}
                          </button>
                        </div>
                      </div>

                      <div className="mm-card-body">
                        <p className="mm-card-name" title={a.public_id}>{name}</p>
                        <div className="mm-card-meta">
                          <span className={`mm-badge${isVideo ? " mm-badge--video" : " mm-badge--image"}`}>
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
              /* ── List view ── */
              <div className="mm-list">
                <div className="mm-list-header">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span>Dimensions</span>
                  <span>Modified</span>
                  <span>Actions</span>
                </div>
                {slice.map((a) => {
                  const isVideo = a._type === "video";
                  const name    = a.public_id.split("/").pop();
                  const isDel   = deleting    === a.public_id;
                  const isDl    = downloading === a.public_id;
                  const isSel   = selected?.public_id === a.public_id;

                  return (
                    <div
                      key={a.public_id + a._type}
                      className={`mm-list-row${isSel ? " mm-list-row--selected" : ""}`}
                      onClick={() => setSelected(isSel ? null : a)}
                    >
                      <div className="mm-list-name">
                        <div className="mm-list-thumb">
                          <img src={thumbURL(a)} alt={name} loading="lazy" onError={(e) => { e.currentTarget.style.opacity = "0.2"; }} />
                          {isVideo && <div className="mm-list-play"><Ico name="play" size={8} /></div>}
                        </div>
                        <span title={a.public_id}>{name}</span>
                      </div>
                      <span>
                        <span className={`mm-badge${isVideo ? " mm-badge--video" : " mm-badge--image"}`}>
                          {a.format?.toUpperCase() || (isVideo ? "VID" : "IMG")}
                        </span>
                      </span>
                      <span className="mm-list-muted">{fmt(a.bytes)}</span>
                      <span className="mm-list-muted">
                        {a.width && a.height ? `${a.width}×${a.height}` : "—"}
                      </span>
                      <span className="mm-list-muted">{fmtDate(a.created_at)}</span>
                      <div className="mm-list-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="mm-ia-btn" onClick={() => copyURL(a.secure_url)} title="Copy URL"><Ico name="copy" size={14} /></button>
                        <button className="mm-ia-btn" onClick={() => handleDownload(a)} disabled={isDl} title="Download">
                          {isDl ? <span className="mm-mini-spin mm-mini-spin--dark" /> : <Ico name="download" size={14} />}
                        </button>
                        <button className="mm-ia-btn mm-ia-btn--del" onClick={() => deleteAsset(a.public_id, a._type)} disabled={isDel} title="Delete">
                          {isDel ? <span className="mm-mini-spin" /> : <Ico name="trash" size={14} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mm-pager">
                <button className="mm-pg-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>← Prev</button>
                <div className="mm-pg-dots">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const pg = totalPages <= 7 ? i : i === 0 ? 0 : i === 6 ? totalPages - 1 : page - 2 + i;
                    return (
                      <button
                        key={i}
                        className={`mm-pg-dot${pg === page ? " mm-pg-dot--on" : ""}`}
                        onClick={() => setPage(pg)}
                      >
                        {pg + 1}
                      </button>
                    );
                  })}
                </div>
                <button className="mm-pg-btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
              </div>
            )}
          </div>

          {/* ── Detail panel ── */}
          {selected && (
            <aside className="mm-detail">
              <div className="mm-detail-header">
                <span className="mm-detail-title">File Details</span>
                <button className="mm-icon-btn" onClick={() => setSelected(null)}><Ico name="x" size={16} /></button>
              </div>

              <div className="mm-detail-thumb">
                <img src={thumbURL(selected)} alt={selected.public_id.split("/").pop()} />
                {selected._type === "video" && (
                  <div className="mm-detail-play"><Ico name="play" size={24} /></div>
                )}
              </div>

              <div className="mm-detail-name">
                {selected.public_id.split("/").pop()}
                <span className={`mm-badge${selected._type === "video" ? " mm-badge--video" : " mm-badge--image"}`} style={{ marginLeft: 8 }}>
                  {selected.format?.toUpperCase() || (selected._type === "video" ? "VID" : "IMG")}
                </span>
              </div>

              <div className="mm-detail-grid">
                {[
                  { label: "Size",       value: fmt(selected.bytes) },
                  { label: "Dimensions", value: selected.width && selected.height ? `${selected.width} × ${selected.height}` : "—" },
                  { label: "Folder",     value: selected.folder || "(root)" },
                  { label: "Uploaded",   value: fmtDate(selected.created_at) },
                  { label: "Public ID",  value: selected.public_id },
                ].map(({ label, value }) => (
                  <div className="mm-detail-row" key={label}>
                    <span className="mm-detail-label">{label}</span>
                    <span className="mm-detail-val">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mm-detail-actions">
                <button className="mm-det-btn mm-det-btn--primary" onClick={() => copyURL(selected.secure_url)}>
                  <Ico name="copy" size={14} /> Copy URL
                </button>
                <button className="mm-det-btn" onClick={() => handleDownload(selected)} disabled={downloading === selected.public_id}>
                  {downloading === selected.public_id ? <span className="mm-mini-spin mm-mini-spin--dark" /> : <Ico name="download" size={14} />}
                  Download
                </button>
                <button
                  className="mm-det-btn mm-det-btn--danger"
                  onClick={() => deleteAsset(selected.public_id, selected._type)}
                  disabled={deleting === selected.public_id}
                >
                  {deleting === selected.public_id ? <span className="mm-mini-spin" /> : <Ico name="trash" size={14} />}
                  Delete
                </button>
              </div>

              <div className="mm-detail-link">
                <a href={selected.secure_url} target="_blank" rel="noopener noreferrer">
                  <Ico name="eye" size={13} /> Preview in new tab
                </a>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
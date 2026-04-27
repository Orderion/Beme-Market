import { useState, useEffect, useCallback, useRef } from "react";
import "./MediaManager.css";

const CLOUD   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET  = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const SECRET  = import.meta.env.VITE_CLOUDINARY_API_SECRET;

/* ── Helpers ─────────────────────────────────── */
const b64  = (s) => btoa(s);
const sha1 = async (s) => {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const fmt = (bytes) => {
  if (!bytes && bytes !== 0) return "—";
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(2) + " GB";
  if (bytes >= 1_048_576)     return (bytes / 1_048_576).toFixed(1)     + " MB";
  if (bytes >= 1_024)         return (bytes / 1_024).toFixed(0)         + " KB";
  return bytes + " B";
};

const fmtDuration = (secs) => {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const pct = (used, limit) =>
  limit ? Math.min(100, (used / limit) * 100) : 0;

/* Download a remote file as blob, fallback to new tab */
const downloadAsset = async (url, filename) => {
  try {
    const r    = await fetch(url);
    const blob = await r.blob();
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  } catch {
    window.open(url, "_blank");
  }
};

/* ── Icons ───────────────────────────────────── */
const UploadIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const WarnIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

/* ─────────────────────────────────────────────
   STORAGE GRAPH COMPONENT
───────────────────────────────────────────── */
function StorageGraph({ usage }) {
  if (!usage) return null;

  const storageUsed  = usage.storage?.usage  || 0;
  const storageLimit = usage.storage?.limit  || 0;
  const storageFree  = storageLimit ? storageLimit - storageUsed : null;
  const storagePct   = pct(storageUsed, storageLimit);
  const bandUsed     = usage.bandwidth?.usage || 0;
  const bandLimit    = usage.bandwidth?.limit || 0;
  const bandPct      = pct(bandUsed, bandLimit);
  const txUsed       = usage.transformations?.usage || 0;
  const txLimit      = usage.transformations?.limit || 0;
  const txPct        = pct(txUsed, txLimit);

  const barColor = (p) =>
    p > 85 ? "#FF6600" : p > 65 ? "#f0a500" : "var(--text)";

  const rows = [
    { label: "Storage",         used: storageUsed, limit: storageLimit, pct: storagePct, fmtUsed: fmt(storageUsed), fmtLimit: storageLimit ? fmt(storageLimit) : null, free: storageFree !== null ? fmt(storageFree) + " free" : "Unlimited" },
    { label: "Bandwidth",       used: bandUsed,    limit: bandLimit,    pct: bandPct,    fmtUsed: fmt(bandUsed),    fmtLimit: bandLimit    ? fmt(bandLimit)    : null, free: null },
    { label: "Transformations", used: txUsed,      limit: txLimit,      pct: txPct,      fmtUsed: txUsed.toLocaleString(), fmtLimit: txLimit ? txLimit.toLocaleString() : null, free: null, isCount: true },
  ];

  return (
    <div className="mm-graph-card">
      <div className="mm-graph-title">Resource Usage</div>
      <div className="mm-graph-rows">
        {rows.map((row) => (
          <div className="mm-graph-row" key={row.label}>
            <div className="mm-graph-meta">
              <span className="mm-graph-label">{row.label}</span>
              <div className="mm-graph-nums">
                {row.free && <span className="mm-graph-free">{row.free}</span>}
                <span className="mm-graph-used" style={{ color: barColor(row.pct) }}>
                  {row.fmtUsed}
                </span>
                {row.fmtLimit && (
                  <span className="mm-graph-limit">/ {row.fmtLimit}</span>
                )}
              </div>
            </div>

            {/* Linear track */}
            <div className="mm-track">
              <div
                className="mm-track-fill"
                style={{
                  width: row.limit > 0 ? storagePct + "%" : "0%",
                  ...(row.label === "Storage"         && { width: storagePct + "%" }),
                  ...(row.label === "Bandwidth"       && { width: bandPct    + "%" }),
                  ...(row.label === "Transformations" && { width: txPct      + "%" }),
                  background: barColor(
                    row.label === "Storage"         ? storagePct :
                    row.label === "Bandwidth"       ? bandPct    : txPct
                  ),
                }}
              />
              {/* Tick marks at 25 / 50 / 75% */}
              {[25, 50, 75].map((t) => (
                <div key={t} className="mm-track-tick" style={{ left: t + "%" }} />
              ))}
            </div>

            <div className="mm-track-labels">
              <span>0</span>
              {row.fmtLimit ? (
                <>
                  <span>{row.fmtLimit ? (row.isCount ? Math.round(row.limit / 4).toLocaleString() : fmt(row.limit / 4)) : ""}</span>
                  <span>{row.fmtLimit ? (row.isCount ? Math.round(row.limit / 2).toLocaleString() : fmt(row.limit / 2)) : ""}</span>
                  <span>{row.fmtLimit ? (row.isCount ? Math.round((row.limit * 3) / 4).toLocaleString() : fmt((row.limit * 3) / 4)) : ""}</span>
                  <span>{row.fmtLimit}</span>
                </>
              ) : (
                <span className="mm-track-unlimited">Unlimited</span>
              )}
            </div>

            {row.pct > 0 && row.limit > 0 && (
              <div className="mm-pct-badge" style={{ left: `min(${row.pct}%, calc(100% - 42px))`, background: barColor(row.pct) }}>
                {Math.round(row.pct)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const PER_PAGE = 28;

export default function MediaManager() {
  const [images,      setImages]      = useState([]);
  const [videos,      setVideos]      = useState([]);
  const [usage,       setUsage]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [tab,         setTab]         = useState("all");
  const [search,      setSearch]      = useState("");
  const [folder,      setFolder]      = useState("");
  const [page,        setPage]        = useState(0);
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [drag,        setDrag]        = useState(false);
  const fileRef = useRef();

  /* Guard: check env vars are present */
  const credsOk = CLOUD && API_KEY && SECRET;

  /* Toast */
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const AUTH = credsOk ? b64(`${API_KEY}:${SECRET}`) : "";

  /* Fetch all pages of a resource type */
  const fetchAll = useCallback(async (resourceType) => {
    let all = [], cursor = "";
    do {
      const url =
        `https://api.cloudinary.com/v1_1/${CLOUD}/resources/${resourceType}` +
        `?max_results=100${cursor ? "&next_cursor=" + cursor : ""}`;
      const r = await fetch(url, { headers: { Authorization: `Basic ${AUTH}` } });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error?.message || `HTTP ${r.status} — check your API Key & Secret`);
      }
      const d = await r.json();
      all    = all.concat(d.resources || []);
      cursor = d.next_cursor || "";
    } while (cursor);
    return all;
  }, [AUTH]);

  const loadAll = useCallback(async () => {
    if (!credsOk) {
      setLoadError("Missing env vars — add VITE_CLOUDINARY_API_KEY and VITE_CLOUDINARY_API_SECRET to your .env file.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [usageRes, imgs, vids] = await Promise.all([
        fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/usage`, {
          headers: { Authorization: `Basic ${AUTH}` },
        }),
        fetchAll("image"),
        fetchAll("video"),
      ]);
      if (usageRes.ok) setUsage(await usageRes.json());
      setImages(imgs);
      setVideos(vids);
    } catch (e) {
      setLoadError(e.message);
      notify(e.message, "error");
    }
    setLoading(false);
  }, [AUTH, credsOk, fetchAll]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { setPage(0); }, [tab, search, folder]);

  /* Merged list */
  const allAssets = [
    ...images.map((a) => ({ ...a, _type: "image" })),
    ...videos.map((a) => ({ ...a, _type: "video" })),
  ];
  const baseList =
    tab === "images" ? images.map((a) => ({ ...a, _type: "image" })) :
    tab === "videos" ? videos.map((a) => ({ ...a, _type: "video" })) :
    allAssets;

  const filtered = baseList.filter((a) => {
    const q        = search.toLowerCase();
    const nameOk   = !q      || a.public_id.toLowerCase().includes(q);
    const folderOk = !folder || (a.folder || "(root)") === folder;
    return nameOk && folderOk;
  });

  const slice      = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const folders    = [...new Set(allAssets.map((a) => a.folder || "(root)"))].sort();

  /* Delete */
  const deleteAsset = async (publicId, resourceType) => {
    if (!confirm(`Delete "${publicId}"?\n\nThis cannot be undone.`)) return;
    setDeleting(publicId);
    try {
      const ts  = Math.floor(Date.now() / 1000);
      const sig = await sha1(`public_ids[]=${publicId}&timestamp=${ts}${SECRET}`);
      const body = new URLSearchParams({ timestamp: ts, signature: sig, api_key: API_KEY });
      body.append("public_ids[]", publicId);
      const r = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD}/resources/${resourceType}/upload`,
        { method: "DELETE", body }
      );
      const d = await r.json();
      const ok =
        d.deleted?.[publicId] === "deleted" ||
        Object.values(d.deleted || {}).includes("deleted");
      if (ok) {
        if (resourceType === "image") setImages((p) => p.filter((a) => a.public_id !== publicId));
        else                          setVideos((p) => p.filter((a) => a.public_id !== publicId));
        notify("Deleted");
      } else {
        notify("Delete failed — " + JSON.stringify(d.deleted), "error");
      }
    } catch (e) {
      notify("Error: " + e.message, "error");
    }
    setDeleting(null);
  };

  /* Download */
  const handleDownload = async (asset) => {
    const name     = asset.public_id.split("/").pop();
    const filename = name + "." + (asset.format || (asset._type === "video" ? "mp4" : "jpg"));
    setDownloading(asset.public_id);
    notify("Starting download…");
    await downloadAsset(asset.secure_url, filename);
    setDownloading(null);
  };

  /* Upload */
  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    let done = 0;
    for (const file of files) {
      const isVid = file.type.startsWith("video/");
      const fd    = new FormData();
      fd.append("file", file);
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
      /* Refresh usage */
      const ur = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/usage`, {
        headers: { Authorization: `Basic ${AUTH}` },
      });
      if (ur.ok) setUsage(await ur.json());
    }
    setUploading(false);
  };

  /* Copy URL */
  const copyURL = (url) =>
    navigator.clipboard.writeText(url)
      .then(() => notify("URL copied!"))
      .catch(()  => window.prompt("Copy this URL:", url));

  /* ── Render ── */
  return (
    <div className="mm-page">

      {/* Toast */}
      {toast && (
        <div className={`mm-toast mm-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="mm-header">
        <div>
          <h1 className="mm-title">Media Manager</h1>
          <p className="mm-subtitle">Cloudinary · {CLOUD || "—"}</p>
        </div>
        <button
          className="mm-refresh-btn"
          onClick={loadAll}
          disabled={loading}
          title="Refresh"
        >
          <span className={loading ? "mm-spin" : ""}><RefreshIcon /></span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Missing creds warning */}
      {!credsOk && (
        <div className="mm-warn-card">
          <span className="mm-warn-icon"><WarnIcon /></span>
          <div>
            <p className="mm-warn-title">Missing credentials</p>
            <p className="mm-warn-body">
              Add these to your <code>.env</code> file and redeploy:
            </p>
            <pre className="mm-warn-pre">{`VITE_CLOUDINARY_API_KEY=your_api_key\nVITE_CLOUDINARY_API_SECRET=your_api_secret`}</pre>
            <p className="mm-warn-body">Find them in Cloudinary Console → Settings → Access Keys.</p>
          </div>
        </div>
      )}

      {/* Storage linear graph */}
      <StorageGraph usage={usage} />

      {/* Stats row */}
      {!loading && !loadError && (
        <div className="mm-stats-row">
          <div className="mm-stat">
            <span className="mm-stat-n">{images.length.toLocaleString()}</span>
            <span className="mm-stat-l">Images</span>
          </div>
          <div className="mm-stat">
            <span className="mm-stat-n">{videos.length.toLocaleString()}</span>
            <span className="mm-stat-l">Videos</span>
          </div>
          <div className="mm-stat">
            <span className="mm-stat-n">{allAssets.length.toLocaleString()}</span>
            <span className="mm-stat-l">Total files</span>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        className={`mm-drop${drag ? " mm-drop--drag" : ""}${uploading ? " mm-drop--busy" : ""}`}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={(e)  => { e.preventDefault(); setDrag(true); }}
        onDragLeave={()  => setDrag(false)}
        onDrop={(e)      => { e.preventDefault(); setDrag(false); uploadFiles(e.dataTransfer.files); }}
      >
        <span className="mm-drop-icon"><UploadIcon /></span>
        <span className="mm-drop-primary">
          {uploading ? "Uploading…" : drag ? "Drop to upload" : "Drop files or click to browse"}
        </span>
        <span className="mm-drop-sub">
          Images: PNG · JPG · WebP · GIF &nbsp;|&nbsp; Videos: MP4 · MOV · WebM
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => uploadFiles(e.target.files)}
      />

      {/* Tabs */}
      <div className="mm-tabs">
        {[
          { key: "all",    label: `All (${allAssets.length})` },
          { key: "images", label: `Images (${images.length})` },
          { key: "videos", label: `Videos (${videos.length})` },
        ].map((t) => (
          <button
            key={t.key}
            className={`mm-tab${tab === t.key ? " mm-tab--on" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mm-toolbar">
        <input
          className="mm-search"
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="mm-select"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        >
          <option value="">All folders</option>
          {folders.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <span className="mm-count">{filtered.length} file{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mm-center">
          <div className="mm-spinner" />
          <p>Loading your media library…</p>
        </div>
      ) : loadError ? (
        <div className="mm-center mm-center--err">
          <WarnIcon />
          <p>{loadError}</p>
          <button className="mm-refresh-btn" onClick={loadAll}>Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mm-center">
          <EmptyIcon />
          <p>No files found</p>
        </div>
      ) : (
        <div className="mm-grid">
          {slice.map((a) => {
            const isVideo  = a._type === "video";
            const name     = a.public_id.split("/").pop();
            const filename = name + "." + (a.format || (isVideo ? "mp4" : "jpg"));
            const thumb    = isVideo
              ? `https://res.cloudinary.com/${CLOUD}/video/upload/w_320,h_320,c_fill,so_0/${a.public_id}.jpg`
              : a.secure_url.replace("/upload/", "/upload/w_320,h_320,c_fill/");
            const isDel  = deleting    === a.public_id;
            const isDl   = downloading === a.public_id;
            const dur    = isVideo ? fmtDuration(a.duration) : null;

            return (
              <div className={`mm-card${isVideo ? " mm-card--vid" : ""}`} key={a.public_id + a._type}>
                <div className="mm-thumb">
                  <img src={thumb} alt={name} loading="lazy" />
                  {isVideo && <div className="mm-play"><PlayIcon /></div>}
                  {dur      && <span className="mm-dur">{dur}</span>}
                  <div className="mm-overlay">
                    <button className="mm-ob mm-ob--copy"  onClick={() => copyURL(a.secure_url)} title="Copy URL"><CopyIcon /></button>
                    <button className={`mm-ob mm-ob--dl${isDl ? " mm-ob--spin" : ""}`} onClick={() => handleDownload(a)} disabled={isDl} title="Download">{isDl ? <span className="mm-mini-spin" /> : <DownloadIcon />}</button>
                    <button className="mm-ob mm-ob--del"   onClick={() => deleteAsset(a.public_id, a._type)} disabled={isDel} title="Delete">{isDel ? <span className="mm-mini-spin" /> : <TrashIcon />}</button>
                  </div>
                </div>

                <div className="mm-body">
                  <p className="mm-name" title={a.public_id}>{name}</p>
                  <div className="mm-row">
                    <span className={`mm-tag${isVideo ? " mm-tag--v" : ""}`}>
                      {a.format?.toUpperCase() || (isVideo ? "VID" : "IMG")}
                    </span>
                    {a.bytes > 0 && <span className="mm-size">{fmt(a.bytes)}</span>}
                    {a.width && a.height && !isVideo && (
                      <span className="mm-size">{a.width}×{a.height}</span>
                    )}
                  </div>
                  <div className="mm-btns">
                    <button className="mm-btn-copy" onClick={() => copyURL(a.secure_url)}>Copy URL</button>
                    <button className="mm-btn-dl" onClick={() => handleDownload(a)} disabled={isDl} title="Download">
                      {isDl ? <span className="mm-mini-spin" /> : <DownloadIcon />}
                    </button>
                  </div>
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
          <span className="mm-pg-info">Page {page + 1} of {totalPages}</span>
          <button className="mm-pg-btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
        </div>
      )}
    </div>
  );
}
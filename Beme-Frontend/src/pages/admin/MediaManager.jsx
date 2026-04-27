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
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};
const fmt = (bytes) => {
  if (!bytes) return "—";
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(2) + " GB";
  if (bytes >= 1_048_576)     return (bytes / 1_048_576).toFixed(1)  + " MB";
  if (bytes >= 1_024)         return (bytes / 1_024).toFixed(0)      + " KB";
  return bytes + " B";
};
const pct = (used, limit) => (limit ? Math.min(100, (used / limit) * 100) : 0);

/* ── Icons ───────────────────────────────────── */
function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
}
function EmptyIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const PER_PAGE = 28;

export default function MediaManager() {
  const [assets,   setAssets]   = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [usage,    setUsage]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [folder,   setFolder]   = useState("");
  const [page,     setPage]     = useState(0);
  const [uploading,setUploading]= useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [drag,     setDrag]     = useState(false);
  const fileRef = useRef();
  const AUTH = b64(`${API_KEY}:${SECRET}`);

  /* Toast helper */
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  /* Fetch usage + all resources */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usageRes, ...rest] = await Promise.all([
        fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/usage`, {
          headers: { Authorization: `Basic ${AUTH}` },
        }),
      ]);
      if (usageRes.ok) setUsage(await usageRes.json());

      let all = [], cursor = "";
      do {
        const url = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image?max_results=100${cursor ? "&next_cursor=" + cursor : ""}`;
        const r = await fetch(url, { headers: { Authorization: `Basic ${AUTH}` } });
        if (!r.ok) throw new Error((await r.json()).error?.message || "Load failed");
        const d = await r.json();
        all    = all.concat(d.resources || []);
        cursor = d.next_cursor || "";
      } while (cursor);

      setAssets(all);
    } catch (e) {
      notify(e.message, "error");
    }
    setLoading(false);
  }, [AUTH]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* Filter */
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      assets.filter((a) => {
        const nameOk   = !q      || a.public_id.toLowerCase().includes(q);
        const folderOk = !folder || (a.folder || "(root)") === folder;
        return nameOk && folderOk;
      })
    );
    setPage(0);
  }, [assets, search, folder]);

  const folders    = [...new Set(assets.map((a) => a.folder || "(root)"))].sort();
  const slice      = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  /* Delete */
  const deleteAsset = async (publicId) => {
    if (!confirm(`Delete "${publicId}"?\n\nThis cannot be undone.`)) return;
    setDeleting(publicId);
    try {
      const ts  = Math.floor(Date.now() / 1000);
      const sig = await sha1(`public_ids[]=${publicId}&timestamp=${ts}${SECRET}`);
      const body = new URLSearchParams({ timestamp: ts, signature: sig, api_key: API_KEY });
      body.append("public_ids[]", publicId);
      const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/upload`, {
        method: "DELETE", body,
      });
      const d = await r.json();
      if (d.deleted?.[publicId] === "deleted" || Object.values(d.deleted || {}).includes("deleted")) {
        setAssets((prev) => prev.filter((a) => a.public_id !== publicId));
        notify("Image deleted");
      } else {
        notify("Delete failed", "error");
      }
    } catch (e) {
      notify("Error: " + e.message, "error");
    }
    setDeleting(null);
  };

  /* Upload */
  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    let done = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", PRESET);
      try {
        const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
          method: "POST", body: fd,
        });
        const d = await r.json();
        if (d.secure_url) { setAssets((prev) => [d, ...prev]); done++; }
        else notify("Upload failed: " + (d.error?.message || "unknown"), "error");
      } catch (e) {
        notify("Upload error: " + e.message, "error");
      }
    }
    if (done) notify(`Uploaded ${done} image${done > 1 ? "s" : ""}`);
    setUploading(false);
    /* refresh usage after upload */
    const ur = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/usage`, {
      headers: { Authorization: `Basic ${AUTH}` },
    });
    if (ur.ok) setUsage(await ur.json());
  };

  /* Copy URL */
  const copyURL = (url) => {
    navigator.clipboard.writeText(url)
      .then(() => notify("URL copied!"))
      .catch(()  => window.prompt("Copy this URL:", url));
  };

  /* Storage calcs */
  const storageUsed  = usage?.storage?.usage  || 0;
  const storageLimit = usage?.storage?.limit  || 0;
  const storageFree  = storageLimit ? storageLimit - storageUsed : null;
  const storagePct   = pct(storageUsed, storageLimit);
  const bandUsed     = usage?.bandwidth?.usage || 0;
  const bandLimit    = usage?.bandwidth?.limit || 0;
  const credUsed     = usage?.credits?.usage   || 0;
  const credLimit    = usage?.credits?.limit   || 0;
  const txUsed       = usage?.transformations?.usage || 0;
  const txLimit      = usage?.transformations?.limit || 0;

  /* ── Render ── */
  return (
    <div className="mm-page">

      {/* Toast */}
      {toast && (
        <div className={`mm-toast mm-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="mm-header">
        <div className="mm-header-left">
          <h1 className="mm-title">Media Manager</h1>
          <p className="mm-subtitle">Cloudinary · {CLOUD}</p>
        </div>
        <button className="mm-btn mm-btn--ghost mm-btn--icon" onClick={loadAll} disabled={loading} title="Refresh">
          <RefreshIcon />
          <span>Refresh</span>
        </button>
      </div>

      {/* Usage stats */}
      {usage && (
        <div className="mm-usage">
          {/* Storage — main card */}
          <div className="mm-usage-card mm-usage-card--storage">
            <div className="mm-usage-top">
              <span className="mm-usage-label">Storage</span>
              <span className="mm-usage-val">{fmt(storageUsed)}</span>
            </div>
            <div className="mm-progress-track">
              <div
                className="mm-progress-fill"
                style={{
                  width: storagePct + "%",
                  background: storagePct > 85 ? "#FF6600" : storagePct > 65 ? "#f0a500" : "var(--accent)",
                }}
              />
            </div>
            <div className="mm-usage-row">
              {storageFree !== null ? (
                <span className="mm-usage-free">{fmt(storageFree)} free</span>
              ) : (
                <span className="mm-usage-free">Unlimited</span>
              )}
              {storageLimit > 0 && (
                <span className="mm-usage-limit">of {fmt(storageLimit)}</span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="mm-usage-stats">
            <div className="mm-stat">
              <span className="mm-stat-n">{assets.length.toLocaleString()}</span>
              <span className="mm-stat-l">Assets</span>
            </div>
            <div className="mm-stat">
              <span className="mm-stat-n">{fmt(bandUsed)}</span>
              <span className="mm-stat-l">Bandwidth{bandLimit > 0 ? ` / ${fmt(bandLimit)}` : ""}</span>
            </div>
            <div className="mm-stat">
              <span className="mm-stat-n">{txUsed.toLocaleString()}</span>
              <span className="mm-stat-l">Transforms{txLimit > 0 ? ` / ${txLimit.toLocaleString()}` : ""}</span>
            </div>
            {credLimit > 0 && (
              <div className="mm-stat">
                <span className="mm-stat-n">{credUsed.toFixed(1)}</span>
                <span className="mm-stat-l">Credits / {credLimit}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        className={`mm-drop${drag ? " mm-drop--drag" : ""}${uploading ? " mm-drop--busy" : ""}`}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={(e)  => { e.preventDefault(); setDrag(true);  }}
        onDragLeave={()  => setDrag(false)}
        onDrop={(e)      => { e.preventDefault(); setDrag(false); uploadFiles(e.dataTransfer.files); }}
      >
        <span className="mm-drop-icon"><UploadIcon /></span>
        <span className="mm-drop-primary">
          {uploading ? "Uploading…" : drag ? "Drop to upload" : "Drop images or click to browse"}
        </span>
        <span className="mm-drop-secondary">PNG · JPG · WebP · GIF · SVG</span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => uploadFiles(e.target.files)}
      />

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
        <span className="mm-result-count">{filtered.length} image{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mm-loading">
          <div className="mm-spinner" />
          <p>Loading your media library…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mm-empty">
          <EmptyIcon />
          <p>No images found</p>
        </div>
      ) : (
        <div className="mm-grid">
          {slice.map((a) => {
            const name   = a.public_id.split("/").pop();
            const thumb  = a.secure_url.replace("/upload/", "/upload/w_320,h_320,c_fill/");
            const isDel  = deleting === a.public_id;
            return (
              <div className="mm-card" key={a.public_id}>
                <div className="mm-card-thumb">
                  <img src={thumb} alt={name} loading="lazy" />
                  <div className="mm-card-actions">
                    <button
                      className="mm-action-btn mm-action-btn--copy"
                      onClick={() => copyURL(a.secure_url)}
                      title="Copy URL"
                    >
                      <CopyIcon />
                    </button>
                    <button
                      className="mm-action-btn mm-action-btn--del"
                      onClick={() => deleteAsset(a.public_id)}
                      disabled={isDel}
                      title="Delete"
                    >
                      {isDel ? <span className="mm-mini-spin" /> : <TrashIcon />}
                    </button>
                  </div>
                </div>
                <div className="mm-card-body">
                  <p className="mm-card-name" title={a.public_id}>{name}</p>
                  <div className="mm-card-row">
                    <span className="mm-tag">{a.format?.toUpperCase() || "IMG"}</span>
                    {a.bytes > 0 && <span className="mm-card-size">{fmt(a.bytes)}</span>}
                  </div>
                  <button className="mm-url-btn" onClick={() => copyURL(a.secure_url)}>
                    Copy URL
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
          <button className="mm-btn mm-btn--ghost" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            ← Prev
          </button>
          <span className="mm-pager-info">Page {page + 1} of {totalPages}</span>
          <button className="mm-btn mm-btn--ghost" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
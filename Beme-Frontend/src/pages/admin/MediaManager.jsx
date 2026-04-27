import { useState, useEffect, useCallback, useRef } from "react";
import "./MediaManager.css";

const CLOUD   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET  = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const SECRET  = import.meta.env.VITE_CLOUDINARY_API_SECRET;

/* ── Helpers ─────────────────────────────────── */
const b64  = (s) => btoa(unescape(encodeURIComponent(s)));
const sha1 = async (s) => {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
const fmtBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "—";
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(2) + " GB";
  if (bytes >= 1_048_576)     return (bytes / 1_048_576).toFixed(1)     + " MB";
  if (bytes >= 1_024)         return (bytes / 1_024).toFixed(0)         + " KB";
  return bytes + " B";
};
const fmtDur = (s) => {
  if (!s) return null;
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};
const clamp = (v) => Math.min(100, Math.max(0, v));

/* Download blob → fallback new tab */
const dlAsset = async (url, filename) => {
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: filename,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 15_000);
  } catch {
    window.open(url, "_blank");
  }
};

/* ── Icons ───────────────────────────────────── */
const Icon = ({ d, size = 16, fill = "none", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

function UploadIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24"
      fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
}
function CopyIcon()     { return <Icon d="M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.806M10 20.971h8c1.105 0 2-.911 2-2.036V9.978c0-1.124-.895-2.036-2-2.036h-8c-1.105 0-2 .912-2 2.036v8.957c0 1.124.895 2.036 2 2.036z" size={13}/> }
function DownloadIcon() { return <Icon d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} size={13}/> }
function TrashIcon()    { return <Icon d={["M3 6h18","M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6","M10 11v6","M14 11v6","M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"]} size={13}/> }
function EmptyIcon()    { return <Icon d={["M21 15l-5-5L5 21","M3.5 3.5l17 17","M10.5 6C8 6 6 8 6 10.5","M3 3l18 18"]} size={50} strokeWidth={1.2}/> }

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
const PER = 28;

export default function MediaManager() {
  const [images,    setImages]    = useState([]);
  const [videos,    setVideos]    = useState([]);
  const [usage,     setUsage]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [tab,       setTab]       = useState("all");
  const [search,    setSearch]    = useState("");
  const [folder,    setFolder]    = useState("");
  const [page,      setPage]      = useState(0);
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [dlActive,  setDlActive]  = useState(null);
  const [toast,     setToast]     = useState(null);
  const [drag,      setDrag]      = useState(false);
  const fileRef = useRef();

  const AUTH = b64(`${API_KEY}:${SECRET}`);

  /* Toast */
  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* Fetch all pages of a resource type — images or video */
  const fetchAll = useCallback(async (resourceType) => {
    let all = [], cursor = "";
    do {
      const url =
        `https://api.cloudinary.com/v1_1/${CLOUD}/resources/${resourceType}` +
        `?max_results=100&tags=true&context=true${cursor ? "&next_cursor=" + cursor : ""}`;
      const r = await fetch(url, {
        headers: { Authorization: `Basic ${AUTH}` },
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error?.message || `HTTP ${r.status} loading ${resourceType}s`);
      }
      const d = await r.json();
      all    = all.concat(d.resources || []);
      cursor = d.next_cursor || "";
    } while (cursor);
    return all;
  }, [AUTH]);

  /* Load everything */
  const loadAll = useCallback(async () => {
    if (!CLOUD || !API_KEY || !SECRET) {
      setError("Missing env vars: VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_API_KEY / VITE_CLOUDINARY_API_SECRET");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    /* Usage — non-fatal, fetched in parallel */
    fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/usage`, {
      headers: { Authorization: `Basic ${AUTH}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setUsage(d))
      .catch(() => {/* usage is optional */});

    try {
      const [imgs, vids] = await Promise.all([
        fetchAll("image"),
        fetchAll("video").catch(() => []),   // videos may not exist yet
      ]);
      setImages(imgs);
      setVideos(vids);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [AUTH, fetchAll]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { setPage(0); }, [tab, search, folder]);

  /* Combined + filtered list */
  const allAssets = [
    ...images.map((a) => ({ ...a, _type: "image" })),
    ...videos.map((a) => ({ ...a, _type: "video" })),
  ];
  const baseList =
    tab === "images" ? images.map((a) => ({ ...a, _type: "image" })) :
    tab === "videos" ? videos.map((a) => ({ ...a, _type: "video" })) :
    allAssets;

  const filtered = baseList.filter((a) => {
    const q = search.toLowerCase();
    return (
      (!q      || a.public_id.toLowerCase().includes(q)) &&
      (!folder || (a.folder || "(root)") === folder)
    );
  });

  const slice      = filtered.slice(page * PER, (page + 1) * PER);
  const totalPages = Math.ceil(filtered.length / PER);
  const folders    = [...new Set(allAssets.map((a) => a.folder || "(root)"))].sort();

  /* Storage bar data */
  const storUsed  = usage?.storage?.usage  ?? 0;
  const storLimit = usage?.storage?.limit  ?? 0;
  const storFree  = storLimit ? storLimit - storUsed : null;
  const storPct   = clamp(storLimit ? (storUsed / storLimit) * 100 : 0);
  const storColour =
    storPct > 85 ? "#FF6600" :
    storPct > 65 ? "#f0a500" :
    "var(--accent)";

  const bandUsed  = usage?.bandwidth?.usage        ?? 0;
  const bandLimit = usage?.bandwidth?.limit        ?? 0;
  const bandPct   = clamp(bandLimit ? (bandUsed / bandLimit) * 100 : 0);
  const txUsed    = usage?.transformations?.usage  ?? 0;
  const txLimit   = usage?.transformations?.limit  ?? 0;
  const txPct     = clamp(txLimit ? (txUsed / txLimit) * 100 : 0);

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
      if (Object.values(d.deleted || {}).includes("deleted")) {
        if (resourceType === "image") setImages((p) => p.filter((a) => a.public_id !== publicId));
        else                          setVideos((p) => p.filter((a) => a.public_id !== publicId));
        notify("Deleted");
      } else {
        notify("Delete failed — check console", "error");
        console.error(d);
      }
    } catch (e) { notify("Error: " + e.message, "error"); }
    setDeleting(null);
  };

  /* Download */
  const handleDownload = async (asset) => {
    const ext  = asset.format || (asset._type === "video" ? "mp4" : "jpg");
    const name = asset.public_id.split("/").pop() + "." + ext;
    setDlActive(asset.public_id);
    notify("Starting download…");
    await dlAsset(asset.secure_url, name);
    setDlActive(null);
  };

  /* Upload */
  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    let done = 0;
    for (const file of files) {
      const type = file.type.startsWith("video/") ? "video" : "image";
      const fd   = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", PRESET);
      try {
        const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${type}/upload`, {
          method: "POST", body: fd,
        });
        const d = await r.json();
        if (d.secure_url) {
          if (type === "video") setVideos((p) => [{ ...d, _type: "video" }, ...p]);
          else                  setImages((p) => [{ ...d, _type: "image" }, ...p]);
          done++;
        } else notify("Upload failed: " + (d.error?.message || "unknown"), "error");
      } catch (e) { notify("Upload error: " + e.message, "error"); }
    }
    if (done) notify(`Uploaded ${done} file${done > 1 ? "s" : ""}`);
    setUploading(false);
    /* refresh usage */
    fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/usage`, {
      headers: { Authorization: `Basic ${AUTH}` },
    }).then((r) => r.ok ? r.json() : null).then((d) => d && setUsage(d)).catch(() => {});
  };

  const copyURL = (url) =>
    navigator.clipboard.writeText(url)
      .then(() => notify("URL copied!"))
      .catch(() => window.prompt("Copy URL:", url));

  /* ── Render ── */
  return (
    <div className="mm">

      {/* ── Toast ── */}
      {toast && <div className={`mm-toast mm-toast--${toast.type}`}>{toast.msg}</div>}

      {/* ── Header ── */}
      <div className="mm-header">
        <div>
          <h1 className="mm-title">Media Manager</h1>
          <p className="mm-sub">Cloudinary · {CLOUD || "not configured"}</p>
        </div>
        <button className="mm-ghost-btn" onClick={loadAll} disabled={loading}>
          <RefreshIcon /> Refresh
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mm-error-banner">
          <strong>Load failed:</strong> {error}
          <button onClick={loadAll}>Retry</button>
        </div>
      )}

      {/* ── Storage linear graph ── */}
      <div className="mm-storage-section">
        <div className="mm-storage-header">
          <span className="mm-storage-title">Storage</span>
          <span className="mm-storage-vals">
            <strong>{fmtBytes(storUsed)}</strong>
            {storFree !== null && <span className="mm-storage-free"> · {fmtBytes(storFree)} free</span>}
            {storLimit > 0    && <span className="mm-storage-limit"> of {fmtBytes(storLimit)}</span>}
          </span>
        </div>

        {/* Linear bar */}
        <div className="mm-bar-track">
          <div
            className="mm-bar-fill"
            style={{ width: storPct + "%", background: storColour }}
          />
          {/* tick marks every 25% */}
          {[25, 50, 75].map((t) => (
            <div key={t} className="mm-bar-tick" style={{ left: t + "%" }} />
          ))}
        </div>
        <div className="mm-bar-labels">
          <span>0</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>

        {/* Sub-stats row */}
        <div className="mm-stat-row">
          <div className="mm-stat-pill">
            <span className="mm-stat-pill-label">Images</span>
            <span className="mm-stat-pill-val">{images.length.toLocaleString()}</span>
          </div>
          <div className="mm-stat-pill">
            <span className="mm-stat-pill-label">Videos</span>
            <span className="mm-stat-pill-val">{videos.length.toLocaleString()}</span>
          </div>

          {/* Bandwidth mini bar */}
          {bandLimit > 0 && (
            <div className="mm-stat-pill mm-stat-pill--wide">
              <div className="mm-mini-bar-row">
                <span className="mm-stat-pill-label">Bandwidth</span>
                <span className="mm-stat-pill-val">{fmtBytes(bandUsed)} / {fmtBytes(bandLimit)}</span>
              </div>
              <div className="mm-mini-track">
                <div className="mm-mini-fill" style={{ width: bandPct + "%",
                  background: bandPct > 85 ? "#FF6600" : bandPct > 65 ? "#f0a500" : "var(--accent)" }} />
              </div>
            </div>
          )}

          {/* Transforms mini bar */}
          {txLimit > 0 && (
            <div className="mm-stat-pill mm-stat-pill--wide">
              <div className="mm-mini-bar-row">
                <span className="mm-stat-pill-label">Transforms</span>
                <span className="mm-stat-pill-val">{txUsed.toLocaleString()} / {txLimit.toLocaleString()}</span>
              </div>
              <div className="mm-mini-track">
                <div className="mm-mini-fill" style={{ width: txPct + "%",
                  background: txPct > 85 ? "#FF6600" : txPct > 65 ? "#f0a500" : "var(--accent)" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Upload zone ── */}
      <div
        className={`mm-drop${drag ? " mm-drop--over" : ""}${uploading ? " mm-drop--busy" : ""}`}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={(e)  => { e.preventDefault(); setDrag(true);  }}
        onDragLeave={()  => setDrag(false)}
        onDrop={(e)      => { e.preventDefault(); setDrag(false); uploadFiles(e.dataTransfer.files); }}
      >
        <span className="mm-drop-icon"><UploadIcon /></span>
        <span className="mm-drop-main">
          {uploading ? "Uploading…" : drag ? "Drop to upload" : "Drop files or click to browse"}
        </span>
        <span className="mm-drop-hint">
          Images: PNG · JPG · WebP · GIF · SVG &nbsp;|&nbsp; Videos: MP4 · MOV · AVI · WebM
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

      {/* ── Tabs ── */}
      <div className="mm-tabs">
        {[
          { id: "all",    label: `All (${allAssets.length})` },
          { id: "images", label: `Images (${images.length})` },
          { id: "videos", label: `Videos (${videos.length})` },
        ].map(({ id, label }) => (
          <button
            key={id}
            className={`mm-tab${tab === id ? " mm-tab--on" : ""}`}
            onClick={() => setTab(id)}
          >{label}</button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="mm-toolbar">
        <input
          className="mm-search"
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

      {/* ── Grid ── */}
      {loading ? (
        <div className="mm-center">
          <div className="mm-spinner" />
          <p>Loading your media library…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mm-center mm-empty">
          <EmptyIcon />
          <p>{error ? "Failed to load — check your API credentials" : "No files found"}</p>
        </div>
      ) : (
        <div className="mm-grid">
          {slice.map((a) => {
            const isVid  = a._type === "video";
            const name   = a.public_id.split("/").pop();
            const ext    = a.format || (isVid ? "mp4" : "jpg");
            const thumb  = isVid
              ? `https://res.cloudinary.com/${CLOUD}/video/upload/w_320,h_320,c_fill,so_0/${a.public_id}.jpg`
              : a.secure_url.replace("/upload/", "/upload/w_320,h_320,c_fill/");
            const dur    = isVid ? fmtDur(a.duration) : null;
            const isDel  = deleting === a.public_id;
            const isDl   = dlActive === a.public_id;

            return (
              <div className={`mm-card${isVid ? " mm-card--vid" : ""}`} key={a.public_id + a._type}>
                <div className="mm-thumb">
                  <img src={thumb} alt={name} loading="lazy" />
                  {isVid && <div className="mm-play"><PlayIcon /></div>}
                  {dur   && <span className="mm-dur">{dur}</span>}
                  <div className="mm-hover-actions">
                    <button className="mm-ha mm-ha--copy" onClick={() => copyURL(a.secure_url)} title="Copy URL"><CopyIcon /></button>
                    <button className={`mm-ha mm-ha--dl${isDl ? " mm-ha--spin" : ""}`} onClick={() => handleDownload(a)} disabled={isDl} title="Download">
                      {isDl ? <span className="mm-mini-spin" /> : <DownloadIcon />}
                    </button>
                    <button className="mm-ha mm-ha--del" onClick={() => deleteAsset(a.public_id, a._type)} disabled={isDel} title="Delete">
                      {isDel ? <span className="mm-mini-spin" /> : <TrashIcon />}
                    </button>
                  </div>
                </div>
                <div className="mm-card-body">
                  <p className="mm-name" title={a.public_id}>{name}</p>
                  <div className="mm-meta">
                    <span className={`mm-badge${isVid ? " mm-badge--vid" : ""}`}>{ext.toUpperCase()}</span>
                    {a.bytes > 0 && <span className="mm-size">{fmtBytes(a.bytes)}</span>}
                  </div>
                  <div className="mm-card-actions">
                    <button className="mm-copy-btn" onClick={() => copyURL(a.secure_url)}>Copy URL</button>
                    <button className="mm-dl-btn" onClick={() => handleDownload(a)} disabled={isDl} title="Download">
                      {isDl ? <span className="mm-mini-spin" /> : <DownloadIcon />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mm-pager">
          <button className="mm-ghost-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>← Prev</button>
          <span className="mm-pager-info">Page {page + 1} / {totalPages}</span>
          <button className="mm-ghost-btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
        </div>
      )}
    </div>
  );
}
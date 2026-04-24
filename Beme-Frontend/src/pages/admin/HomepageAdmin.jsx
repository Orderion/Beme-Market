import { useEffect, useRef, useState } from "react";
import { useNavigate }                  from "react-router-dom";
import { doc, getDoc, setDoc }         from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db }                          from "../../firebase";
import { uploadToCloudinary }          from "../../utils/cloudinaryUpload";
import "./HomepageAdmin.css";

/* ─────────────────────────────────────────────
   Constants & defaults
───────────────────────────────────────────── */
const DEFAULT_SECTIONS = [
  { id: "carousel",         label: "Shop Carousel",      active: true, order: 0 },
  { id: "categories",       label: "Categories",         active: true, order: 1 },
  { id: "flashDeals",       label: "Flash Deals Banner", active: true, order: 2 },
  { id: "trending",         label: "Trending Now",       active: true, order: 3 },
  { id: "continueShopping", label: "Continue Shopping",  active: true, order: 4 },
];

const DEFAULT_STORE_CARDS = [
  { id: "fashion",  theme: "fashion",     chip: "Fashion Shop",  title: "Modern fashion essentials",    subtitle: "Clean everyday style and curated wardrobe picks.",        shopLink: "/shop?shop=fashion",  imageUrl: "", active: true, order: 0 },
  { id: "main",     theme: "bestsellers", chip: "Main Store",    title: "Everyday bestsellers",         subtitle: "Mixed essentials, popular picks, and store highlights.",  shopLink: "/shop?shop=main",     imageUrl: "", active: true, order: 1 },
  { id: "kente",    theme: "kente",       chip: "Ghana Made",    title: "Mintah's Kente",              subtitle: "Premium woven styles with heritage appeal.",              shopLink: "/shop?shop=kente",    imageUrl: "", active: true, order: 2 },
  { id: "perfume",  theme: "scents",      chip: "Perfume Shop",  title: "Luxury scents",               subtitle: "Refined fragrances for daily wear and gifting.",          shopLink: "/shop?shop=perfume",  imageUrl: "", active: true, order: 3 },
  { id: "tech",     theme: "gadgets",     chip: "Tech Shop",     title: "Latest gadgets",              subtitle: "Smart devices and modern electronics for daily life.",     shopLink: "/shop?shop=tech",     imageUrl: "", active: true, order: 4 },
];

const DEFAULT_CATEGORIES = [
  { key: "iphones",         label: "Iphones",        subtitle: "Smartphones and mobile essentials",         query: "iphone",      bgColor: "#DDEEFF", imageUrl: "", active: true, order: 0 },
  { key: "laptops",         label: "Laptops",         subtitle: "Portable power for work and study",         query: "laptop",      bgColor: "#EAE7FD", imageUrl: "", active: true, order: 1 },
  { key: "shoes",           label: "Shoes",           subtitle: "Sneakers, formal pairs, and daily comfort", query: "shoes",       bgColor: "#FFE8DF", imageUrl: "", active: true, order: 2 },
  { key: "clothing",        label: "Clothing",        subtitle: "Fresh fits and wardrobe staples",           query: "clothing",    bgColor: "#FFE3EE", imageUrl: "", active: true, order: 3 },
  { key: "kids",            label: "Kids",            subtitle: "Everyday picks for little ones",            query: "kids",        bgColor: "#FFF0D6", imageUrl: "", active: true, order: 4 },
  { key: "game",            label: "Game",            subtitle: "Consoles, accessories, and gaming gear",    query: "game",        bgColor: "#DDF3E4", imageUrl: "", active: true, order: 5 },
  { key: "home_appliances", label: "Home Appliances", subtitle: "Essentials for modern living",              query: "appliances",  bgColor: "#D6F4EC", imageUrl: "", active: true, order: 6 },
  { key: "others",          label: "Others",          subtitle: "Accessories, extras, and more",             query: "accessories", bgColor: "#FFF3DB", imageUrl: "", active: true, order: 7 },
];

/* ─────────────────────────────────────────────
   Tiny reusable pieces
───────────────────────────────────────────── */
function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      className={`ha-toggle ${on ? "ha-toggle--on" : ""}`}
      onClick={() => onChange(!on)}
      aria-label={label}
      title={on ? "Active — click to hide" : "Hidden — click to show"}
    >
      <span className="ha-toggle-knob" />
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", hint }) {
  return (
    <div className="ha-field">
      <label className="ha-field-label">{label}</label>
      {hint && <span className="ha-field-hint">{hint}</span>}
      <input
        type={type}
        className="ha-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Image Upload Zone
   Supports multiple files, preview, progress
───────────────────────────────────────────── */
function ImageUploadZone({ currentUrl, onUploadComplete, label = "Image", folder = "beme_market/homepage" }) {
  const [previews,  setPreviews]  = useState([]);   // { localId, file, previewUrl, progress, done, url, error }
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPreviews = files.map((file) => ({
      localId:    Math.random().toString(36).slice(2),
      file,
      previewUrl: URL.createObjectURL(file),
      progress:   0,
      done:       false,
      url:        null,
      error:      null,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
    // Reset input so same file can be re-picked
    e.target.value = "";
  };

  const removePreview = (localId) => {
    setPreviews((prev) => {
      const item = prev.find((p) => p.localId === localId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const uploadOne = async (preview) => {
    try {
      const result = await uploadToCloudinary(
        preview.file,
        (pct) => {
          setPreviews((prev) =>
            prev.map((p) => p.localId === preview.localId ? { ...p, progress: pct } : p)
          );
        },
        folder
      );
      setPreviews((prev) =>
        prev.map((p) =>
          p.localId === preview.localId ? { ...p, done: true, progress: 100, url: result.url } : p
        )
      );
      return result.url;
    } catch (err) {
      setPreviews((prev) =>
        prev.map((p) =>
          p.localId === preview.localId ? { ...p, error: err.message } : p
        )
      );
      return null;
    }
  };

  const handleUploadAll = async () => {
    const pending = previews.filter((p) => !p.done && !p.error);
    if (!pending.length) return;
    setUploading(true);
    const urls = [];
    for (const preview of pending) {
      const url = await uploadOne(preview);
      if (url) urls.push(url);
    }
    setUploading(false);
    // Call back with the LAST uploaded URL (for single-image fields)
    // or all URLs (caller decides)
    if (urls.length && onUploadComplete) onUploadComplete(urls);
  };

  const pendingCount = previews.filter((p) => !p.done && !p.error).length;

  return (
    <div className="ha-imgzone">
      <div className="ha-imgzone-label">{label}</div>

      {/* Current saved image */}
      {currentUrl && !previews.some((p) => p.done) && (
        <div className="ha-imgzone-current">
          <img src={currentUrl} alt="Current" className="ha-imgzone-current-img" />
          <span className="ha-imgzone-current-badge">Saved</span>
        </div>
      )}

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="ha-imgzone-grid">
          {previews.map((p) => (
            <div key={p.localId} className={`ha-imgzone-thumb ${p.done ? "done" : ""} ${p.error ? "error" : ""}`}>
              <img src={p.previewUrl} alt="" className="ha-imgzone-thumb-img" />

              {/* Progress bar */}
              {!p.done && !p.error && (
                <div className="ha-imgzone-progress">
                  <div className="ha-imgzone-progress-bar" style={{ width: `${p.progress}%` }} />
                </div>
              )}

              {/* Status badges */}
              {p.done  && <span className="ha-imgzone-badge ha-imgzone-badge--done">✓ Uploaded</span>}
              {p.error && <span className="ha-imgzone-badge ha-imgzone-badge--err"  title={p.error}>✕ Failed</span>}

              {/* Remove button */}
              {!uploading && (
                <button
                  type="button"
                  className="ha-imgzone-remove"
                  onClick={() => removePreview(p.localId)}
                  aria-label="Remove"
                >×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="ha-imgzone-actions">
        <button
          type="button"
          className="ha-btn ha-btn--ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          + Choose images
        </button>

        {pendingCount > 0 && (
          <button
            type="button"
            className="ha-btn ha-btn--upload"
            onClick={handleUploadAll}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : `Upload ${pendingCount} image${pendingCount > 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handlePick}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section order panel
───────────────────────────────────────────── */
function SectionOrderPanel({ sections, onChange }) {
  const move = (index, dir) => {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((s, i) => ({ ...s, order: i })));
  };

  const toggle = (index) => {
    const next = [...sections];
    next[index] = { ...next[index], active: !next[index].active };
    onChange(next);
  };

  return (
    <div className="ha-order-panel">
      <p className="ha-order-hint">Drag or use arrows to reorder. Toggle to show/hide each section.</p>
      <div className="ha-order-list">
        {sections.map((sec, i) => (
          <div key={sec.id} className={`ha-order-row ${!sec.active ? "ha-order-row--off" : ""}`}>
            <span className="ha-order-grip">⠿</span>
            <span className="ha-order-label">{sec.label}</span>
            <div className="ha-order-controls">
              <button type="button" className="ha-order-arrow" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className="ha-order-arrow" onClick={() => move(i, +1)} disabled={i === sections.length - 1} aria-label="Move down">↓</button>
              <Toggle on={sec.active} onChange={() => toggle(i)} label={`Toggle ${sec.label}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Carousel editor
───────────────────────────────────────────── */
function CarouselEditor({ cards, onChange }) {
  const [selected, setSelected] = useState(0);

  const update = (index, field, value) => {
    const next = [...cards];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const move = (index, dir) => {
    const next  = [...cards];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((c, i) => ({ ...c, order: i })));
    setSelected(target);
  };

  const addCard = () => {
    const newCard = {
      id:       `card_${Date.now()}`,
      theme:    "custom",
      chip:     "New Store",
      title:    "New card title",
      subtitle: "Card subtitle here",
      shopLink: "/shop",
      imageUrl: "",
      active:   true,
      order:    cards.length,
    };
    onChange([...cards, newCard]);
    setSelected(cards.length);
  };

  const removeCard = (index) => {
    const next = cards.filter((_, i) => i !== index);
    onChange(next.map((c, i) => ({ ...c, order: i })));
    setSelected(Math.max(0, index - 1));
  };

  const card = cards[selected];

  return (
    <div className="ha-carousel-editor">
      {/* Card tabs */}
      <div className="ha-card-tabs">
        {cards.map((c, i) => (
          <button
            key={c.id || i}
            type="button"
            className={`ha-card-tab ${i === selected ? "active" : ""} ${!c.active ? "off" : ""}`}
            onClick={() => setSelected(i)}
          >
            {c.chip || `Card ${i + 1}`}
          </button>
        ))}
        <button type="button" className="ha-card-tab ha-card-tab--add" onClick={addCard}>+ Add</button>
      </div>

      {card && (
        <div className="ha-card-editor">
          <div className="ha-card-editor-top">
            <div className="ha-card-editor-actions">
              <button type="button" className="ha-btn ha-btn--sm" onClick={() => move(selected, -1)} disabled={selected === 0}>← Move left</button>
              <button type="button" className="ha-btn ha-btn--sm" onClick={() => move(selected, +1)} disabled={selected === cards.length - 1}>Move right →</button>
              <Toggle on={card.active} onChange={(v) => update(selected, "active", v)} label="Card active" />
              <button type="button" className="ha-btn ha-btn--danger ha-btn--sm" onClick={() => removeCard(selected)}>Remove</button>
            </div>
          </div>

          <div className="ha-card-editor-body">
            <div className="ha-card-editor-left">
              <ImageUploadZone
                label="Banner image"
                currentUrl={card.imageUrl}
                folder="beme_market/homepage/banners"
                onUploadComplete={(urls) => update(selected, "imageUrl", urls[urls.length - 1])}
              />
            </div>
            <div className="ha-card-editor-right">
              <Field label="Chip / Badge text" value={card.chip}     onChange={(v) => update(selected, "chip",     v)} placeholder="e.g. Fashion Shop" />
              <Field label="Title"              value={card.title}    onChange={(v) => update(selected, "title",    v)} placeholder="Card title" />
              <Field label="Subtitle"           value={card.subtitle} onChange={(v) => update(selected, "subtitle", v)} placeholder="Short description" />
              <Field label="Shop link"          value={card.shopLink} onChange={(v) => update(selected, "shopLink", v)} placeholder="/shop?shop=fashion" hint="URL path or query" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Categories editor
───────────────────────────────────────────── */
function CategoriesEditor({ categories, onChange }) {
  const [selected, setSelected] = useState(0);

  const update = (index, field, value) => {
    const next = [...categories];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const move = (index, dir) => {
    const next   = [...categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((c, i) => ({ ...c, order: i })));
    setSelected(target);
  };

  const cat = categories[selected];

  return (
    <div className="ha-cats-editor">
      {/* Category list */}
      <div className="ha-cats-list">
        {categories.map((c, i) => (
          <button
            key={c.key}
            type="button"
            className={`ha-cats-item ${i === selected ? "active" : ""} ${!c.active ? "off" : ""}`}
            onClick={() => setSelected(i)}
          >
            {c.imageUrl
              ? <img src={c.imageUrl} alt="" className="ha-cats-item-img" />
              : <span className="ha-cats-item-placeholder" style={{ background: c.bgColor }}>?</span>
            }
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {cat && (
        <div className="ha-cat-detail">
          <div className="ha-cat-detail-top">
            <h4 className="ha-cat-detail-title">{cat.label}</h4>
            <div className="ha-cat-detail-controls">
              <button type="button" className="ha-btn ha-btn--sm" onClick={() => move(selected, -1)} disabled={selected === 0}>↑ Up</button>
              <button type="button" className="ha-btn ha-btn--sm" onClick={() => move(selected, +1)} disabled={selected === categories.length - 1}>↓ Down</button>
              <Toggle on={cat.active} onChange={(v) => update(selected, "active", v)} label="Category active" />
            </div>
          </div>

          <div className="ha-cat-detail-body">
            <div className="ha-cat-detail-left">
              <ImageUploadZone
                label="Category image"
                currentUrl={cat.imageUrl}
                folder="beme_market/homepage/categories"
                onUploadComplete={(urls) => update(selected, "imageUrl", urls[urls.length - 1])}
              />
            </div>
            <div className="ha-cat-detail-right">
              <Field label="Label"    value={cat.label}    onChange={(v) => update(selected, "label",    v)} placeholder="Category name" />
              <Field label="Subtitle" value={cat.subtitle} onChange={(v) => update(selected, "subtitle", v)} placeholder="Short description" />
              <Field label="Query"    value={cat.query}    onChange={(v) => update(selected, "query",    v)} placeholder="Search query (e.g. iphone)" hint="Used in URL when user clicks" />
              <div className="ha-field">
                <label className="ha-field-label">Background colour</label>
                <div className="ha-color-row">
                  <input
                    type="color"
                    className="ha-color-swatch"
                    value={cat.bgColor || "#F1EFE8"}
                    onChange={(e) => update(selected, "bgColor", e.target.value)}
                  />
                  <input
                    type="text"
                    className="ha-input ha-input--color"
                    value={cat.bgColor || "#F1EFE8"}
                    onChange={(e) => update(selected, "bgColor", e.target.value)}
                    placeholder="#F1EFE8"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Text section editor (Trending / Continue)
───────────────────────────────────────────── */
function TextSectionEditor({ value, onChange, fields }) {
  return (
    <div className="ha-text-editor">
      {fields.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          value={value?.[f.key] || ""}
          onChange={(v) => onChange({ ...value, [f.key]: v })}
          placeholder={f.placeholder}
          hint={f.hint}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main HomepageAdmin component
───────────────────────────────────────────── */
export default function HomepageAdmin() {
  const navigate = useNavigate();

  /* ── Auth & role check ── */
  const [authReady, setAuthReady] = useState(false);
  const [allowed,   setAllowed]   = useState(false);

  /* ── Config state ── */
  const [sections,      setSections]      = useState(DEFAULT_SECTIONS);
  const [storeCards,    setStoreCards]    = useState(DEFAULT_STORE_CARDS);
  const [categories,    setCategories]    = useState(DEFAULT_CATEGORIES);
  const [trendingText,  setTrendingText]  = useState({ heading: "Trending now",      seeAllText: "See featured" });
  const [continueText,  setContinueText]  = useState({ heading: "Continue shopping", seeAllText: "See all"      });

  /* ── UI state ── */
  const [activeTab,  setActiveTab]  = useState("order");   // order | carousel | categories | flash | trending | continue
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);      // null | "saved" | "error"
  const [loading,    setLoading]    = useState(true);

  /* ── Role guard ── */
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setAuthReady(true); setAllowed(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.data()?.role || "";
        setAllowed(role === "admin" || role === "superadmin");
      } catch (_) {
        setAllowed(false);
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  /* ── Load existing config ── */
  useEffect(() => {
    if (!allowed) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "homepage", "config"));
        if (snap.exists()) {
          const d = snap.data();
          if (d.sections?.length)    setSections(d.sections);
          if (d.storeCards?.length)  setStoreCards(d.storeCards);
          if (d.categories?.length)  setCategories(d.categories);
          if (d.trendingText)        setTrendingText(d.trendingText);
          if (d.continueText)        setContinueText(d.continueText);
        }
      } catch (err) {
        console.error("Load config error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed]);

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await setDoc(
        doc(db, "homepage", "config"),
        { sections, storeCards, categories, trendingText, continueText },
        { merge: true }
      );
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  /* ── Guards ── */
  if (!authReady) {
    return (
      <div className="ha-gate">
        <div className="ha-gate-spinner" />
        <p>Checking access…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="ha-gate ha-gate--denied">
        <div className="ha-gate-icon">⊘</div>
        <h2>Access denied</h2>
        <p>This page is restricted to admins.</p>
        <button className="ha-btn ha-btn--primary" onClick={() => navigate("/")}>Go home</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ha-gate">
        <div className="ha-gate-spinner" />
        <p>Loading homepage config…</p>
      </div>
    );
  }

  const TABS = [
    { id: "order",          label: "Section order"     },
    { id: "carousel",       label: "Shop carousel"     },
    { id: "categories",     label: "Categories"        },
    { id: "flash",          label: "Flash deals"       },
    { id: "trending",       label: "Trending section"  },
    { id: "continue",       label: "Continue shopping" },
  ];

  return (
    <div className="ha-root">

      {/* ── Header ── */}
      <header className="ha-header">
        <div className="ha-header-left">
          <button type="button" className="ha-back-btn" onClick={() => navigate("/admin")} aria-label="Back to admin">
            ←
          </button>
          <div>
            <div className="ha-header-brand">Beme Market</div>
            <h1 className="ha-header-title">Homepage Editor</h1>
          </div>
        </div>
        <div className="ha-header-right">
          {saveStatus === "saved" && <span className="ha-save-badge ha-save-badge--ok">✓ Saved</span>}
          {saveStatus === "error" && <span className="ha-save-badge ha-save-badge--err">✕ Error</span>}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="ha-btn ha-btn--ghost ha-btn--sm"
          >
            Preview site ↗
          </a>
          <button
            type="button"
            className={`ha-btn ha-btn--primary ${saving ? "loading" : ""}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save all changes"}
          </button>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="ha-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            className={`ha-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Tab panels ── */}
      <main className="ha-main">

        {activeTab === "order" && (
          <div className="ha-panel">
            <div className="ha-panel-head">
              <h2>Section order &amp; visibility</h2>
              <p>Control which sections appear on the homepage and in what order.</p>
            </div>
            <SectionOrderPanel sections={sections} onChange={setSections} />
          </div>
        )}

        {activeTab === "carousel" && (
          <div className="ha-panel">
            <div className="ha-panel-head">
              <h2>Shop carousel</h2>
              <p>Edit the banner cards that scroll across the top of the homepage. Upload images, edit text, reorder, or hide cards.</p>
            </div>
            <CarouselEditor cards={storeCards} onChange={setStoreCards} />
          </div>
        )}

        {activeTab === "categories" && (
          <div className="ha-panel">
            <div className="ha-panel-head">
              <h2>Categories</h2>
              <p>Manage the category icons shown below the carousel. Change images, labels, colours, and order.</p>
            </div>
            <CategoriesEditor categories={categories} onChange={setCategories} />
          </div>
        )}

        {activeTab === "flash" && (
          <div className="ha-panel">
            <div className="ha-panel-head">
              <h2>Flash Deals Banner</h2>
              <p>
                The Flash Deals banner pulls live data from your products. Use the{" "}
                <strong>Section order</strong> tab to toggle it on or off.
              </p>
            </div>
            <div className="ha-flash-note">
              <div className="ha-flash-note-icon">⚡</div>
              <div>
                <strong>No configuration needed here.</strong>
                <br />
                Flash deals are driven by products in Firestore marked with a flash deal flag.
                To hide/show this section go to the <button type="button" className="ha-link" onClick={() => setActiveTab("order")}>Section order tab</button>.
              </div>
            </div>
          </div>
        )}

        {activeTab === "trending" && (
          <div className="ha-panel">
            <div className="ha-panel-head">
              <h2>Trending Now section</h2>
              <p>Edit the heading and button text for the Trending Now product grid.</p>
            </div>
            <TextSectionEditor
              value={trendingText}
              onChange={setTrendingText}
              fields={[
                { key: "heading",    label: "Section heading",    placeholder: "Trending now",    hint: "Displayed above the product grid" },
                { key: "seeAllText", label: '"See all" button text', placeholder: "See featured", hint: "Links to /shop?featured=1" },
              ]}
            />
          </div>
        )}

        {activeTab === "continue" && (
          <div className="ha-panel">
            <div className="ha-panel-head">
              <h2>Continue Shopping section</h2>
              <p>Edit the heading and button text for the Continue Shopping product grid.</p>
            </div>
            <TextSectionEditor
              value={continueText}
              onChange={setContinueText}
              fields={[
                { key: "heading",    label: "Section heading",    placeholder: "Continue shopping", hint: "Displayed above the product grid" },
                { key: "seeAllText", label: '"See all" button text', placeholder: "See all",        hint: "Links to /shop" },
              ]}
            />
          </div>
        )}

      </main>

      {/* ── Floating save bar on mobile ── */}
      <div className="ha-mobile-save">
        <button
          type="button"
          className={`ha-btn ha-btn--primary ha-btn--full ${saving ? "loading" : ""}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save all changes"}
        </button>
      </div>

    </div>
  );
}
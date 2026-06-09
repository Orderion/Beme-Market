// src/pages/dashboard/DashboardAppearance.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import { uploadImageToCloudinary, validateImageFile } from "../../lib/cloudinary";

/* ── Icons ── */
function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {String(d).split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const IC = {
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12",
  close:  "M18 6L6 18|M6 6l12 12",
  save:   "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z|M17 21v-8H7v8|M7 3v5h8",
  check:  "M20 6L9 17l-5-5",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|M12 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  store:  "M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z|M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9",
  trash:  "M3 6h18|M19 6l-1 14H6L5 6|M10 11v6|M14 11v6|M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  warn:   "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01",
  phone:  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 12 19.79 19.79 0 0 1 1.04 3.33 2 2 0 0 1 3 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  ig:     "M17.5 2h-11A5.5 5.5 0 0 0 1 7.5v9A5.5 5.5 0 0 0 6.5 22h11a5.5 5.5 0 0 0 5.5-5.5v-9A5.5 5.5 0 0 0 17.5 2z|M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z|M17.5 6.5h.01",
  tt:     "M9 18V5l12-2v13|M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6|M18 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  link:   "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71|M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  chat:   "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  image:  "M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4 3 3 3-3 4 4z",
  copy:   "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2|M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z",
  lock:   "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4",
};

/* ── Image uploader ── */
function ImgUpload({ value, onChange, uploading, isLogo, label, hint }) {
  const inputRef = useRef(null);

  const onFile = async (file) => {
    try { validateImageFile(file); } catch (e) { alert(e.message); return; }
    onChange("", true);
    try {
      const r = await uploadImageToCloudinary(file);
      onChange(r.url, false);
    } catch {
      alert("Upload failed.");
      onChange("", false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="da-img-upload">
      <div className="da-field-label">{label}</div>

      {value ? (
        <div className="da-img-preview-wrap" style={{ borderRadius: isLogo ? "50%" : 12 }}>
          <img src={value} alt={label}
            style={{
              width: isLogo ? 72 : "100%",
              height: isLogo ? 72 : 160,
              objectFit: "cover",
              borderRadius: isLogo ? "50%" : 10,
              display: "block",
            }} />
          <button type="button" className="da-img-remove"
            style={{ borderRadius: "50%" }}
            onClick={() => onChange("", false)}>
            <Ico d={IC.close} size={10} color="#fff" />
          </button>
        </div>
      ) : (
        <div
          className="da-img-drop"
          style={{
            width: isLogo ? 72 : "100%",
            height: isLogo ? 72 : 140,
            borderRadius: isLogo ? "50%" : 10,
            cursor: uploading ? "wait" : "pointer",
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}>
          {uploading
            ? <div className="da-spinner" />
            : <>
                <Ico d={IC.upload} size={isLogo ? 18 : 20} color="var(--sd-muted)" />
                {!isLogo && <span className="da-img-drop-label">Click or drag to upload</span>}
              </>
          }
        </div>
      )}

      {hint && <div className="da-field-hint">{hint}</div>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

/* ── Field ── */
function Field({ label, hint, icon, value, onChange, placeholder, multiline, type = "text", disabled }) {
  return (
    <div className="da-field">
      {label && <div className="da-field-label">{label}</div>}
      <div className="da-field-inner">
        {icon && <span className="da-field-icon"><Ico d={icon} size={14} color="var(--sd-muted)" /></span>}
        {multiline
          ? <textarea rows={3} value={value || ""} onChange={onChange} placeholder={placeholder}
              className={`da-input da-input--textarea${icon ? " da-input--icon" : ""}`}
              disabled={disabled} />
          : <input type={type} value={value || ""} onChange={onChange} placeholder={placeholder}
              className={`da-input${icon ? " da-input--icon" : ""}`}
              disabled={disabled} />
        }
      </div>
      {hint && <div className="da-field-hint">{hint}</div>}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, children, badge }) {
  return (
    <div className="da-section">
      <div className="da-section-head">
        <div className="da-section-title">{title}</div>
        {badge}
      </div>
      {children}
    </div>
  );
}

/* ── Live Preview (matches real StoreFront layout) ── */
function StorePreview({ form }) {
  const letter  = (form.shopName || "S").charAt(0).toUpperCase();
  const socials = [
    form.whatsapp  && { label: "WhatsApp",  color: "#25D366" },
    form.instagram && { label: "Instagram", color: "#E1306C" },
    form.tiktok    && { label: "TikTok",    color: "var(--sd-text)" },
    form.website   && { label: "Website",   color: "var(--sd-accent)" },
  ].filter(Boolean);

  return (
    <div className="da-preview">
      {/* Banner */}
      <div className="da-preview-banner">
        {form.bannerUrl
          ? <img src={form.bannerUrl} alt="" className="da-preview-banner-img" />
          : <div className="da-preview-banner-empty">
              <Ico d={IC.image} size={20} color="var(--sd-border)" />
            </div>
        }
        <div className="da-preview-banner-fade" />
      </div>

      {/* Profile card */}
      <div className="da-preview-card">
        {/* Logo overlapping banner */}
        <div className="da-preview-logo">
          {form.logoUrl
            ? <img src={form.logoUrl} alt="" className="da-preview-logo-img" />
            : <span className="da-preview-logo-letter">{letter}</span>
          }
        </div>

        <div className="da-preview-info">
          <div className="da-preview-name">{form.shopName || "Your Store Name"}</div>
          {form.description && (
            <div className="da-preview-desc">{form.description}</div>
          )}

          {/* Socials */}
          {socials.length > 0 && (
            <div className="da-preview-socials">
              {socials.map(s => (
                <span key={s.label} className="da-preview-social-pill"
                  style={{ color: s.color, borderColor: `${s.color}30`, background: `${s.color}10` }}>
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product grid placeholder */}
      <div className="da-preview-products">
        {[1,2,3,4].map(i => (
          <div key={i} className="da-preview-product-card">
            <div className="da-preview-product-img" />
            <div className="da-preview-product-line" />
            <div className="da-preview-product-price" />
          </div>
        ))}
      </div>

      <div className="da-preview-label">Live preview · customers see this</div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════ */
export default function DashboardAppearance() {
  const { shop, storeId, subscriptionPlan } = useSellerAuth();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    shopName: "", description: "",
    bannerUrl: "", logoUrl: "",
    whatsapp: "", instagram: "", tiktok: "", website: "",
    chatPreference: "whatsapp",
  });

  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [upBanner,   setUpBanner]   = useState(false);
  const [upLogo,     setUpLogo]     = useState(false);
  const [showDelDlg, setShowDelDlg] = useState(false);
  const [delConfirm, setDelConfirm] = useState("");
  const [delError,   setDelError]   = useState("");
  const [deleting,   setDeleting]   = useState(false);
  const [copied,     setCopied]     = useState(false);

  /* Load shop data */
  useEffect(() => {
    const sid = storeId || user?.uid;
    if (!sid || shop) return;
    (async () => {
      const ref  = doc(db, "shops", sid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          ownerId: sid, shopName: user?.displayName || "My Store",
          slug: sid, status: "active", planId: "basic",
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    })().catch(console.error);
  }, [storeId, user?.uid, shop]);

  useEffect(() => {
    if (!shop) return;
    setForm({
      shopName:       shop.shopName       || "",
      description:    shop.description    || "",
      bannerUrl:      shop.bannerUrl      || "",
      logoUrl:        shop.logoUrl        || "",
      whatsapp:       shop.whatsapp       || "",
      instagram:      shop.instagram      || "",
      tiktok:         shop.tiktok         || "",
      website:        shop.website        || "",
      chatPreference: shop.chatPreference || "whatsapp",
    });
  }, [shop?.id]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const storeSlug = shop?.slug
    || (form.shopName?.trim()
        ? form.shopName.trim().toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-")
        : null)
    || storeId || user?.uid || "my-store";
  const storeUrl = `/store/${storeSlug}`;

  const handleSave = async () => {
    const sid = storeId || shop?.id || user?.uid;
    if (!sid) { alert("Please log in again."); return; }
    if (!form.shopName.trim()) { alert("Store name is required."); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, "shops", sid), {
        shopName:       form.shopName.trim(),
        description:    form.description.trim(),
        bannerUrl:      form.bannerUrl,
        logoUrl:        form.logoUrl,
        whatsapp:       form.whatsapp.trim(),
        instagram:      form.instagram.trim(),
        tiktok:         form.tiktok.trim(),
        website:        form.website.trim(),
        chatPreference: form.chatPreference || "whatsapp",
        ownerId:        user?.uid || sid,
        slug:           form.shopName.trim().toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-"),
        status:         "active",
        updatedAt:      serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      alert("Failed to save. Please try again.");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    const sid  = storeId || shop?.id || user?.uid;
    const name = (shop?.shopName || form.shopName).trim().toLowerCase();
    if (delConfirm.trim().toLowerCase() !== name) {
      setDelError("Store name doesn't match. Type it exactly as shown.");
      return;
    }
    setDeleting(true); setDelError("");
    try {
      if (sid) {
        await setDoc(doc(db, "shops", sid), { status:"deleted", deletedAt:serverTimestamp(), deletedBy:user?.uid }, { merge:true });
        await setDoc(doc(db, "storeApplications", user?.uid), { status:"deleted", deletedAt:serverTimestamp() }, { merge:true });
      }
      localStorage.removeItem("beme_seller_applied");
      setShowDelDlg(false);
      navigate("/");
    } catch (e) {
      console.error(e);
      setDelError("Failed to delete. Contact support if this persists.");
    } finally { setDeleting(false); }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(`https://bememarket.store${storeUrl}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const isBasic   = !subscriptionPlan || subscriptionPlan === "basic";
  const isBusy    = saving || upBanner || upLogo;
  const shopLabel = shop?.shopName || form.shopName || "My Store";

  return (
    <div className="da-root">

      {/* ── Page header ── */}
      <div className="da-page-head">
        <div>
          <div className="da-page-title">Store Design</div>
          <div className="da-page-sub">Customise how your store looks to customers</div>
        </div>
        <div className="da-head-actions">
          <a href={storeUrl} target="_blank" rel="noreferrer" className="da-btn da-btn--ghost">
            <Ico d={IC.eye} size={14} /> View Store
          </a>
          <button type="button" className={`da-btn da-btn--primary${saved ? " da-btn--saved" : ""}`}
            onClick={handleSave} disabled={isBusy}>
            {saved
              ? <><Ico d={IC.check} size={14} color="#fff" /> Saved</>
              : saving ? "Saving…"
              : <><Ico d={IC.save} size={14} color="#fff" /> Save Changes</>
            }
          </button>
        </div>
      </div>

      {/* ── Body: left editor + right preview ── */}
      <div className="da-body">

        {/* ── LEFT: Editor sections ── */}
        <div className="da-editor">

          {/* Store Media */}
          <Section title="Store Media">
            <ImgUpload
              value={form.bannerUrl}
              onChange={(u, l) => { setUpBanner(l); if (u !== null) upd("bannerUrl", u); }}
              uploading={upBanner}
              isLogo={false}
              label="Store Banner"
              hint="16:9 ratio recommended (e.g. 1200×675px) · JPG, PNG, WEBP · Max 5MB"
            />
            <div className="da-logo-row">
              <ImgUpload
                value={form.logoUrl}
                onChange={(u, l) => { setUpLogo(l); if (u !== null) upd("logoUrl", u); }}
                uploading={upLogo}
                isLogo
                label="Store Logo"
              />
              <div className="da-logo-hint">
                <div className="da-field-label" style={{ marginBottom: 4 }}>Square image · min 200×200px</div>
                <div className="da-field-hint">JPG, PNG, WEBP · Max 5MB</div>
              </div>
            </div>
          </Section>

          {/* Store Info */}
          <Section title="Store Information">
            <Field label="Store Name" value={form.shopName}
              onChange={e => upd("shopName", e.target.value)}
              placeholder="e.g. Kente Kicks GH"
              hint="This is your store title that customers see." />

            <Field label="Store Description" value={form.description}
              onChange={e => upd("description", e.target.value)}
              placeholder="Tell customers what makes your store special…"
              multiline hint="Shown on your store's About tab." />

            {/* Store URL */}
            <div className="da-url-box">
              <div className="da-url-label">Your store link</div>
              <div className="da-url-row">
                <span className="da-url-text">bememarket.store{storeUrl}</span>
                <button type="button" className="da-url-copy" onClick={copyUrl}>
                  <Ico d={IC.copy} size={13} color={copied ? "#22C55E" : "currentColor"} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="da-field-hint" style={{ marginTop: 6 }}>
                Share on WhatsApp, Instagram bio, or TikTok profile so customers can find your store.
              </div>
            </div>
          </Section>

          {/* Chat Preference */}
          <Section title="Chat Preference">
            <div className="da-field-hint" style={{ marginBottom: 14 }}>
              Choose how customers reach you when they tap the Chat button on your store page.
            </div>
            <div className="da-radio-group">
              {[
                { id:"whatsapp", label:"WhatsApp",            sub:"Opens WhatsApp with your number",    icon: IC.phone },
                { id:"beme",     label:"Beme Market Chat",    sub:"Uses Beme's built-in messaging",      icon: IC.chat  },
                { id:"website",  label:"Website / Link",      sub:"Redirects to your website",           icon: IC.link  },
              ].map(opt => (
                <button key={opt.id} type="button"
                  className={`da-radio-card${form.chatPreference === opt.id ? " da-radio-card--active" : ""}`}
                  onClick={() => upd("chatPreference", opt.id)}>
                  <div className="da-radio-icon">
                    <Ico d={opt.icon} size={15}
                      color={form.chatPreference === opt.id ? "var(--sd-accent)" : "var(--sd-muted)"} />
                  </div>
                  <div className="da-radio-body">
                    <div className="da-radio-label">{opt.label}</div>
                    <div className="da-radio-sub">{opt.sub}</div>
                  </div>
                  <div className={`da-radio-dot${form.chatPreference === opt.id ? " da-radio-dot--active" : ""}`}>
                    {form.chatPreference === opt.id && <div className="da-radio-dot-inner" />}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Social Links */}
          <Section
            title="Social Links"
            badge={isBasic && (
              <span className="da-badge da-badge--lock">
                <Ico d={IC.lock} size={10} color="#b91c1c" /> Starter+
              </span>
            )}>
            {isBasic ? (
              <div className="da-locked">
                <div className="da-locked-icon">
                  <Ico d={IC.lock} size={22} color="var(--sd-muted)" />
                </div>
                <div className="da-locked-title">Social links locked on Basic plan</div>
                <div className="da-locked-sub">
                  Upgrade to Starter (GHS 59/mo) to add WhatsApp, Instagram, TikTok and your website.
                </div>
                <a href="/store-plans" className="da-btn da-btn--primary" style={{ marginTop: 4 }}>
                  View Plans
                </a>
              </div>
            ) : (
              <>
                <div className="da-field-hint" style={{ marginBottom: 14 }}>
                  These appear as contact buttons on your store page.
                </div>
                <Field label="WhatsApp Number" icon={IC.phone} type="tel"
                  value={form.whatsapp} onChange={e => upd("whatsapp", e.target.value)}
                  placeholder="+233 XX XXX XXXX" hint="Customers tap to message you directly" />
                <Field label="Instagram" icon={IC.ig}
                  value={form.instagram} onChange={e => upd("instagram", e.target.value)}
                  placeholder="@yourstorename" />
                <Field label="TikTok" icon={IC.tt}
                  value={form.tiktok} onChange={e => upd("tiktok", e.target.value)}
                  placeholder="@yourstorename" />
                <Field label="Website" icon={IC.link} type="url"
                  value={form.website} onChange={e => upd("website", e.target.value)}
                  placeholder="https://yourwebsite.com" />
              </>
            )}
          </Section>

          {/* Danger Zone */}
          <Section title="Danger Zone">
            <div className="da-field-hint" style={{ marginBottom: 14 }}>
              Deleting your store is permanent. Your products and store page will be hidden.
              This cannot be undone.
            </div>
            <button type="button" className="da-btn da-btn--danger"
              onClick={() => { setShowDelDlg(true); setDelConfirm(""); setDelError(""); }}>
              <Ico d={IC.trash} size={14} color="#b91c1c" /> Delete Store
            </button>
          </Section>

        </div>

        {/* ── RIGHT: Live preview ── */}
        <div className="da-preview-col">
          <div className="da-preview-sticky">
            <div className="da-preview-heading">Live Preview</div>
            <StorePreview form={form} />
            <a href={storeUrl} target="_blank" rel="noreferrer" className="da-btn da-btn--ghost da-btn--full">
              <Ico d={IC.store} size={14} /> Open Full Store Page
            </a>
          </div>
        </div>

      </div>

      {/* ── Delete dialog ── */}
      {showDelDlg && (
        <div className="da-modal-backdrop"
          onClick={e => { if (e.target === e.currentTarget) { setShowDelDlg(false); setDelConfirm(""); setDelError(""); } }}>
          <div className="da-modal">
            <div className="da-modal-icon">
              <Ico d={IC.trash} size={22} color="#b91c1c" />
            </div>
            <div className="da-modal-title">Delete your store?</div>
            <div className="da-modal-sub">
              This will permanently delete <strong>{shopLabel}</strong>. All products and store data will be removed.
            </div>
            <div className="da-field">
              <div className="da-field-label">Type your store name to confirm</div>
              <input value={delConfirm}
                onChange={e => { setDelConfirm(e.target.value); setDelError(""); }}
                placeholder={shopLabel}
                className="da-input" />
            </div>
            {delError && <div className="da-error">{delError}</div>}
            <div className="da-modal-actions">
              <button type="button" className="da-btn da-btn--ghost da-btn--flex"
                onClick={() => { setShowDelDlg(false); setDelConfirm(""); setDelError(""); }}>
                Cancel
              </button>
              <button type="button" className="da-btn da-btn--danger da-btn--flex"
                disabled={deleting || delConfirm.trim().toLowerCase() !== shopLabel.trim().toLowerCase()}
                onClick={handleDelete}>
                {deleting ? "Deleting…" : "Delete Store"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes da-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes da-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: calc(400px + 100%) 0; }
        }

        /* ── Root ── */
        .da-root {
          font-family: var(--sd-font,'DM Sans',system-ui,sans-serif);
          color: var(--sd-text);
          background: transparent;
          min-height: 100%;
        }

        /* ── Page header ── */
        .da-page-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; margin-bottom: 20px;
        }
        .da-page-title {
          font-size: 11px; font-weight: 700; color: var(--sd-muted);
          text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px;
        }
        .da-page-sub { font-size: 12px; color: var(--sd-muted); }
        .da-head-actions { display: flex; gap: 8px; flex-shrink: 0; }

        /* ── Body layout ── */
        .da-body {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 16px;
          align-items: start;
        }

        /* ── Editor ── */
        .da-editor { display: flex; flex-direction: column; gap: 12px; }

        /* ── Section ── */
        .da-section {
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 14px;
          padding: 20px;
          transition: background 0.25s, border-color 0.25s;
        }
        .da-section-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px; gap: 10px;
        }
        .da-section-title {
          font-size: 13px; font-weight: 800; color: var(--sd-text);
          letter-spacing: -0.01em;
        }

        /* ── Fields ── */
        .da-field { margin-bottom: 14px; }
        .da-field:last-child { margin-bottom: 0; }
        .da-field-label {
          font-size: 11px; font-weight: 700; color: var(--sd-muted);
          text-transform: uppercase; letter-spacing: 0.07em;
          display: block; margin-bottom: 7px;
        }
        .da-field-hint {
          font-size: 11px; color: var(--sd-muted); margin-top: 5px; line-height: 1.5;
        }
        .da-field-inner { position: relative; }
        .da-field-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          pointer-events: none; display: flex; align-items: center;
        }
        .da-input {
          width: 100%; height: 42px; padding: 0 14px;
          border: 1.5px solid var(--sd-border);
          border-radius: 10px;
          background: var(--sd-white); color: var(--sd-text);
          font-size: 13px; font-weight: 500; font-family: inherit;
          outline: none; transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .da-input--icon { padding-left: 38px; }
        .da-input--textarea { height: auto; padding: 10px 14px; resize: vertical; line-height: 1.6; }
        .da-input:focus { border-color: var(--sd-accent); box-shadow: 0 0 0 3px var(--sd-accent-dim); }
        .da-input:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Image upload ── */
        .da-img-upload { margin-bottom: 14px; }
        .da-img-upload:last-child { margin-bottom: 0; }
        .da-img-preview-wrap { position: relative; display: inline-block; }
        .da-img-remove {
          position: absolute; top: 6px; right: 6px;
          width: 22px; height: 22px;
          background: rgba(0,0,0,0.65); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
        }
        .da-img-drop {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; border: 2px dashed var(--sd-border);
          background: var(--sd-border-light);
          transition: border-color 0.15s;
        }
        .da-img-drop:hover { border-color: var(--sd-accent); }
        .da-img-drop-label { font-size: 12px; font-weight: 600; color: var(--sd-muted); }

        .da-logo-row { display: flex; align-items: center; gap: 16px; margin-top: 14px; }
        .da-logo-hint { flex: 1; }

        /* ── URL box ── */
        .da-url-box {
          padding: 12px 14px;
          background: var(--sd-accent-dim);
          border: 1px solid rgba(124,58,237,0.15);
          border-radius: 10px;
          margin-top: 14px;
        }
        .da-url-label {
          font-size: 10px; font-weight: 700; color: var(--sd-muted);
          text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px;
        }
        .da-url-row { display: flex; align-items: center; gap: 8px; }
        .da-url-text {
          flex: 1; font-size: 12px; font-weight: 700; color: var(--sd-accent);
          word-break: break-all; line-height: 1.4;
        }
        .da-url-copy {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 7px; flex-shrink: 0;
          border: 1px solid var(--sd-border); background: var(--sd-white);
          color: var(--sd-text); font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: inherit; transition: all 0.15s;
          white-space: nowrap;
        }
        .da-url-copy:hover { border-color: var(--sd-accent); color: var(--sd-accent); }

        /* ── Radio group ── */
        .da-radio-group { display: flex; flex-direction: column; gap: 8px; }
        .da-radio-card {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 10px; cursor: pointer;
          border: 1.5px solid var(--sd-border);
          background: var(--sd-white); text-align: left;
          font-family: inherit; transition: all 0.12s;
          width: 100%;
        }
        .da-radio-card:hover { border-color: var(--sd-accent); background: var(--sd-accent-dim); }
        .da-radio-card--active { border-color: var(--sd-accent); background: var(--sd-accent-dim); }
        .da-radio-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          background: var(--sd-border-light);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s;
        }
        .da-radio-card--active .da-radio-icon { background: var(--sd-accent-dim); }
        .da-radio-body { flex: 1; min-width: 0; }
        .da-radio-label { font-size: 13px; font-weight: 700; color: var(--sd-text); }
        .da-radio-sub   { font-size: 11px; color: var(--sd-muted); margin-top: 2px; }
        .da-radio-dot {
          width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid var(--sd-border);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.12s;
        }
        .da-radio-dot--active { border-color: var(--sd-accent); background: var(--sd-accent); }
        .da-radio-dot-inner { width: 6px; height: 6px; border-radius: 50%; background: #fff; }

        /* ── Locked state ── */
        .da-locked {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 28px 16px; text-align: center;
        }
        .da-locked-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: var(--sd-border-light);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 4px;
        }
        .da-locked-title { font-size: 14px; font-weight: 800; color: var(--sd-text); }
        .da-locked-sub   { font-size: 13px; color: var(--sd-muted); max-width: 280px; line-height: 1.6; }

        /* ── Buttons ── */
        .da-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: inherit; border: none;
          text-decoration: none; transition: all 0.15s; white-space: nowrap;
        }
        .da-btn--primary {
          background: var(--sd-accent); color: #fff;
          box-shadow: 0 4px 14px var(--sd-accent-glow, rgba(124,58,237,0.25));
        }
        .da-btn--primary:hover:not(:disabled) { opacity: 0.88; }
        .da-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .da-btn--saved  { background: #22C55E; box-shadow: none; }
        .da-btn--ghost  {
          background: var(--sd-white); color: var(--sd-text);
          border: 1.5px solid var(--sd-border);
        }
        .da-btn--ghost:hover { border-color: var(--sd-accent); color: var(--sd-accent); }
        .da-btn--danger {
          background: transparent; color: #b91c1c;
          border: 1.5px solid rgba(185,28,28,0.3);
        }
        .da-btn--danger:hover:not(:disabled) { background: rgba(185,28,28,0.06); border-color: #b91c1c; }
        .da-btn--danger:disabled { opacity: 0.4; cursor: not-allowed; }
        .da-btn--full   { width: 100%; justify-content: center; margin-top: 8px; }
        .da-btn--flex   { flex: 1; justify-content: center; }

        /* ── Badge ── */
        .da-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 100px; font-size: 10px; font-weight: 700;
        }
        .da-badge--lock {
          background: rgba(185,28,28,0.08); color: #b91c1c;
          border: 1px solid rgba(185,28,28,0.2);
        }

        /* ── Error ── */
        .da-error {
          font-size: 12px; color: #b91c1c; font-weight: 600;
          padding: 8px 12px; background: rgba(185,28,28,0.06);
          border-radius: 8px; margin-bottom: 12px;
        }

        /* ── Spinner ── */
        .da-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid var(--sd-border);
          border-top-color: var(--sd-accent);
          animation: da-spin 0.8s linear infinite;
        }

        /* ════════════════════════════════════════
           LIVE PREVIEW (right column)
        ════════════════════════════════════════ */
        .da-preview-col { position: relative; }
        .da-preview-sticky { position: sticky; top: 80px; }
        .da-preview-heading {
          font-size: 10px; font-weight: 700; color: var(--sd-muted);
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 10px;
        }

        .da-preview {
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 14px;
          overflow: hidden;
        }

        /* Banner */
        .da-preview-banner {
          height: 90px; position: relative; overflow: hidden;
          background: var(--sd-border-light);
        }
        .da-preview-banner-img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .da-preview-banner-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
        .da-preview-banner-fade {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.25) 100%);
        }

        /* Profile card */
        .da-preview-card {
          padding: 0 14px 14px;
          border-bottom: 1px solid var(--sd-border-light);
          position: relative;
        }
        .da-preview-logo {
          width: 44px; height: 44px; border-radius: 50%;
          border: 2.5px solid var(--sd-white);
          background: var(--sd-accent);
          overflow: hidden; margin-top: -22px; margin-bottom: 8px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.14);
          flex-shrink: 0;
        }
        .da-preview-logo-img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .da-preview-logo-letter {
          font-size: 18px; font-weight: 900; color: #fff;
        }
        .da-preview-info { }
        .da-preview-name {
          font-size: 13px; font-weight: 900; color: var(--sd-text);
          letter-spacing: -0.02em; margin-bottom: 3px;
        }
        .da-preview-desc {
          font-size: 11px; color: var(--sd-muted); line-height: 1.5;
          margin-bottom: 8px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .da-preview-socials { display: flex; flex-wrap: wrap; gap: 5px; }
        .da-preview-social-pill {
          font-size: 10px; font-weight: 700;
          padding: 2px 8px; border-radius: 100px;
          border: 1px solid; display: inline-flex;
        }

        /* Product grid */
        .da-preview-products {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px;
        }
        .da-preview-product-card {
          border-radius: 8px; overflow: hidden;
          border: 1px solid var(--sd-border-light);
          background: var(--sd-white);
        }
        .da-preview-product-img {
          height: 60px;
          background: var(--sd-border-light);
          background-image: linear-gradient(90deg, var(--sd-border-light) 25%, var(--sd-border) 50%, var(--sd-border-light) 75%);
          background-size: 400px 100%;
          animation: da-shimmer 1.4s ease infinite;
        }
        .da-preview-product-line {
          height: 8px; border-radius: 4px; margin: 8px 8px 4px;
          background: var(--sd-border-light);
        }
        .da-preview-product-price {
          height: 8px; border-radius: 4px; margin: 0 8px 10px; width: 50%;
          background: var(--sd-border-light);
        }
        .da-preview-label {
          font-size: 10px; color: var(--sd-muted); font-weight: 600;
          padding: 8px 12px; border-top: 1px solid var(--sd-border-light);
          text-align: center;
        }

        /* ── Modal ── */
        .da-modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          backdrop-filter: blur(3px); z-index: 300;
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .da-modal {
          background: var(--sd-white); border-radius: 18px; padding: 28px 24px;
          width: 100%; max-width: 400px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.2);
          animation: da-modal-in 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes da-modal-in {
          from { opacity:0; transform: scale(0.94); }
          to   { opacity:1; transform: scale(1); }
        }
        .da-modal-icon {
          width: 50px; height: 50px; border-radius: 14px;
          background: rgba(185,28,28,0.08);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .da-modal-title {
          font-size: 17px; font-weight: 900; color: var(--sd-text);
          text-align: center; letter-spacing: -0.02em; margin-bottom: 8px;
        }
        .da-modal-sub {
          font-size: 13px; color: var(--sd-muted); text-align: center;
          line-height: 1.6; margin-bottom: 20px;
        }
        .da-modal-sub strong { color: var(--sd-text); }
        .da-modal-actions { display: flex; gap: 10px; margin-top: 16px; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .da-body { grid-template-columns: 1fr; }
          .da-preview-col { order: -1; }
          .da-preview-sticky { position: static; }
        }
      `}</style>
    </div>
  );
}
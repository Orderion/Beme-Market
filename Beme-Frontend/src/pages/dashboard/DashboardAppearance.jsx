import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import { updateShop, uploadStoreImage } from "../../services/storeService";

const BRAND_COLORS = ["#046EF2","#7C3AED","#EF4444","#F59E0B","#22C55E","#EC4899","#06B6D4","#111111","#6B7280","#F97316"];

export default function DashboardAppearance() {
  const { user }          = useAuth();
  const { storeId, shop } = useSellerAuth();

  const [form, setForm]         = useState({ shopName: "", description: "", category: "", whatsapp: "", instagram: "", tiktok: "", primaryColor: "#046EF2", city: "", region: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [logoPreview, setLogoPreview]   = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    if (shop) {
      setForm({
        shopName:     shop.shopName     || "",
        description:  shop.description  || "",
        category:     shop.category     || "",
        whatsapp:     shop.whatsapp     || "",
        instagram:    shop.instagram    || "",
        tiktok:       shop.tiktok       || "",
        primaryColor: shop.primaryColor || "#046EF2",
        city:         shop.city         || "",
        region:       shop.region       || "",
      });
      if (shop.logoUrl)   setLogoPreview(shop.logoUrl);
      if (shop.bannerUrl) setBannerPreview(shop.bannerUrl);
    }
  }, [shop]);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); }
  };

  const handleSave = async () => {
    if (!storeId || !user?.uid) return;
    setSaving(true);
    try {
      const updates = { ...form };
      if (logoFile)   updates.logoUrl   = await uploadStoreImage(user.uid, logoFile,   "logo");
      if (bannerFile) updates.bannerUrl = await uploadStoreImage(user.uid, bannerFile, "banner");
      await updateShop(storeId, updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const REGIONS = ["Greater Accra","Ashanti","Western","Eastern","Central","Volta","Northern","Upper East","Upper West","Brong-Ahafo","Savannah","Ahafo","Bono East","North East","Oti","Western North"];

  return (
    <div>
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Store Design</div>
          <div className="sd-page-sub">Customise your storefront look and contact info</div>
        </div>
        <button className="sd-btn sd-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14 }}>
        {/* Left — Main form */}
        <div>
          {/* Logo & Banner */}
          <div className="sd-panel" style={{ marginBottom: 14 }}>
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Store Media</div>

            {/* Banner */}
            <div style={{ marginBottom: 16 }}>
              <label className="sd-label">Store Banner</label>
              <div style={{ position: "relative", height: 140, borderRadius: 10, overflow: "hidden", background: "#F0F2FF", cursor: "pointer", border: "1px dashed rgba(4,110,242,0.3)" }} onClick={() => document.getElementById("banner-file").click()}>
                {bannerPreview
                  ? <img src={bannerPreview} alt="banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#8B8FA8" }}>
                      <span style={{ fontSize: 24, marginBottom: 6 }}>🖼️</span>
                      <span style={{ fontSize: 12 }}>Click to upload banner (16:9 recommended)</span>
                    </div>
                }
              </div>
              <input type="file" id="banner-file" accept="image/*" style={{ display: "none" }} onChange={handleBannerChange} />
            </div>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", background: "#F0F2FF", border: "1px dashed rgba(4,110,242,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} onClick={() => document.getElementById("logo-file").click()}>
                {logoPreview
                  ? <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 28 }}>🏪</span>
                }
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1D3B", marginBottom: 4 }}>Store Logo</div>
                <div style={{ fontSize: 12, color: "#8B8FA8", marginBottom: 8 }}>Square image, at least 200×200px</div>
                <button className="sd-btn sd-btn-ghost sd-btn-sm" onClick={() => document.getElementById("logo-file").click()}>Upload Logo</button>
              </div>
              <input type="file" id="logo-file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} />
            </div>
          </div>

          {/* Store info */}
          <div className="sd-panel" style={{ marginBottom: 14 }}>
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Store Information</div>
            <div className="sd-form-group">
              <label className="sd-label">Store Name</label>
              <input className="sd-input" value={form.shopName} onChange={upd("shopName")} placeholder="e.g. Kente Kicks GH" maxLength={60} />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Store Description</label>
              <textarea className="sd-textarea sd-input" value={form.description} onChange={upd("description")} placeholder="Tell customers what you sell and why they should shop with you…" rows={3} maxLength={500} />
              <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 4 }}>{form.description.length}/500</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="sd-form-group">
                <label className="sd-label">City</label>
                <input className="sd-input" value={form.city} onChange={upd("city")} placeholder="e.g. Accra" />
              </div>
              <div className="sd-form-group">
                <label className="sd-label">Region</label>
                <select className="sd-select sd-input" value={form.region} onChange={upd("region")}>
                  <option value="">Select region</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Social/Contact */}
          <div className="sd-panel">
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Contact & Social Links</div>
            {[
              { key: "whatsapp", label: "WhatsApp Number", placeholder: "+233 XX XXX XXXX", icon: "📱" },
              { key: "instagram", label: "Instagram Handle", placeholder: "@yourstorename", icon: "📸" },
              { key: "tiktok", label: "TikTok Handle", placeholder: "@yourstorename", icon: "🎵" },
            ].map(({ key, label, placeholder, icon }) => (
              <div className="sd-form-group" key={key}>
                <label className="sd-label">{label}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>{icon}</span>
                  <input className="sd-input" style={{ paddingLeft: 36 }} value={form[key]} onChange={upd(key)} placeholder={placeholder} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Brand color + preview */}
        <div>
          <div className="sd-panel" style={{ marginBottom: 14 }}>
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Brand Color</div>
            <div className="sd-color-swatches" style={{ marginBottom: 12 }}>
              {BRAND_COLORS.map((c) => (
                <div key={c} className={`sd-color-swatch ${form.primaryColor === c ? "selected" : ""}`}
                  style={{ background: c }} onClick={() => setForm((f) => ({ ...f, primaryColor: c }))} title={c}
                />
              ))}
            </div>
            <div className="sd-form-group" style={{ marginBottom: 0 }}>
              <label className="sd-label">Custom Hex</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: form.primaryColor, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                <input className="sd-input" value={form.primaryColor} onChange={upd("primaryColor")} placeholder="#046EF2" maxLength={7} style={{ fontFamily: "monospace" }} />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="sd-panel">
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Store Preview</div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", background: "#F8F9FF" }}>
              {/* Mini banner */}
              <div style={{ height: 80, background: bannerPreview ? `url(${bannerPreview}) center/cover` : form.primaryColor, position: "relative" }}>
                {!bannerPreview && <div style={{ position: "absolute", inset: 0, background: form.primaryColor, opacity: 0.9 }} />}
              </div>
              {/* Store info */}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fff", border: "2px solid rgba(0,0,0,0.06)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", marginTop: -28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {logoPreview
                      ? <img src={logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 20 }}>🏪</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1D3B" }}>{form.shopName || "Your Store Name"}</div>
                    {form.city && <div style={{ fontSize: 11, color: "#8B8FA8" }}>📍 {form.city}{form.region ? `, ${form.region}` : ""}</div>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#8B8FA8", lineHeight: 1.5 }}>
                  {form.description || "Your store description will appear here."}
                </div>
                {(form.whatsapp || form.instagram) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {form.whatsapp && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 100, background: "rgba(34,197,94,0.1)", color: "#16A34A", fontWeight: 700 }}>📱 WhatsApp</span>}
                    {form.instagram && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 100, background: "rgba(236,72,153,0.1)", color: "#EC4899", fontWeight: 700 }}>📸 Instagram</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


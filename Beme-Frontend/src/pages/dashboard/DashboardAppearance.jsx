import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import { uploadImageToCloudinary, validateImageFile } from "../../lib/cloudinary";

function Ico({ d, size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4|M17 8l-5-5-5 5|M12 3v12",
  close:  "M18 6L6 18|M6 6l12 12",
  save:   "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z|M17 21v-8H7v8|M7 3v5h8",
  check:  "M20 6L9 17l-5-5",
  phone:  "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  ig:     "M17.5 2h-11A5.5 5.5 0 001 7.5v9A5.5 5.5 0 006.5 22h11a5.5 5.5 0 005.5-5.5v-9A5.5 5.5 0 0017.5 2z|M12 8a4 4 0 100 8 4 4 0 000-8z|M17.5 6.5h.01",
  tt:     "M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6|M18 16a3 3 0 100-6 3 3 0 000 6",
  link:   "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71|M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|M12 12a3 3 0 100-6 3 3 0 000 6",
  store:  "M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z|M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9",
  trash:  "M3 6h18|M19 6l-1 14H6L5 6|M10 11v6|M14 11v6|M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  warn:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z|M12 9v4|M12 17h.01",
};

function ImgUpload({ value, onChange, uploading, isLogo, label }) {
  const inputRef = useRef(null);
  const onFile = async (file) => {
    try { validateImageFile(file); } catch (e) { alert(e.message); return; }
    onChange("", true);
    try { const r = await uploadImageToCloudinary(file); onChange(r.url, false); }
    catch { alert("Upload failed."); onChange("", false); }
  };
  const onDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); };

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 700, color: "#111", display: "block", marginBottom: 8 }}>{label}</label>
      {value
        ? <div style={{ position: "relative", display: "inline-block", width: isLogo ? 80 : "100%" }}>
            <img src={value} alt={label}
              style={{ width: isLogo ? 80 : "100%", height: isLogo ? 80 : 160, objectFit: "cover",
                borderRadius: isLogo ? "50%" : 12, border: "2px solid rgba(0,0,0,0.1)", display: "block" }} />
            <button type="button" onClick={() => onChange("", false)}
              style={{ position: "absolute", top: isLogo ? -5 : 8, right: isLogo ? -5 : 8,
                width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.7)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <Ico d={IC.close} size={11} />
            </button>
          </div>
        : <div onClick={() => inputRef.current?.click()} onDrop={onDrop} onDragOver={e=>e.preventDefault()}
            style={{ width: isLogo ? 80 : "100%", height: isLogo ? 80 : 160,
              border: "2px dashed rgba(0,0,0,0.15)", borderRadius: isLogo ? "50%" : 12,
              background: "#fafafa", cursor: uploading ? "wait" : "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "#9CA3AF" }}>
            {uploading
              ? <span style={{ fontSize: 12, color: "#9CA3AF" }}>Uploading…</span>
              : <>
                  <Ico d={IC.upload} size={isLogo ? 18 : 22} />
                  {!isLogo && <span style={{ fontSize: 12, fontWeight: 700 }}>Click or drag to upload</span>}
                  {!isLogo && <span style={{ fontSize: 11, color: "#9CA3AF" }}>16:9 recommended · JPG, PNG, WEBP · Max 5MB</span>}
                </>
            }
          </div>
      }
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

function Field({ label, hint, icon, value, onChange, placeholder, multiline, type = "text" }) {
  const sty = {
    width: "100%", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 10,
    background: "#fff", color: "#111", fontSize: 14,
    fontWeight: 500, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
    transition: "border-color 0.15s", padding: icon ? (multiline ? "11px 14px 11px 38px" : "0 14px 0 38px") : (multiline ? "11px 14px" : "0 14px"),
    height: multiline ? "auto" : 46,
  };
  const focus = e => e.target.style.borderColor = "#046EF2";
  const blur  = e => e.target.style.borderColor = "rgba(0,0,0,0.1)";
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: "#111", display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        {icon && <div style={{ position: "absolute", left: 12, top: multiline ? 13 : "50%", transform: multiline ? "none" : "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}><Ico d={icon} size={15} /></div>}
        {multiline
          ? <textarea rows={3} value={value||""} onChange={onChange} placeholder={placeholder} style={{ ...sty, resize: "vertical", lineHeight: 1.6 }} onFocus={focus} onBlur={blur} />
          : <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} style={sty} onFocus={focus} onBlur={blur} />
        }
      </div>
      {hint && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "5px 0 0" }}>{hint}</p>}
    </div>
  );
}

function Preview({ form }) {
  const letter = (form.shopName || "S").charAt(0).toUpperCase();
  const social = [
    form.whatsapp  && { l: "WhatsApp",  c: "#25D366" },
    form.instagram && { l: "Instagram",  c: "#E1306C" },
    form.tiktok    && { l: "TikTok",     c: "#111" },
    form.website   && { l: "Website",    c: "#046EF2" },
  ].filter(Boolean);
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
      <div style={{ height: 80, position: "relative", overflow: "hidden",
        background: form.bannerUrl ? "transparent" : "linear-gradient(135deg,#111,#333)" }}>
        {form.bannerUrl && <img src={form.bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.3))" }} />
      </div>
      <div style={{ padding: "0 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: -24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, border: "2.5px solid #fff",
            overflow: "hidden", flexShrink: 0, background: form.logoUrl ? "transparent" : "#111",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#fff" }}>
            {form.logoUrl ? <img src={form.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : letter}
          </div>
          <div style={{ flex: 1, paddingBottom: 4, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {form.shopName || "Your Store Name"}
            </div>
            {form.description && (
              <div style={{ fontSize: 11, color: "#9CA3AF", overflow: "hidden",
                display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", marginTop: 2 }}>
                {form.description}
              </div>
            )}
          </div>
        </div>
        {social.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
            {social.map(s => (
              <span key={s.l} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px",
                borderRadius: 100, background: `${s.c}12`, color: s.c, border: `1px solid ${s.c}25` }}>
                {s.l}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardAppearance() {
  const { shop, storeId, subscriptionPlan } = useSellerAuth();
  const { user } = useAuth();

  const [form, setForm] = useState({
    shopName:"", description:"", bannerUrl:"", logoUrl:"",
    whatsapp:"", instagram:"", tiktok:"", website:"",
    chatPreference: "whatsapp",
  });
  const navigate = useNavigate();
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showDelDlg,  setShowDelDlg]  = useState(false);
  const [delConfirm,  setDelConfirm]  = useState("");
  const [delError,    setDelError]    = useState("");
  const [saved,    setSaved]    = useState(false);
  const [upBanner, setUpBanner] = useState(false);
  const [upLogo,   setUpLogo]   = useState(false);

  useEffect(() => {
    const sid = storeId || user?.uid;
    if (!sid || shop) return;
    const autoCreate = async () => {
      const ref = doc(db, "shops", sid);
      const snap = await getDoc(ref);
      if (snap.exists()) return;
      const rawName = user?.displayName || "My Store";
      const slug = sid;
      await setDoc(ref, {
        ownerId: sid, shopName: rawName, slug, status: "active",
        planId: "basic", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, { merge: true });
    };
    autoCreate().catch(e => console.error("[DashboardAppearance] auto-create:", e));
  }, [storeId, user?.uid, shop]);

  useEffect(() => {
    if (!shop) return;
    setForm({
      shopName: shop.shopName || "", description: shop.description || "",
      bannerUrl: shop.bannerUrl || "", logoUrl: shop.logoUrl || "",
      whatsapp: shop.whatsapp || "", instagram: shop.instagram || "",
      tiktok: shop.tiktok || "", website: shop.website || "",
      chatPreference: shop.chatPreference || "whatsapp",
    });
  }, [shop?.id]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleDelete = async () => {
    const sid = storeId || shop?.id || user?.uid;
    const name = shop?.shopName || form.shopName;
    if (delConfirm.trim().toLowerCase() !== name.trim().toLowerCase()) {
      setDelError("Store name doesn't match. Please type it exactly.");
      return;
    }
    setDeleting(true);
    setDelError("");
    try {
      // Soft-delete: mark as deleted in Firestore
      if (sid) {
        await setDoc(doc(db, "shops", sid), {
          status: "deleted", deletedAt: serverTimestamp(), deletedBy: user?.uid,
        }, { merge: true });
        await setDoc(doc(db, "storeApplications", user?.uid), {
          status: "deleted", deletedAt: serverTimestamp(),
        }, { merge: true });
      }
      // Clear local state
      localStorage.removeItem("beme_seller_applied");
      setShowDelDlg(false);
      navigate("/");
    } catch (e) {
      console.error("[DeleteStore]", e);
      setDelError("Failed to delete store. Please try again or contact support.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    const sid = storeId || shop?.id || user?.uid;
    if (!sid) { alert("Please log in again."); return; }
    if (!form.shopName.trim()) { alert("Store name is required."); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, "shops", sid), {
        shopName: form.shopName.trim(), description: form.description.trim(),
        bannerUrl: form.bannerUrl, logoUrl: form.logoUrl,
        whatsapp: form.whatsapp.trim(), instagram: form.instagram.trim(),
        tiktok: form.tiktok.trim(), website: form.website.trim(),
        chatPreference: form.chatPreference || "whatsapp",
        ownerId: user?.uid || sid,
        slug: form.shopName.trim().toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-"),
        status: "active", updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const effectiveId = storeId || shop?.id || user?.uid || "my-store";
  const storeSlug = shop?.slug
    || (form.shopName?.trim() ? form.shopName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") : null)
    || effectiveId;
  const storeUrl = `/store/${storeSlug}`;

  return (
    <div style={{ fontFamily: "var(--font-main,'Nunito',sans-serif)", background: "#fff" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#111", letterSpacing: "-0.03em" }}>Manage Store</div>
          <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500, marginTop: 3 }}>Customise your store and manage account settings</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={storeUrl} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10,
              border: "1.5px solid rgba(0,0,0,0.12)", background: "#fff",
              color: "#111", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            <Ico d={IC.eye} size={14} /> View Store
          </a>
          <button type="button" onClick={handleSave} disabled={saving || upBanner || upLogo}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10,
              border: "none", background: saved ? "#22C55E" : "#111", color: "#fff",
              fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.2s", opacity: (saving||upBanner||upLogo) ? 0.7 : 1,
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}>
            {saved ? <><Ico d={IC.check} size={14} color="#fff"/> Saved!</>
              : saving ? "Saving…"
              : <><Ico d={IC.save} size={14} color="#fff"/> Save Changes</>}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>

        {/* Left — editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Media */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", padding: "20px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginBottom: 18 }}>Store Media</div>
            <ImgUpload value={form.bannerUrl} onChange={(u,l)=>{setUpBanner(l);if(u!==null)upd("bannerUrl",u);}} uploading={upBanner} isLogo={false} label="Store Banner"/>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "6px 0 20px" }}>Shown at the top of your store page. 16:9 ratio (e.g. 1200×675px).</p>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <ImgUpload value={form.logoUrl} onChange={(u,l)=>{setUpLogo(l);if(u!==null)upd("logoUrl",u);}} uploading={upLogo} isLogo label="Store Logo"/>
              <div style={{ paddingTop: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", margin: "0 0 3px" }}>Square image · min 200×200px</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>JPG, PNG, WEBP · Max 5MB</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", padding: "20px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginBottom: 18 }}>Store Information</div>
            <Field label="Store Name" value={form.shopName} onChange={e=>upd("shopName",e.target.value)} placeholder="e.g. Kente Kicks GH" hint="This is your store title that customers see."/>
            <Field label="Store Description" value={form.description} onChange={e=>upd("description",e.target.value)} placeholder="Tell customers what makes your store special…" multiline hint="Shown on your store's About tab."/>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(4,110,242,0.04)", border: "1px solid rgba(4,110,242,0.12)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9CA3AF", marginBottom: 5 }}>
                Your store link — share this with customers
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#046EF2", wordBreak: "break-all" }}>
                  bememarket.store{storeUrl}
                </span>
                <button type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://bememarket.store${storeUrl}`);
                    const btn = document.getElementById("copy-store-url-btn");
                    if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy"; }, 2000); }
                  }}
                  id="copy-store-url-btn"
                  style={{ padding: "6px 12px", borderRadius: 7, border: "1.5px solid rgba(0,0,0,0.15)",
                    background: "#111", color: "#fff", fontSize: 12, fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" }}>
                  Copy
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "6px 0 0", lineHeight: 1.5 }}>
                Share on WhatsApp, Instagram bio, or TikTok profile so customers can find and follow your store.
              </p>
            </div>
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10,
              background: "#fafafa", border: "1px solid rgba(0,0,0,0.07)",
              display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4 }}>
                Every account is eligible for <strong>one store only</strong>, regardless of subscription tier.
              </span>
            </div>
          </div>

          {/* Chat Preference */}
          <div style={{ background:"#fff", borderRadius:16, border:"1px solid rgba(0,0,0,0.08)", padding:"20px" }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#111", marginBottom:4 }}>Chat Preference</div>
            <p style={{ fontSize:13, color:"#9CA3AF", marginBottom:14, marginTop:4 }}>
              Choose how customers reach you when they tap the Chat button on your store page.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { id:"whatsapp", label:"WhatsApp", sub:"Opens WhatsApp with your business number", icon:"M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" },
                { id:"beme",     label:"Beme Market Chat", sub:"Uses Beme Market built-in messaging", icon:"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
                { id:"website",  label:"Website / Other Link", sub:"Redirects to your website link", icon:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71|M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" },
              ].map(opt => (
                <button key={opt.id} type="button"
                  onClick={() => upd("chatPreference", opt.id)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                    borderRadius:10, border:`1.5px solid ${form.chatPreference===opt.id?"#046EF2":"rgba(0,0,0,0.09)"}`,
                    background: form.chatPreference===opt.id ? "rgba(4,110,242,0.04)" : "#fafafa",
                    cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                  <div style={{ width:36, height:36, borderRadius:9, flexShrink:0,
                    background: form.chatPreference===opt.id ? "rgba(4,110,242,0.1)" : "rgba(0,0,0,0.05)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color: form.chatPreference===opt.id ? "#046EF2" : "#9CA3AF" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      {opt.icon.split("|").map((d,i) => <path key={i} d={d}/>)}
                    </svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#111" }}>{opt.label}</div>
                    <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{opt.sub}</div>
                  </div>
                  <div style={{ width:18, height:18, borderRadius:"50%", flexShrink:0,
                    border:`2px solid ${form.chatPreference===opt.id?"#046EF2":"rgba(0,0,0,0.15)"}`,
                    background: form.chatPreference===opt.id ? "#046EF2" : "transparent",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {form.chatPreference===opt.id && (
                      <div style={{ width:6, height:6, borderRadius:"50%", background:"#fff" }}/>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div style={{ background:"#fff", borderRadius:16, border:"1px solid rgba(0,0,0,0.08)", padding:"20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#111" }}>Social Links & Contacts</div>
              {(!subscriptionPlan || subscriptionPlan === "basic") && (
                <span style={{ fontSize:11, fontWeight:800, padding:"3px 9px", borderRadius:100,
                  background:"rgba(239,68,68,0.1)", color:"#EF4444", border:"1px solid rgba(239,68,68,0.2)" }}>
                  Starter+ only
                </span>
              )}
            </div>
            {(!subscriptionPlan || subscriptionPlan === "basic") ? (
              <div style={{ marginTop:14, padding:"20px 18px", borderRadius:12,
                background:"#fafafa", border:"2px dashed rgba(0,0,0,0.1)", textAlign:"center" }}>
                <div style={{ width:44, height:44, borderRadius:12, background:"rgba(0,0,0,0.06)",
                  display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
                <div style={{ fontSize:14, fontWeight:800, color:"#111", marginBottom:6 }}>
                  Social links locked on Basic plan
                </div>
                <div style={{ fontSize:13, color:"#6B7280", marginBottom:16, lineHeight:1.5 }}>
                  Upgrade to Starter (GHS 49/mo) to add WhatsApp, Instagram, TikTok and your website.
                </div>
                <a href="/store-plans" style={{ display:"inline-flex", alignItems:"center", gap:6,
                  padding:"10px 20px", borderRadius:10, background:"#111", color:"#fff",
                  fontSize:13, fontWeight:800, textDecoration:"none" }}>
                  View Plans and Upgrade
                </a>
              </div>
            ) : (
              <>
                <p style={{ fontSize:13, color:"#9CA3AF", marginBottom:18, marginTop:4 }}>
                  These appear as contact buttons on your store page.
                </p>
                <Field label="WhatsApp Business Number" icon={IC.phone} type="tel" value={form.whatsapp} onChange={e=>upd("whatsapp",e.target.value)} placeholder="+233 XX XXX XXXX" hint="Customers tap to message you directly"/>
                <Field label="Instagram" icon={IC.ig} value={form.instagram} onChange={e=>upd("instagram",e.target.value)} placeholder="@yourstorename"/>
                <Field label="TikTok" icon={IC.tt} value={form.tiktok} onChange={e=>upd("tiktok",e.target.value)} placeholder="@yourstorename"/>
                <Field label="Website" icon={IC.link} type="url" value={form.website} onChange={e=>upd("website",e.target.value)} placeholder="https://yourwebsite.com"/>
              </>
            )}
          </div>
        </div>

        {/* Right — live preview */}
        <div style={{ position: "sticky", top: 80 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.07em", color: "#9CA3AF", marginBottom: 10 }}>
            Live Preview
          </div>
          <Preview form={form} />
          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8, textAlign: "center" }}>
            How your store header looks to customers
          </p>
          <a href={storeUrl} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginTop: 8, padding: "9px 0", borderRadius: 10,
              border: "1.5px solid rgba(0,0,0,0.12)", background: "#fff",
              color: "#111", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            <Ico d={IC.store} size={14} color="#111" />
            Open Full Store Page
          </a>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div style={{ marginTop:32, border:"1.5px solid rgba(239,68,68,0.25)", borderRadius:16,
        padding:"22px 24px", background:"rgba(239,68,68,0.02)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <Ico d={IC.warn} size={18} color="#EF4444"/>
          <div style={{ fontSize:16, fontWeight:800, color:"#EF4444" }}>Danger Zone</div>
        </div>
        <p style={{ fontSize:13, color:"#6B7280", margin:"0 0 18px", lineHeight:1.6 }}>
          Deleting your store is permanent. Your products, orders history, and store page will be hidden.
          This action cannot be undone.
        </p>
        <button type="button" onClick={() => { setShowDelDlg(true); setDelConfirm(""); setDelError(""); }}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px",
            borderRadius:10, border:"1.5px solid #EF4444", background:"#fff",
            color:"#EF4444", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
            transition:"background 0.15s" }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,0.06)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="#fff";}}>
          <Ico d={IC.trash} size={14} color="#EF4444"/>
          Delete Store
        </button>
      </div>

      {/* ── Delete confirmation dialog ── */}
      {showDelDlg && (
        <div onClick={e=>{if(e.target===e.currentTarget){setShowDelDlg(false);setDelConfirm("");setDelError("");}}}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"28px 24px", width:"100%",
            maxWidth:420, boxShadow:"0 24px 64px rgba(0,0,0,0.18)" }}>

            <div style={{ width:52, height:52, borderRadius:"50%", background:"#fef2f2",
              display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Ico d={IC.trash} size={24} color="#EF4444"/>
            </div>

            <div style={{ fontSize:18, fontWeight:900, color:"#111", textAlign:"center",
              letterSpacing:"-0.02em", marginBottom:8 }}>
              Delete your store?
            </div>
            <p style={{ fontSize:13, color:"#6B7280", textAlign:"center", lineHeight:1.6, marginBottom:20 }}>
              This will permanently delete <strong style={{color:"#111"}}>{shop?.shopName || form.shopName}</strong>.
              All your products and store data will be removed. This cannot be undone.
            </p>

            <div style={{ marginBottom:8 }}>
              <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>
                Type your store name to confirm:
              </label>
              <input value={delConfirm} onChange={e=>{setDelConfirm(e.target.value);setDelError("");}}
                placeholder={shop?.shopName || form.shopName}
                style={{ width:"100%", height:44, padding:"0 14px", border:"1.5px solid rgba(0,0,0,0.12)",
                  borderRadius:10, fontSize:14, outline:"none", fontFamily:"inherit",
                  boxSizing:"border-box", color:"#111" }}
                onFocus={e=>e.target.style.borderColor="#EF4444"}
                onBlur={e=>e.target.style.borderColor="rgba(0,0,0,0.12)"}
              />
            </div>

            {delError && (
              <div style={{ fontSize:12, color:"#EF4444", fontWeight:600, marginBottom:12,
                padding:"8px 12px", background:"#fef2f2", borderRadius:8 }}>
                {delError}
              </div>
            )}

            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <button type="button" onClick={()=>{setShowDelDlg(false);setDelConfirm("");setDelError("");}}
                style={{ flex:1, height:44, borderRadius:10, border:"1.5px solid rgba(0,0,0,0.12)",
                  background:"#f5f7fa", color:"#111", fontSize:14, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting ||
                delConfirm.trim().toLowerCase() !== (shop?.shopName||form.shopName).trim().toLowerCase()}
                style={{ flex:1, height:44, borderRadius:10, border:"none",
                  background: (delConfirm.trim().toLowerCase()===(shop?.shopName||form.shopName).trim().toLowerCase())
                    ? "#EF4444" : "#f5f5f5",
                  color: (delConfirm.trim().toLowerCase()===(shop?.shopName||form.shopName).trim().toLowerCase())
                    ? "#fff" : "#9ca3af",
                  fontSize:14, fontWeight:800, cursor:deleting?"wait":"pointer", fontFamily:"inherit",
                  transition:"all 0.15s" }}>
                {deleting ? "Deleting…" : "Delete Store"}
              </button>
            </div>
            <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center", marginTop:12, fontWeight:500 }}>
              This action is permanent and cannot be reversed.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:768px){
          [style*="grid-template-columns: 1fr 300px"]{grid-template-columns:1fr!important;}
        }
      `}</style>
    </div>
  );
}
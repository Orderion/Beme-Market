/**
 * FlashSalePanel.jsx
 * Flash sale creation + management for sellers.
 * Includes:
 *   • Live card preview as seller fills the form (matches FlashDealsBanner style)
 *   • Edit existing sale (change discount value, extend end time)
 *   • End / delete controls
 *   • Status badges (Live / Scheduled / Ended)
 */

import { useState, useMemo } from "react";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const IC = {
  back:   "M19 12H5|M12 5l-7 7 7 7",
  flash:  "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  trash:  "M3 6h18|M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  check:  "M20 6L9 17l-5-5",
  plus:   "M12 5v14|M5 12h14",
  stop:   "M18 6 6 18|M6 6l12 12",
  edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7|M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  info:   "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
  clock:  "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 6v6l4 2",
  img:    "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14l4-4 3 3 3-3 4 4z",
};

const PREVIEW_COLORS = [
  "#DBEAFE", "#DCFCE7", "#FEF9C3", "#FCE7F3", "#EDE9FE",
];

function pad(n) { return String(n).padStart(2, "0"); }
function fmtMoney(v) {
  return `GHS ${Number(v || 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
}

function saleStatus(sale) {
  const now = new Date();
  const end   = sale.endAt?.toDate   ? sale.endAt.toDate()   : new Date(sale.endAt);
  const start = sale.startAt?.toDate ? sale.startAt.toDate() : new Date(sale.startAt);
  if (sale.status === "ended" || end <= now) return "ended";
  if (start > now) return "scheduled";
  return "live";
}

function fmtDatetime(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : (ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts));
  return d.toLocaleString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Live preview card (matches FlashDealsBanner card style) ──
function PreviewCard({ form, product, colorIdx = 0 }) {
  const color = PREVIEW_COLORS[colorIdx % PREVIEW_COLORS.length];
  const image = product
    ? (Array.isArray(product.images) ? product.images[0] : null) || product.imageUrl || ""
    : "";
  const originalPrice = product ? Number(product.price || 0) : 0;
  const discount      = Number(form.discountValue) || 0;
  const dealPrice     = form.discountType === "pct"
    ? originalPrice * (1 - discount / 100)
    : Math.max(0, originalPrice - discount);

  const hasValue = discount > 0 && originalPrice > 0;

  return (
    <div style={{
      display:"flex", flexDirection:"row", alignItems:"stretch",
      width:"100%", maxWidth:280, height:104,
      background:color, border:"1.5px solid rgba(0,0,0,0.07)",
      borderRadius:14, overflow:"hidden", fontFamily:"var(--sd-font)",
    }}>
      {/* Image */}
      <div style={{ width:96, flexShrink:0, background:"rgba(255,255,255,0.4)", position:"relative", overflow:"hidden" }}>
        {image
          ? <img src={image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(0,0,0,0.2)" }}>
              <Ico d={IC.img} size={28} color="rgba(0,0,0,0.2)" />
            </div>
        }
        {hasValue && (
          <div style={{ position:"absolute", top:6, left:6, background:"#111", color:"#fff",
            fontSize:10, fontWeight:900, padding:"2px 7px", borderRadius:100, letterSpacing:"0.02em" }}>
            -{form.discountType==="pct" ? `${discount}%` : `GHS ${discount}`}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center",
        gap:3, padding:"10px 12px 10px 10px", minWidth:0 }}>
        <p style={{ fontSize:12.5, fontWeight:800, color:"#111", margin:0, whiteSpace:"nowrap",
          overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-0.01em" }}>
          {product?.name || (form.productIds?.length ? "Product name" : "Select a product")}
        </p>
        {product?.shopName && (
          <p style={{ fontSize:10, fontWeight:600, color:"rgba(0,0,0,0.45)", margin:0 }}>
            {product.shopName}
          </p>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#EF4444",
            animation:"fdb-pulse 1.1s ease-in-out infinite", flexShrink:0 }} />
          <span style={{ fontSize:11, fontWeight:900, color:"#EF4444", letterSpacing:"0.04em" }}>
            {form.endAt ? "Ends soon" : "00:00:00"}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
          <span style={{ fontSize:14, fontWeight:900, color:"#111", letterSpacing:"-0.02em" }}>
            {hasValue ? fmtMoney(dealPrice) : fmtMoney(originalPrice)}
          </span>
          {hasValue && originalPrice > 0 && (
            <span style={{ fontSize:10, fontWeight:600, color:"rgba(0,0,0,0.4)", textDecoration:"line-through" }}>
              {fmtMoney(originalPrice)}
            </span>
          )}
        </div>
        <span style={{ fontSize:10, fontWeight:800, color:"rgba(0,0,0,0.5)" }}>
          Shop now →
        </span>
      </div>
      <style>{`@keyframes fdb-pulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.3;transform:scale(.7);} }`}</style>
    </div>
  );
}

// ── Edit modal (extend end time / change discount) ──
function EditModal({ sale, onSave, onClose, submitting }) {
  const [discountValue, setDiscountValue] = useState(String(sale.discountValue || ""));
  const [endAt, setEndAt] = useState(
    sale.endAt?.toDate
      ? sale.endAt.toDate().toISOString().slice(0, 16)
      : sale.endAt ? new Date(sale.endAt).toISOString().slice(0, 16) : ""
  );
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!discountValue || Number(discountValue) <= 0) { setErr("Discount must be > 0."); return; }
    if (!endAt) { setErr("End time is required."); return; }
    if (new Date(endAt) <= new Date()) { setErr("End time must be in the future."); return; }
    try {
      await onSave(sale.id, {
        discountValue: Number(discountValue),
        endAt: new Date(endAt),
      });
      onClose();
    } catch (e) { setErr(e.message || "Failed to save."); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"var(--sd-white)", borderRadius:16, padding:24, width:"100%",
        maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <span style={{ fontSize:15, fontWeight:800, color:"var(--sd-text)" }}>Edit Sale</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            fontSize:20, color:"var(--sd-muted)", lineHeight:1 }}>×</button>
        </div>

        <div className="sd-form-group">
          <label className="sd-label">
            Discount Value {sale.discountType === "pct" ? "(%)" : "(GHS)"}
          </label>
          <input className="sd-input" type="number" min="1"
            max={sale.discountType === "pct" ? 100 : undefined}
            value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
        </div>

        <div className="sd-form-group">
          <label className="sd-label">New End Time</label>
          <input className="sd-input" type="datetime-local"
            value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </div>

        {err && <div className="sd-modal-err">{err}</div>}

        <div style={{ display:"flex", gap:10 }}>
          <button className="sd-btn sd-btn-ghost" onClick={onClose} style={{ flex:1 }}>Cancel</button>
          <button className="sd-btn sd-btn-primary" onClick={handleSave}
            disabled={submitting} style={{ flex:2, justifyContent:"center" }}>
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status badge ──
function StatusBadge({ status }) {
  const map = {
    live:      { cls:"sd-badge-green",  label:"Live" },
    scheduled: { cls:"sd-badge-yellow", label:"Scheduled" },
    ended:     { cls:"sd-badge-gray",   label:"Ended" },
  };
  const { cls, label } = map[status] || map.ended;
  return <span className={`sd-badge ${cls}`}>{label}</span>;
}

// ── Main export ──
export default function FlashSalePanel({
  onBack, flashSales, activeSales, flashLoading,
  createSale, endSale, removeSale, submitting,
  products,
  // Pass updateSale from useMarketing if available — optional
  updateSale,
}) {
  const [view,       setView]       = useState("list"); // "list" | "create"
  const [editTarget, setEditTarget] = useState(null);   // sale being edited
  const [confirm,    setConfirm]    = useState(null);   // sale id pending delete confirm

  const [form, setForm] = useState({
    title: "", productIds: [], discountType: "pct", discountValue: "",
    startAt: "", endAt: "",
  });
  const [err,     setErr]     = useState("");
  const [success, setSuccess] = useState(false);
  const [colorIdx]            = useState(() => Math.floor(Math.random() * 5));

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleProduct = (id) => {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((p) => p !== id)
        : [id, ...f.productIds.filter((p) => p !== id)], // put newest first
    }));
  };

  // The first selected product drives the preview
  const previewProduct = useMemo(
    () => products?.find((p) => p.id === form.productIds[0]) || null,
    [form.productIds, products]
  );

  const handleCreate = async () => {
    setErr("");
    if (!form.productIds.length) { setErr("Select at least one product."); return; }
    if (!form.discountValue)     { setErr("Enter a discount amount."); return; }
    if (!form.startAt || !form.endAt) { setErr("Set start and end times."); return; }
    if (new Date(form.endAt) <= new Date(form.startAt)) { setErr("End time must be after start."); return; }
    try {
      await createSale(form);
      setSuccess(true);
      setForm({ title:"", productIds:[], discountType:"pct", discountValue:"", startAt:"", endAt:"" });
      setTimeout(() => { setSuccess(false); setView("list"); }, 1800);
    } catch (e) { setErr(e.message || "Failed to create sale."); }
  };

  const handleEnd = async (id) => {
    try { await endSale(id); } catch (e) { setErr(e.message); }
  };

  const handleDelete = async (id) => {
    try { await removeSale(id); setConfirm(null); } catch (e) { setErr(e.message); }
  };

  const handleUpdate = async (saleId, updates) => {
    if (updateSale) {
      await updateSale(saleId, updates);
    }
    // If no updateSale prop, just close (seller refreshes manually)
  };

  // ── CREATE VIEW ──
  if (view === "create") {
    return (
      <div>
        <button className="sd-modal-back-btn" onClick={() => setView("list")}>
          <Ico d={IC.back} size={13} /> Back to Sales
        </button>

        {/* Live preview */}
        <div className="sd-panel" style={{ marginBottom:14 }}>
          <div className="sd-panel-head">
            <span className="sd-panel-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Ico d={IC.flash} size={14} color="#F59E0B" /> Live Preview
            </span>
            <span style={{ fontSize:11, color:"var(--sd-muted)" }}>Updates as you fill in the form</span>
          </div>
          <div style={{ display:"flex", justifyContent:"center" }}>
            <PreviewCard form={form} product={previewProduct} colorIdx={colorIdx} />
          </div>
        </div>

        {/* Form */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Ico d={IC.plus} size={14} color="var(--sd-accent)" /> Create Flash Sale
            </span>
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Select Products ({form.productIds.length} selected)</label>
            {!products?.length ? (
              <div style={{ padding:14, borderRadius:8, background:"var(--sd-bg)",
                border:"1px solid var(--sd-border)", fontSize:13, color:"var(--sd-muted)" }}>
                No products found. Add products first from the Products tab.
              </div>
            ) : (
              <div style={{ maxHeight:220, overflowY:"auto",
                border:"1px solid var(--sd-border)", borderRadius:8, padding:8,
                display:"flex", flexDirection:"column", gap:5 }}>
                {products.map((p) => {
                  const sel = form.productIds.includes(p.id);
                  const img = (Array.isArray(p.images) ? p.images[0] : null) || p.imageUrl || "";
                  return (
                    <label key={p.id} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"7px 9px", borderRadius:8, cursor:"pointer",
                      background: sel ? "var(--sd-accent-dim)" : "transparent",
                      border:`1px solid ${sel ? "var(--sd-accent-border)" : "transparent"}`,
                      transition:"all 0.1s" }}>
                      <input type="checkbox" checked={sel} onChange={() => toggleProduct(p.id)}
                        style={{ accentColor:"var(--sd-accent)", width:14, height:14 }} />
                      {img && <img src={img} alt={p.name}
                        style={{ width:32, height:32, borderRadius:6, objectFit:"cover", flexShrink:0 }} />}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--sd-text)",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                        <div style={{ fontSize:11, color:"var(--sd-muted)" }}>
                          GHS {Number(p.price || 0).toFixed(2)}
                        </div>
                      </div>
                      {sel && <Ico d={IC.check} size={13} color="var(--sd-accent)" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Discount Type</label>
            <div style={{ display:"flex", gap:10 }}>
              {[["pct","Percentage (%)"],["fixed","Fixed Amount (GHS)"]].map(([val, label]) => (
                <label key={val} style={{ flex:1, padding:"10px 14px", borderRadius:8,
                  border:`2px solid ${form.discountType===val ? "var(--sd-accent)" : "var(--sd-border)"}`,
                  background: form.discountType===val ? "var(--sd-accent-dim)" : "transparent",
                  cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
                  <input type="radio" name="dtype" value={val}
                    checked={form.discountType===val} onChange={upd("discountType")} style={{ display:"none" }} />
                  <span style={{ fontSize:13, fontWeight:600,
                    color: form.discountType===val ? "var(--sd-accent)" : "var(--sd-text)" }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sd-form-group">
            <label className="sd-label">
              Discount Value {form.discountType==="pct" ? "(0–100%)" : "(GHS)"}
            </label>
            <input className="sd-input" type="number" min="1"
              max={form.discountType==="pct" ? 100 : undefined}
              placeholder={form.discountType==="pct" ? "e.g. 20" : "e.g. 15"}
              value={form.discountValue} onChange={upd("discountValue")} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="sd-form-group">
              <label className="sd-label">Start Time</label>
              <input className="sd-input" type="datetime-local"
                value={form.startAt} onChange={upd("startAt")} />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">End Time</label>
              <input className="sd-input" type="datetime-local"
                value={form.endAt} onChange={upd("endAt")} />
            </div>
          </div>

          {err && <div className="sd-modal-err">{err}</div>}
          {success && (
            <div style={{ padding:"12px 14px", borderRadius:8, background:"var(--sd-success-bg)",
              color:"var(--sd-success)", fontSize:13, fontWeight:700, marginBottom:14,
              display:"flex", alignItems:"center", gap:8 }}>
              <Ico d={IC.check} size={14} color="var(--sd-success)" />
              Flash sale created! It will appear in the homepage banner.
            </div>
          )}

          <button className="sd-btn sd-btn-primary"
            style={{ width:"100%", justifyContent:"center", padding:12 }}
            onClick={handleCreate} disabled={submitting}>
            {submitting ? "Creating…" : <><Ico d={IC.flash} size={14} /> Launch Flash Sale</>}
          </button>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div>
      <button className="sd-modal-back-btn" onClick={onBack}>
        <Ico d={IC.back} size={13} /> Back to Marketing
      </button>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <div className="sd-page-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Ico d={IC.flash} size={14} color="#F59E0B" /> Flash Sales
          </div>
          <div className="sd-page-sub">
            {activeSales.length} active · {flashSales.length} total
          </div>
        </div>
        <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => setView("create")}>
          <Ico d={IC.plus} size={13} /> New Sale
        </button>
      </div>

      {/* Info */}
      <div className="sd-info-panel info" style={{ marginBottom:16 }}>
        <Ico d={IC.info} size={16} color="var(--sd-accent)" />
        <span className="sd-info-text">
          Your flash sales appear in the homepage banner. Higher plan + active boosts
          push your deals higher in the feed. Click counts influence future ranking.
        </span>
      </div>

      {err && <div className="sd-modal-err" style={{ marginBottom:12 }}>{err}</div>}

      <div className="sd-panel">
        {flashLoading
          ? [1,2,3].map((i) => (
              <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />
            ))
          : flashSales.length === 0
            ? (
              <div className="sd-empty">
                <div style={{ width:48, height:48, borderRadius:12, background:"rgba(245,158,11,0.1)",
                  display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <Ico d={IC.flash} size={24} color="#F59E0B" />
                </div>
                <div className="sd-empty-title">No flash sales yet</div>
                <div className="sd-empty-text">Create your first sale to drive urgency and boost sales.</div>
                <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => setView("create")}>
                  <Ico d={IC.plus} size={13} /> Create Flash Sale
                </button>
              </div>
            )
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Products</th>
                      <th>Discount</th>
                      <th>Ends</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {flashSales.map((sale) => {
                      const status = saleStatus(sale);
                      return (
                        <tr key={sale.id}>
                          <td style={{ color:"var(--sd-muted)", fontSize:12 }}>
                            {sale.productIds?.length || 0} product{sale.productIds?.length !== 1 ? "s" : ""}
                          </td>
                          <td style={{ fontWeight:700, color:"#F59E0B" }}>
                            {sale.discountType==="pct"
                              ? `${sale.discountValue}%`
                              : `GHS ${sale.discountValue}`} off
                          </td>
                          <td style={{ color:"var(--sd-muted)", fontSize:12 }}>
                            {fmtDatetime(sale.endAt)}
                          </td>
                          <td><StatusBadge status={status} /></td>
                          <td>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              {status !== "ended" && updateSale && (
                                <button className="sd-btn sd-btn-secondary sd-btn-sm"
                                  onClick={() => setEditTarget(sale)} disabled={submitting}
                                  title="Edit">
                                  <Ico d={IC.edit} size={12} /> Edit
                                </button>
                              )}
                              {status === "live" && (
                                <button className="sd-btn sd-btn-ghost sd-btn-sm"
                                  onClick={() => handleEnd(sale.id)} disabled={submitting}
                                  title="End sale now">
                                  <Ico d={IC.stop} size={12} /> End
                                </button>
                              )}
                              <button className="sd-btn sd-btn-danger sd-btn-sm"
                                onClick={() => setConfirm(sale.id)} disabled={submitting}
                                title="Delete">
                                <Ico d={IC.trash} size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          sale={editTarget}
          onSave={handleUpdate}
          onClose={() => setEditTarget(null)}
          submitting={submitting}
        />
      )}

      {/* Delete confirm */}
      {confirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:200,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"var(--sd-white)", borderRadius:16, padding:"28px 24px",
            maxWidth:340, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", textAlign:"center" }}>
            <div style={{ width:48, height:48, borderRadius:12, background:"rgba(239,68,68,0.08)",
              display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
              <Ico d={IC.trash} size={22} color="#EF4444" />
            </div>
            <div style={{ fontSize:17, fontWeight:900, color:"var(--sd-text)", marginBottom:8 }}>
              Delete this sale?
            </div>
            <div style={{ fontSize:13, color:"var(--sd-muted)", marginBottom:22, lineHeight:1.5 }}>
              The flash sale will be removed from the marketplace immediately.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="sd-btn sd-btn-ghost" onClick={() => setConfirm(null)}
                style={{ flex:1 }}>Cancel</button>
              <button className="sd-btn sd-btn-danger" onClick={() => handleDelete(confirm)}
                disabled={submitting}
                style={{ flex:1, justifyContent:"center", background:"#EF4444", color:"#fff" }}>
                {submitting ? "…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
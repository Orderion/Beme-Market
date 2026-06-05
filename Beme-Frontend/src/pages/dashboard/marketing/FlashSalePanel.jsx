/**
 * FlashSalePanel.jsx
 * Flash sale creation and management — matches Beme dashboard design system.
 * Uses sd-* CSS classes from SellerDashboard.css.
 */
import { useState } from "react";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  back:    "M19 12H5|M12 5l-7 7 7 7",
  flash:   "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  trash:   "M3 6h18|M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  check:   "M20 6L9 17l-5-5",
  clock:   "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 6v6l4 2",
  plus:    "M12 5v14|M5 12h14",
  stop:    "M18 6 6 18|M6 6l12 12",
  info:    "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
};

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : (ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts));
  return d.toLocaleString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function SaleStatusBadge({ sale }) {
  const now = new Date();
  const end = sale.endAt?.toDate ? sale.endAt.toDate() : new Date(sale.endAt);
  const start = sale.startAt?.toDate ? sale.startAt.toDate() : new Date(sale.startAt);

  if (sale.status === "ended" || end <= now) return <span className="sd-badge sd-badge-gray">Ended</span>;
  if (start > now) return <span className="sd-badge sd-badge-yellow">Scheduled</span>;
  return <span className="sd-badge sd-badge-green">Live</span>;
}

export default function FlashSalePanel({ onBack, flashSales, activeSales, flashLoading, createSale, endSale, removeSale, submitting, products }) {
  const [view, setView] = useState("list"); // "list" | "create"
  const [form, setForm] = useState({
    title: "", productIds: [], discountType: "pct", discountValue: "",
    startAt: "", endAt: "",
  });
  const [err, setErr]   = useState("");
  const [success, setSuccess] = useState(false);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleProduct = (id) => {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((p) => p !== id)
        : [...f.productIds, id],
    }));
  };

  const handleCreate = async () => {
    setErr("");
    if (!form.title.trim()) { setErr("Give your sale a title."); return; }
    if (!form.productIds.length) { setErr("Select at least one product."); return; }
    if (!form.discountValue) { setErr("Enter a discount amount."); return; }
    if (!form.startAt || !form.endAt) { setErr("Set start and end times."); return; }
    try {
      await createSale(form);
      setSuccess(true);
      setForm({ title: "", productIds: [], discountType: "pct", discountValue: "", startAt: "", endAt: "" });
      setTimeout(() => { setSuccess(false); setView("list"); }, 1600);
    } catch (e) {
      setErr(e.message || "Failed to create sale.");
    }
  };

  const handleEnd = async (id) => {
    try { await endSale(id); } catch (e) { setErr(e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this flash sale?")) return;
    try { await removeSale(id); } catch (e) { setErr(e.message); }
  };

  // ── CREATE FORM ──
  if (view === "create") {
    return (
      <div>
        <button className="sd-modal-back-btn" onClick={() => setView("list")}>
          <Ico d={IC.back} size={13} /> Back to Sales
        </button>
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Ico d={IC.flash} size={14} color="#F59E0B" /> Create Flash Sale
            </span>
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Sale Title</label>
            <input className="sd-input" placeholder="e.g. Weekend Deals, Mid-Month Sale"
              value={form.title} onChange={upd("title")} />
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Discount Type</label>
            <div style={{ display:"flex", gap:10 }}>
              {[["pct","Percentage (%)"], ["fixed","Fixed Amount (GHS)"]].map(([val, label]) => (
                <label key={val} style={{ flex:1, padding:"10px 14px", borderRadius:8,
                  border:`2px solid ${form.discountType===val ? "var(--sd-accent)" : "var(--sd-border)"}`,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                  background: form.discountType===val ? "var(--sd-accent-dim)" : "transparent" }}>
                  <input type="radio" name="dtype" value={val}
                    checked={form.discountType===val}
                    onChange={upd("discountType")} style={{ display:"none" }} />
                  <span style={{ fontSize:13, fontWeight:600,
                    color: form.discountType===val ? "var(--sd-accent)" : "var(--sd-text)" }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Discount Value {form.discountType==="pct" ? "(0–100%)" : "(GHS)"}</label>
            <input className="sd-input" type="number" min="1" max={form.discountType==="pct" ? 100 : undefined}
              placeholder={form.discountType==="pct" ? "e.g. 20" : "e.g. 10"}
              value={form.discountValue} onChange={upd("discountValue")} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="sd-form-group">
              <label className="sd-label">Start Time</label>
              <input className="sd-input" type="datetime-local" value={form.startAt} onChange={upd("startAt")} />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">End Time</label>
              <input className="sd-input" type="datetime-local" value={form.endAt} onChange={upd("endAt")} />
            </div>
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Products in this Sale ({form.productIds.length} selected)</label>
            {!products?.length ? (
              <div style={{ padding:14, borderRadius:8, background:"var(--sd-bg)",
                border:"1px solid var(--sd-border)", fontSize:13, color:"var(--sd-muted)" }}>
                No products found. Add products first.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:220, overflowY:"auto",
                border:"1px solid var(--sd-border)", borderRadius:8, padding:8 }}>
                {products.map((p) => {
                  const selected = form.productIds.includes(p.id);
                  return (
                    <label key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                      borderRadius:8, cursor:"pointer",
                      background: selected ? "var(--sd-accent-dim)" : "transparent",
                      border: `1px solid ${selected ? "var(--sd-accent-border)" : "transparent"}` }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleProduct(p.id)}
                        style={{ accentColor:"var(--sd-accent)" }} />
                      {(p.images?.[0] || p.imageUrl) && (
                        <img src={p.images?.[0] || p.imageUrl} alt={p.name}
                          style={{ width:32, height:32, borderRadius:6, objectFit:"cover", flexShrink:0 }} />
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--sd-text)",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                        <div style={{ fontSize:11, color:"var(--sd-muted)" }}>GHS {Number(p.price||0).toFixed(2)}</div>
                      </div>
                      {selected && <Ico d={IC.check} size={14} color="var(--sd-accent)" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {err && <div className="sd-modal-err">{err}</div>}
          {success && (
            <div style={{ padding:"12px 14px", borderRadius:8, background:"var(--sd-success-bg)",
              color:"var(--sd-success)", fontSize:13, fontWeight:700, marginBottom:14,
              display:"flex", alignItems:"center", gap:8 }}>
              <Ico d={IC.check} size={14} color="var(--sd-success)" /> Flash sale created!
            </div>
          )}

          <button className="sd-btn sd-btn-primary" style={{ width:"100%", justifyContent:"center", padding:12 }}
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

      {/* Info banner */}
      <div className="sd-info-panel info" style={{ marginBottom:16 }}>
        <Ico d={IC.info} size={16} color="var(--sd-accent)" />
        <span className="sd-info-text">
          Flash sales apply automatically to selected products in the marketplace. Customers see a countdown timer and the discounted price. Sales auto-expire at the end time.
        </span>
      </div>

      <div className="sd-panel">
        {flashLoading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : flashSales.length === 0
            ? (
              <div className="sd-empty">
                <div style={{ width:48, height:48, borderRadius:12, background:"rgba(245,158,11,0.1)",
                  display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <Ico d={IC.flash} size={24} color="#F59E0B" />
                </div>
                <div className="sd-empty-title">No flash sales yet</div>
                <div className="sd-empty-text">Create your first sale to drive urgency and boost conversions.</div>
                <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => setView("create")}>
                  <Ico d={IC.plus} size={13} /> Create Flash Sale
                </button>
              </div>
            )
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr><th>Title</th><th>Discount</th><th>Products</th><th>Ends</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {flashSales.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight:600 }}>{s.title}</td>
                        <td style={{ fontWeight:700, color:"#F59E0B" }}>
                          {s.discountType==="pct" ? `${s.discountValue}%` : `GHS ${s.discountValue}`} off
                        </td>
                        <td style={{ color:"var(--sd-muted)", fontSize:12 }}>
                          {s.productIds?.length || 0} product{s.productIds?.length !== 1 ? "s" : ""}
                        </td>
                        <td style={{ color:"var(--sd-muted)", fontSize:12 }}>{fmtDate(s.endAt)}</td>
                        <td><SaleStatusBadge sale={s} /></td>
                        <td>
                          <div style={{ display:"flex", gap:6 }}>
                            {s.status === "active" && (
                              <button className="sd-btn sd-btn-ghost sd-btn-sm"
                                onClick={() => handleEnd(s.id)} disabled={submitting}
                                title="End sale now">
                                <Ico d={IC.stop} size={12} /> End
                              </button>
                            )}
                            <button className="sd-btn sd-btn-danger sd-btn-sm"
                              onClick={() => handleDelete(s.id)} disabled={submitting}
                              title="Delete">
                              <Ico d={IC.trash} size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
      {err && <div className="sd-modal-err" style={{ marginTop:12 }}>{err}</div>}
    </div>
  );
}
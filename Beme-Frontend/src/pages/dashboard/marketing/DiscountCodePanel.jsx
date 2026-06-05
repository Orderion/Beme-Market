/**
 * DiscountCodePanel.jsx
 * Discount code creation and management — Beme dashboard design system.
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
  back:   "M19 12H5|M12 5l-7 7 7 7",
  tag:    "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z|M7 7h.01",
  copy:   "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z|M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  trash:  "M3 6h18|M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  check:  "M20 6L9 17l-5-5",
  plus:   "M12 5v14|M5 12h14",
  info:   "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
  refresh:"M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
};

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

function CodeRow({ code, onToggle, onDelete, onCopy, submitting }) {
  const isExpired = code.expiresAt && new Date() > (code.expiresAt?.toDate ? code.expiresAt.toDate() : new Date(code.expiresAt));
  const isFull    = code.usageLimit && code.usedCount >= code.usageLimit;

  let status = "active";
  if (!code.active) status = "inactive";
  else if (isExpired) status = "expired";
  else if (isFull) status = "used-up";

  const badgeClass = {
    active:   "sd-badge-green",
    inactive: "sd-badge-gray",
    expired:  "sd-badge-red",
    "used-up":"sd-badge-yellow",
  }[status] || "sd-badge-gray";

  const badgeLabel = {
    active:   "Active",
    inactive: "Paused",
    expired:  "Expired",
    "used-up":"Limit Reached",
  }[status] || status;

  return (
    <tr>
      <td>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <code style={{ fontSize:13, fontWeight:800, color:"var(--sd-accent)",
            background:"var(--sd-accent-dim)", padding:"3px 8px", borderRadius:6,
            letterSpacing:"0.06em", border:"1px solid var(--sd-accent-border)" }}>
            {code.code}
          </code>
          <button onClick={() => onCopy(code.code)}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:"var(--sd-muted)", display:"flex", alignItems:"center", padding:2 }}
            title="Copy code">
            <Ico d={IC.copy} size={12} />
          </button>
        </div>
      </td>
      <td style={{ fontWeight:700, color: code.type==="pct" ? "#7c3aed" : "#0891B2" }}>
        {code.type==="pct" ? `${code.value}%` : `GHS ${code.value}`} off
      </td>
      <td style={{ fontSize:12, color:"var(--sd-muted)" }}>
        {code.usedCount || 0}{code.usageLimit ? `/${code.usageLimit}` : " uses"}
      </td>
      <td style={{ fontSize:12, color:"var(--sd-muted)" }}>
        {code.minOrderAmount ? `GHS ${code.minOrderAmount}` : "Any"}
      </td>
      <td style={{ fontSize:12, color:"var(--sd-muted)" }}>{fmtDate(code.expiresAt)}</td>
      <td><span className={`sd-badge ${badgeClass}`}>{badgeLabel}</span></td>
      <td>
        <div style={{ display:"flex", gap:6 }}>
          {status !== "expired" && status !== "used-up" && (
            <button className={`sd-btn sd-btn-sm ${code.active ? "sd-btn-ghost" : "sd-btn-secondary"}`}
              onClick={() => onToggle(code.id, !code.active)} disabled={submitting}
              title={code.active ? "Pause" : "Activate"}>
              {code.active ? "Pause" : "Activate"}
            </button>
          )}
          <button className="sd-btn sd-btn-danger sd-btn-sm"
            onClick={() => onDelete(code.id)} disabled={submitting}
            title="Delete">
            <Ico d={IC.trash} size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function DiscountCodePanel({ onBack, discountCodes, codesLoading, createCode, toggleCode, removeCode, submitting }) {
  const [view, setView]   = useState("list");
  const [copied, setCopied] = useState(null);
  const [err, setErr]     = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm]   = useState({
    code: "", type: "pct", value: "",
    usageLimit: "", minOrderAmount: "", expiresAt: "",
  });

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleCreate = async () => {
    setErr("");
    if (!form.value) { setErr("Enter a discount value."); return; }
    try {
      await createCode({
        code:           form.code.trim() || undefined,
        type:           form.type,
        value:          form.value,
        usageLimit:     form.usageLimit || null,
        minOrderAmount: form.minOrderAmount || 0,
        expiresAt:      form.expiresAt || null,
      });
      setSuccess(true);
      setForm({ code:"", type:"pct", value:"", usageLimit:"", minOrderAmount:"", expiresAt:"" });
      setTimeout(() => { setSuccess(false); setView("list"); }, 1600);
    } catch (e) {
      setErr(e.message || "Failed to create code.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this discount code?")) return;
    try { await removeCode(id); } catch (e) { setErr(e.message); }
  };

  const handleToggle = async (id, active) => {
    try { await toggleCode(id, active); } catch (e) { setErr(e.message); }
  };

  // ── CREATE VIEW ──
  if (view === "create") {
    return (
      <div>
        <button className="sd-modal-back-btn" onClick={() => setView("list")}>
          <Ico d={IC.back} size={13} /> Back to Codes
        </button>
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Ico d={IC.tag} size={14} color="var(--sd-accent)" /> Create Discount Code
            </span>
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Code (leave blank to auto-generate)</label>
            <input className="sd-input" placeholder="e.g. SAVE20, SUMMER10"
              value={form.code} onChange={upd("code")}
              style={{ textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:700 }} />
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Discount Type</label>
            <div style={{ display:"flex", gap:10 }}>
              {[["pct","Percentage (%)"],["fixed","Fixed Amount (GHS)"]].map(([val, label]) => (
                <label key={val} style={{ flex:1, padding:"10px 14px", borderRadius:8,
                  border:`2px solid ${form.type===val ? "var(--sd-accent)" : "var(--sd-border)"}`,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                  background: form.type===val ? "var(--sd-accent-dim)" : "transparent" }}>
                  <input type="radio" name="ctype" value={val} checked={form.type===val}
                    onChange={upd("type")} style={{ display:"none" }} />
                  <span style={{ fontSize:13, fontWeight:600,
                    color: form.type===val ? "var(--sd-accent)" : "var(--sd-text)" }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="sd-form-group">
              <label className="sd-label">Discount Value {form.type==="pct" ? "(%)" : "(GHS)"}</label>
              <input className="sd-input" type="number" min="1" max={form.type==="pct" ? 100 : undefined}
                placeholder={form.type==="pct" ? "e.g. 15" : "e.g. 5"}
                value={form.value} onChange={upd("value")} />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Usage Limit (optional)</label>
              <input className="sd-input" type="number" min="1" placeholder="e.g. 50 uses"
                value={form.usageLimit} onChange={upd("usageLimit")} />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Min. Order Amount (GHS)</label>
              <input className="sd-input" type="number" min="0" placeholder="0 = any order"
                value={form.minOrderAmount} onChange={upd("minOrderAmount")} />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Expiry Date (optional)</label>
              <input className="sd-input" type="datetime-local"
                value={form.expiresAt} onChange={upd("expiresAt")} />
            </div>
          </div>

          {form.value && (
            <div style={{ padding:"11px 14px", borderRadius:10, background:"var(--sd-accent-dim)",
              border:"1px solid var(--sd-accent-border)", fontSize:13, color:"var(--sd-accent)",
              fontWeight:600, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
              <Ico d={IC.tag} size={14} color="var(--sd-accent)" />
              {form.type==="pct"
                ? `Customers get ${form.value}% off${form.minOrderAmount ? ` on orders above GHS ${form.minOrderAmount}` : ""}`
                : `Customers get GHS ${form.value} off${form.minOrderAmount ? ` on orders above GHS ${form.minOrderAmount}` : ""}`}
            </div>
          )}

          {err && <div className="sd-modal-err">{err}</div>}
          {success && (
            <div style={{ padding:"12px 14px", borderRadius:8, background:"var(--sd-success-bg)",
              color:"var(--sd-success)", fontSize:13, fontWeight:700, marginBottom:14,
              display:"flex", alignItems:"center", gap:8 }}>
              <Ico d={IC.check} size={14} color="var(--sd-success)" /> Code created!
            </div>
          )}
          <button className="sd-btn sd-btn-primary" style={{ width:"100%", justifyContent:"center", padding:12 }}
            onClick={handleCreate} disabled={submitting}>
            {submitting ? "Creating…" : <><Ico d={IC.tag} size={14} /> Generate Code</>}
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
            <Ico d={IC.tag} size={14} color="var(--sd-accent)" /> Discount Codes
          </div>
          <div className="sd-page-sub">
            {discountCodes.filter((c) => c.active).length} active · {discountCodes.length} total
          </div>
        </div>
        <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => setView("create")}>
          <Ico d={IC.plus} size={13} /> New Code
        </button>
      </div>

      {copied && (
        <div style={{ padding:"10px 14px", borderRadius:8, background:"var(--sd-success-bg)",
          color:"var(--sd-success)", fontSize:13, fontWeight:700, marginBottom:12,
          display:"flex", alignItems:"center", gap:8 }}>
          <Ico d={IC.check} size={14} color="var(--sd-success)" /> "{copied}" copied to clipboard
        </div>
      )}

      <div className="sd-info-panel info" style={{ marginBottom:16 }}>
        <Ico d={IC.info} size={16} color="var(--sd-accent)" />
        <span className="sd-info-text">
          Customers enter these codes at checkout. Share them on WhatsApp, Instagram, or TikTok.
          Codes are applied automatically to matching orders.
        </span>
      </div>

      <div className="sd-panel">
        {codesLoading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : discountCodes.length === 0
            ? (
              <div className="sd-empty">
                <div style={{ width:48, height:48, borderRadius:12, background:"var(--sd-accent-dim)",
                  display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <Ico d={IC.tag} size={24} color="var(--sd-accent)" />
                </div>
                <div className="sd-empty-title">No discount codes yet</div>
                <div className="sd-empty-text">Create codes and share them with your customers to drive sales.</div>
                <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => setView("create")}>
                  <Ico d={IC.plus} size={13} /> Create Code
                </button>
              </div>
            )
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Code</th><th>Discount</th><th>Uses</th>
                      <th>Min. Order</th><th>Expires</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {discountCodes.map((c) => (
                      <CodeRow key={c.id} code={c}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                        submitting={submitting} />
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
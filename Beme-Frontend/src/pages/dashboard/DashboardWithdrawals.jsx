// src/pages/dashboard/DashboardWithdrawals.jsx
import { useState } from "react";
import { useWithdrawals } from "../../hooks/useWithdrawals";
import { PAYOUT_METHODS, MIN_WITHDRAWAL } from "../../services/payoutService";
import { IconWallet, IconInfo, IconAlertTriangle } from "../../components/icons/SellerIcons";

const STATUS_BADGE = { pending:"sd-badge-yellow", processing:"sd-badge-blue", approved:"sd-badge-blue", completed:"sd-badge-green", rejected:"sd-badge-red" };

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

function EmptyWithdrawals() {
  return (
    <div className="sd-empty">
      <IconWallet size={40} color="#D1D5DB" />
      <div className="sd-empty-title" style={{ marginTop:12 }}>No withdrawals yet</div>
      <div className="sd-empty-text">Your payout requests will appear here once submitted.</div>
    </div>
  );
}

export default function DashboardWithdrawals() {
  const { withdrawals, loading, submitting, error, pendingTotal, completedTotal, requestWithdrawal } = useWithdrawals();

  const [showForm, setShowForm] = useState(false);
  const [agreed,   setAgreed]   = useState(false);
  const [form, setForm]         = useState({ amount:"", method:"momo", momoNumber:"", momoNetwork:"MTN", accountName:"", bankName:"", bankAccount:"" });
  const [formError, setFormError] = useState(null);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setFormError("Please agree to the payout terms."); return; }
    setFormError(null);
    try {
      await requestWithdrawal(form);
      setShowForm(false);
      setForm({ amount:"", method:"momo", momoNumber:"", momoNetwork:"MTN", accountName:"", bankName:"", bankAccount:"" });
      setAgreed(false);
    } catch (err) { setFormError(err.message || "Failed to submit request."); }
  };

  return (
    <div>
      <div className="sd-page-head">
        <div><div className="sd-page-title">Withdrawals</div><div className="sd-page-sub">Request payouts to your MoMo or bank account</div></div>
        <button className="sd-btn sd-btn-primary" onClick={() => setShowForm(true)}>+ Request Withdrawal</button>
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:14, marginBottom:14 }}>
        {[
          { label:"Available Balance", value:"GHS 0.00",                         note:"Contact support to check",  color:"#22C55E" },
          { label:"Pending Payouts",   value:`GHS ${pendingTotal.toFixed(2)}`,   note:"Awaiting admin review",     color:"#F59E0B" },
          { label:"Total Withdrawn",   value:`GHS ${completedTotal.toFixed(2)}`, note:"All time completed",        color:"#046EF2" },
        ].map((c) => (
          <div key={c.label} className="sd-stat-card">
            <div className="sd-stat-label">{c.label}</div>
            <div className="sd-stat-value" style={{ fontSize:22, color:c.color }}>{c.value}</div>
            <div style={{ fontSize:11, color:"#8B8FA8", marginTop:4 }}>{c.note}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="sd-info-panel info" style={{ marginBottom:14 }}>
        <InfoIcon />
        <div className="sd-info-text">
          <strong>Payout Policy:</strong> Minimum withdrawal is GHS {MIN_WITHDRAWAL}. Payouts are processed within 1–3 business days. Ensure your details are accurate — Beme Market is not responsible for payments to wrong accounts.
        </div>
      </div>

      {/* History table */}
      <div className="sd-panel">
        <div className="sd-panel-head"><span className="sd-panel-title">Withdrawal History</span></div>
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : withdrawals.length === 0 ? <EmptyWithdrawals />
          : (
            <div className="sd-table-wrap">
              <table className="sd-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Account</th><th>Status</th><th>Note</th></tr></thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td style={{ color:"#8B8FA8", fontSize:12 }}>{fmtDate(w.createdAt)}</td>
                      <td style={{ fontWeight:700 }}>GHS {Number(w.amount || 0).toFixed(2)}</td>
                      <td style={{ fontSize:12 }}>{w.method === "momo" ? `MoMo (${w.momoNetwork})` : `Bank (${w.bankName})`}</td>
                      <td style={{ fontSize:12, color:"#8B8FA8" }}>{w.method === "momo" ? w.momoNumber : w.bankAccount}</td>
                      <td><span className={`sd-badge ${STATUS_BADGE[w.status] || "sd-badge-gray"}`}>{w.status}</span></td>
                      <td style={{ fontSize:12, color:"#8B8FA8" }}>{w.adminNote || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"var(--card,#fff)", borderRadius:16, padding:28, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:17, fontWeight:700, color:"#1A1D3B" }}>Request Withdrawal</h3>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#8B8FA8", fontSize:20 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sd-form-group">
                <label className="sd-label">Amount (GHS)</label>
                <input className="sd-input" type="number" min={MIN_WITHDRAWAL} step="0.01" value={form.amount} onChange={upd("amount")} placeholder={`Minimum GHS ${MIN_WITHDRAWAL}`} required />
              </div>
              <div className="sd-form-group">
                <label className="sd-label">Payout Method</label>
                <div style={{ display:"flex", gap:10 }}>
                  {Object.entries(PAYOUT_METHODS).map(([key, m]) => (
                    <label key={key} style={{ flex:1, padding:"10px 14px", borderRadius:8, border:`2px solid ${form.method === key ? "#046EF2" : "rgba(0,0,0,0.1)"}`, cursor:"pointer", display:"flex", alignItems:"center", gap:8, background: form.method === key ? "rgba(4,110,242,0.05)" : "transparent" }}>
                      <input type="radio" name="method" value={key} checked={form.method === key} onChange={upd("method")} style={{ display:"none" }} />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={form.method === key ? "#046EF2" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round">
                        {key === "momo"
                          ? <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>
                          : <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>
                        }
                      </svg>
                      <span style={{ fontSize:13, fontWeight:600, color: form.method === key ? "#046EF2" : "#1A1D3B" }}>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.method === "momo" ? (
                <>
                  <div className="sd-form-group">
                    <label className="sd-label">MoMo Network</label>
                    <select className="sd-select sd-input" value={form.momoNetwork} onChange={upd("momoNetwork")}>
                      {PAYOUT_METHODS.momo.networks.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="sd-form-group">
                    <label className="sd-label">MoMo Number</label>
                    <input className="sd-input" value={form.momoNumber} onChange={upd("momoNumber")} placeholder="0XX XXX XXXX" required={form.method === "momo"} />
                  </div>
                </>
              ) : (
                <>
                  <div className="sd-form-group">
                    <label className="sd-label">Bank Name</label>
                    <select className="sd-select sd-input" value={form.bankName} onChange={upd("bankName")}>
                      <option value="">Select bank</option>
                      {PAYOUT_METHODS.bank.banks.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="sd-form-group">
                    <label className="sd-label">Account Number</label>
                    <input className="sd-input" value={form.bankAccount} onChange={upd("bankAccount")} placeholder="Account number" required={form.method === "bank"} />
                  </div>
                </>
              )}
              <div className="sd-form-group">
                <label className="sd-label">Account Name *</label>
                <input className="sd-input" value={form.accountName} onChange={upd("accountName")} placeholder="Name registered to the account" required />
              </div>
              {/* Payout terms */}
              <div style={{ padding:"12px 14px", background:"rgba(245,158,11,0.07)", borderRadius:8, marginBottom:14, fontSize:12, color:"#6B7280", lineHeight:1.6, border:"1px solid rgba(245,158,11,0.2)" }}>
                By submitting, I confirm that account details are accurate. Beme Market is not liable for payments to incorrect accounts. Withdrawals may be held if there are pending disputes or policy violations.
              </div>
              <label style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:18, cursor:"pointer" }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop:2 }} />
                <span style={{ fontSize:13 }}>I agree to the payout terms and confirm my account details are correct.</span>
              </label>
              {(formError || error) && <div style={{ color:"#DC2626", fontSize:13, marginBottom:14 }}>{formError || error}</div>}
              <div style={{ display:"flex", gap:10 }}>
                <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowForm(false)} style={{ flex:1 }}>Cancel</button>
                <button type="submit" className="sd-btn sd-btn-primary" disabled={submitting} style={{ flex:2 }}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#046EF2" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  );
}


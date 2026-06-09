// src/pages/dashboard/DashboardWithdrawals.jsx
import { useState } from "react";
import { useWithdrawals } from "../../hooks/useWithdrawals";
import { PAYOUT_METHODS, MIN_WITHDRAWAL } from "../../services/payoutService";
import TutorialOverlay from "../../components/ai/TutorialOverlay";
import { TUTORIAL_STEPS } from "../../components/ai/tutorialSteps";
import { useTutorial } from "../../hooks/useTutorial";

/* ── Helpers ── */
function fmtMoney(n) { return `GHS ${Number(n || 0).toFixed(2)}`; }
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

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
  wallet:  "M21 12V7H5a2 2 0 0 1 0-4h14v4|M3 5v14a2 2 0 0 0 2 2h16v-5|M18 12h.01",
  clock:   "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20|M12 6v6l4 2",
  check:   "M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4L12 14.01l-3-3",
  info:    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20|M12 16v-4|M12 8h.01",
  close:   "M18 6L6 18|M6 6l12 12",
  phone:   "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  bank:    "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10",
  plus:    "M12 5v14|M5 12h14",
  warn:    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01",
  copy:    "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
};

const STATUS_META = {
  pending:    { label: "Pending",    cls: "wd-badge--yellow" },
  processing: { label: "Processing", cls: "wd-badge--blue"   },
  approved:   { label: "Approved",   cls: "wd-badge--blue"   },
  completed:  { label: "Completed",  cls: "wd-badge--green"  },
  paid:       { label: "Paid",       cls: "wd-badge--green"  },
  rejected:   { label: "Rejected",   cls: "wd-badge--red"    },
};

/* ══════════════════════════════════════════
   REQUEST FORM MODAL
══════════════════════════════════════════ */
function RequestModal({ onClose, onSubmit, submitting, availableBalance, hasPendingRequest }) {
  const [form, setForm] = useState({
    amount: "", method: "momo",
    momoNumber: "", momoNetwork: "MTN",
    accountName: "", bankName: "", bankAccount: "",
  });
  const [agreed,    setAgreed]    = useState(false);
  const [formError, setFormError] = useState(null);
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const inp = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1.5px solid var(--sd-border)", background: "var(--sd-white)",
    color: "var(--sd-text)", fontSize: 13, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", marginTop: 4,
    transition: "border-color 0.15s",
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!agreed) { setFormError("Please agree to the payout terms."); return; }
    if (hasPendingRequest) { setFormError("You already have a pending request."); return; }
    const amt = Number(form.amount);
    if (!amt || amt < MIN_WITHDRAWAL) { setFormError(`Minimum withdrawal is GHS ${MIN_WITHDRAWAL}.`); return; }
    if (amt > availableBalance) { setFormError(`Amount exceeds your available balance of ${fmtMoney(availableBalance)}.`); return; }
    setFormError(null);
    try { await onSubmit(form); onClose(); }
    catch (err) { setFormError(err.message || "Failed to submit."); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--sd-white)", borderRadius:18, padding:28, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.22)" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:900, color:"var(--sd-text)" }}>Request Withdrawal</div>
            <div style={{ fontSize:12, color:"var(--sd-muted)", marginTop:2 }}>
              Available: <strong style={{ color:"var(--sd-text)" }}>{fmtMoney(availableBalance)}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--sd-muted)", padding:4, borderRadius:8, lineHeight:0 }}>
            <Ico d={IC.close} size={18} />
          </button>
        </div>

        {hasPendingRequest && (
          <div style={{ display:"flex", gap:10, padding:"12px 14px", background:"rgba(245,158,11,0.08)", borderRadius:10, border:"1px solid rgba(245,158,11,0.25)", marginBottom:18, fontSize:13, color:"#92400e" }}>
            <Ico d={IC.warn} size={16} color="#d97706" sw={1.8} />
            You already have a pending request. Wait for it to be processed before submitting a new one.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Amount */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>
              Amount (GHS)
            </label>
            <input style={inp} type="number" min={MIN_WITHDRAWAL} max={availableBalance} step="0.01"
              value={form.amount} onChange={upd("amount")}
              placeholder={`Min GHS ${MIN_WITHDRAWAL} · Max ${fmtMoney(availableBalance)}`}
              onFocus={e => e.target.style.borderColor = "var(--sd-accent)"}
              onBlur={e  => e.target.style.borderColor = "var(--sd-border)"}
              required disabled={hasPendingRequest} />
          </div>

          {/* Method toggle */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:8 }}>
              Payout Method
            </label>
            <div style={{ display:"flex", gap:10 }}>
              {[
                { key:"momo", label:"Mobile Money", icon:IC.phone },
                { key:"bank", label:"Bank Transfer", icon:IC.bank  },
              ].map(opt => (
                <label key={opt.key} style={{
                  flex:1, padding:"11px 14px", borderRadius:10, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:8,
                  border:`2px solid ${form.method === opt.key ? "var(--sd-accent)" : "var(--sd-border)"}`,
                  background: form.method === opt.key ? "var(--sd-accent-dim)" : "transparent",
                  transition:"all 0.15s",
                }}>
                  <input type="radio" name="method" value={opt.key}
                    checked={form.method === opt.key} onChange={upd("method")} style={{ display:"none" }} />
                  <Ico d={opt.icon} size={15} color={form.method === opt.key ? "var(--sd-accent)" : "var(--sd-muted)"} />
                  <span style={{ fontSize:13, fontWeight:700, color:form.method === opt.key ? "var(--sd-accent)" : "var(--sd-muted)" }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* MoMo fields */}
          {form.method === "momo" && (
            <>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Network</label>
                <select style={{ ...inp, appearance:"none" }} value={form.momoNetwork} onChange={upd("momoNetwork")}
                  onFocus={e => e.target.style.borderColor = "var(--sd-accent)"}
                  onBlur={e  => e.target.style.borderColor = "var(--sd-border)"}>
                  {PAYOUT_METHODS.momo.networks.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>MoMo Number</label>
                <input style={inp} type="tel" value={form.momoNumber} onChange={upd("momoNumber")}
                  placeholder="0XX XXX XXXX" required
                  onFocus={e => e.target.style.borderColor = "var(--sd-accent)"}
                  onBlur={e  => e.target.style.borderColor = "var(--sd-border)"} />
              </div>
            </>
          )}

          {/* Bank fields */}
          {form.method === "bank" && (
            <>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Bank Name</label>
                <select style={{ ...inp, appearance:"none" }} value={form.bankName} onChange={upd("bankName")}
                  onFocus={e => e.target.style.borderColor = "var(--sd-accent)"}
                  onBlur={e  => e.target.style.borderColor = "var(--sd-border)"}>
                  <option value="">Select bank</option>
                  {PAYOUT_METHODS.bank.banks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Account Number</label>
                <input style={inp} value={form.bankAccount} onChange={upd("bankAccount")}
                  placeholder="Account number" required
                  onFocus={e => e.target.style.borderColor = "var(--sd-accent)"}
                  onBlur={e  => e.target.style.borderColor = "var(--sd-border)"} />
              </div>
            </>
          )}

          {/* Account name */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Account Name</label>
            <input style={inp} value={form.accountName} onChange={upd("accountName")}
              placeholder="Name registered to the account" required
              onFocus={e => e.target.style.borderColor = "var(--sd-accent)"}
              onBlur={e  => e.target.style.borderColor = "var(--sd-border)"} />
          </div>

          {/* Terms */}
          <div style={{ padding:"12px 14px", background:"rgba(245,158,11,0.05)", borderRadius:10, marginBottom:14, fontSize:12, color:"var(--sd-muted)", lineHeight:1.6, border:"1px solid rgba(245,158,11,0.15)" }}>
            By submitting, I confirm my account details are accurate. Beme Market is not liable for payments to incorrect accounts.
          </div>
          <label style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:20, cursor:"pointer", fontSize:13, color:"var(--sd-text)" }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop:2, flexShrink:0 }} />
            I agree to the payout terms and confirm my account details are correct.
          </label>

          {formError && (
            <div style={{ display:"flex", gap:8, padding:"10px 14px", background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, marginBottom:14, fontSize:13, color:"#b91c1c" }}>
              <Ico d={IC.warn} size={14} color="#dc2626" sw={1.8} />{formError}
            </div>
          )}

          <div style={{ display:"flex", gap:10 }}>
            <button type="button" onClick={onClose}
              style={{ flex:1, height:44, borderRadius:10, border:"1.5px solid var(--sd-border)", background:"transparent", color:"var(--sd-text)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || hasPendingRequest}
              style={{ flex:2, height:44, borderRadius:10, border:"none", background:"var(--sd-accent)", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", opacity:submitting||hasPendingRequest?0.6:1, transition:"opacity 0.15s" }}>
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export function DashboardWithdrawals() {
  const { showTutorial, markSeen } = useTutorial("withdrawals");
  const {
    withdrawals, loading, submitting, error,
    pendingTotal, completedTotal,
    paystackRevenue, availableBalance, hasPendingRequest,
    requestWithdrawal,
  } = useWithdrawals();

  const [showForm, setShowForm] = useState(false);

  const stats = [
    {
      label: "Available Balance",
      value: fmtMoney(availableBalance),
      sub:   "Paystack revenue · ready to withdraw",
      color: "#22C55E",
      icon:  IC.wallet,
    },
    {
      label: "Paystack Revenue",
      value: fmtMoney(paystackRevenue),
      sub:   "Total online payments received",
      color: "var(--sd-accent)",
      icon:  IC.check,
    },
    {
      label: "Pending Payouts",
      value: fmtMoney(pendingTotal),
      sub:   "Awaiting admin review",
      color: "#F59E0B",
      icon:  IC.clock,
    },
    {
      label: "Total Withdrawn",
      value: fmtMoney(completedTotal),
      sub:   "All-time completed payouts",
      color: "var(--sd-muted)",
      icon:  IC.bank,
    },
  ];

  return (
    <div style={{ fontFamily:"var(--sd-font,'DM Sans',system-ui,sans-serif)", color:"var(--sd-text)", minHeight:"100%" }}>

      {/* ── Page header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Seller Dashboard</div>
          <div style={{ fontSize:22, fontWeight:900, color:"var(--sd-text)", letterSpacing:"-0.03em" }}>Withdrawals</div>
          <div style={{ fontSize:12, color:"var(--sd-muted)", marginTop:3 }}>Request payouts to your MoMo or bank account</div>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:"var(--sd-accent)", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px var(--sd-accent-glow,rgba(124,58,237,0.25))", transition:"opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          <Ico d={IC.plus} size={15} color="#fff" />
          Request Withdrawal
        </button>
      </div>

      {/* ── COD ineligibility banner ── */}
      <div style={{ display:"flex", gap:10, padding:"12px 16px", background:"rgba(245,158,11,0.06)", borderRadius:12, border:"1px solid rgba(245,158,11,0.2)", marginBottom:18 }}>
        <Ico d={IC.info} size={18} color="#d97706" sw={1.8} style={{ flexShrink:0, marginTop:1 }} />
        <div style={{ fontSize:13, color:"var(--sd-muted)", lineHeight:1.55 }}>
          <strong style={{ color:"var(--sd-text)" }}>Payout Eligibility:</strong> Only orders paid online via Paystack are eligible for withdrawal. Cash on Delivery (COD) orders are collected by you directly and are not included in your payout balance.
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:18 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:"var(--sd-white)", border:"1px solid var(--sd-border)", borderRadius:14, padding:"16px 18px", boxShadow:"var(--sd-shadow,0 2px 8px rgba(0,0,0,0.04))" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
              <div style={{ width:30, height:30, borderRadius:8, background:`${s.color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Ico d={s.icon} size={14} color={s.color} />
              </div>
            </div>
            {loading
              ? <div style={{ height:26, width:"60%", borderRadius:6, background:"var(--sd-border-light)" }} />
              : <div style={{ fontSize:20, fontWeight:900, color:s.color, letterSpacing:"-0.03em" }}>{s.value}</div>
            }
            <div style={{ fontSize:11, color:"var(--sd-muted)", marginTop:5 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Policy note ── */}
      <div style={{ display:"flex", gap:10, padding:"12px 16px", background:"var(--sd-accent-dim,rgba(124,58,237,0.05))", borderRadius:12, border:"1px solid rgba(124,58,237,0.12)", marginBottom:20 }}>
        <Ico d={IC.info} size={16} color="var(--sd-accent)" sw={1.8} />
        <div style={{ fontSize:12, color:"var(--sd-muted)", lineHeight:1.55 }}>
          <strong style={{ color:"var(--sd-text)" }}>Payout Policy:</strong> Minimum withdrawal GHS {MIN_WITHDRAWAL} · Zero fees · Processed within 1–3 business days · Ensure your account details are accurate before submitting.
        </div>
      </div>

      {/* ── Withdrawal history ── */}
      <div style={{ background:"var(--sd-white)", border:"1px solid var(--sd-border)", borderRadius:14, overflow:"hidden", boxShadow:"var(--sd-shadow,0 2px 8px rgba(0,0,0,0.04))" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--sd-border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:13, fontWeight:800, color:"var(--sd-text)" }}>Withdrawal History</div>
          <div style={{ fontSize:11, color:"var(--sd-muted)" }}>{withdrawals.length} request{withdrawals.length !== 1 ? "s" : ""}</div>
        </div>

        {loading ? (
          <div style={{ padding:18 }}>
            {[1,2,3].map(i => <div key={i} style={{ height:56, borderRadius:10, background:"var(--sd-border-light)", marginBottom:10, animation:"wd-shimmer 1.4s ease infinite", backgroundImage:"linear-gradient(90deg,var(--sd-border-light) 25%,var(--sd-border) 50%,var(--sd-border-light) 75%)", backgroundSize:"600px 100%" }} />)}
          </div>
        ) : withdrawals.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 24px", gap:10 }}>
            <Ico d={IC.wallet} size={38} color="var(--sd-border)" sw={1.3} />
            <div style={{ fontSize:14, fontWeight:700, color:"var(--sd-text)" }}>No withdrawals yet</div>
            <div style={{ fontSize:12, color:"var(--sd-muted)", textAlign:"center" }}>
              Your payout requests will appear here once submitted.
            </div>
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"var(--sd-border-light,rgba(0,0,0,0.03))" }}>
                  {["Date","Amount","Method","Account","Status","Note"].map(h => (
                    <th key={h} style={{ fontSize:10, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em", padding:"10px 16px", textAlign:"left", borderBottom:"1px solid var(--sd-border)", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w, i) => {
                  const meta    = STATUS_META[w.status] || { label: w.status, cls: "wd-badge--gray" };
                  const isMomo  = w.method === "momo";
                  const methodLabel = isMomo
                    ? `MoMo · ${w.momoNetwork || ""}`
                    : `Bank · ${w.bankName || ""}`;
                  const acctLabel = isMomo ? w.momoNumber : w.bankAccount;

                  return (
                    <tr key={w.id} style={{ borderBottom: i < withdrawals.length-1 ? "1px solid var(--sd-border-light)" : "none" }}>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"var(--sd-muted)", whiteSpace:"nowrap" }}>{fmtDate(w.createdAt)}</td>
                      <td style={{ padding:"12px 16px", fontSize:14, fontWeight:800, color:"var(--sd-text)", whiteSpace:"nowrap" }}>{fmtMoney(w.amount)}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"var(--sd-text2)", whiteSpace:"nowrap" }}>{methodLabel}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"var(--sd-muted)", whiteSpace:"nowrap" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span>{acctLabel || "—"}</span>
                          {acctLabel && (
                            <button title="Copy" onClick={() => navigator.clipboard.writeText(acctLabel)}
                              style={{ background:"none", border:"none", cursor:"pointer", padding:0, lineHeight:0, color:"var(--sd-muted)" }}>
                              <Ico d={IC.copy} size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}>
                        <span className={`wd-badge ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:"var(--sd-muted)", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {w.adminNote || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Form modal ── */}
      {showForm && (
        <RequestModal
          onClose={() => setShowForm(false)}
          onSubmit={requestWithdrawal}
          submitting={submitting}
          availableBalance={availableBalance}
          hasPendingRequest={hasPendingRequest}
        />
      )}

      {showTutorial && (
        <TutorialOverlay
          steps={TUTORIAL_STEPS.withdrawals}
          onFinish={markSeen}
          pageTitle="Withdrawals"
        />
      )}

      <style>{`
        @keyframes wd-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: calc(600px + 100%) 0; }
        }
        .wd-badge {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 100px;
          font-size: 11px; font-weight: 700;
          font-family: var(--sd-font, system-ui);
          white-space: nowrap; text-transform: capitalize;
        }
        .wd-badge--green  { background: rgba(34,197,94,0.1);  color: #15803d; }
        .wd-badge--blue   { background: rgba(59,130,246,0.1); color: #1d4ed8; }
        .wd-badge--yellow { background: rgba(245,158,11,0.1); color: #b45309; }
        .wd-badge--red    { background: rgba(239,68,68,0.1);  color: #b91c1c; }
        .wd-badge--gray   { background: var(--sd-border-light); color: var(--sd-muted); }
      `}</style>
    </div>
  );
}

export default DashboardWithdrawals;
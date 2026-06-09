// src/pages/admin/sections/Payouts.jsx
import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";

/* ── Helpers ── */
function fmtMoney(n) { return `GHS ${Number(n || 0).toFixed(2)}`; }
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function titleize(v) { return String(v || "").replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }

/* ── Copy to clipboard ── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text || "").then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy} title="Copy"
      style={{ background:"none", border:"1px solid var(--ap-border2)", borderRadius:6, cursor:"pointer", padding:"2px 8px", fontSize:11, fontWeight:700, color: copied ? "#22c55e" : "var(--ap-muted)", fontFamily:"inherit", transition:"color 0.15s" }}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

const STATUS_COLOR = { pending:"amber", approved:"blue", completed:"green", paid:"green", rejected:"red" };

export default function PayoutsSection() {
  const { user, isSuperAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("pending");
  const [updating, setUpdating] = useState("");
  const [noteMap,  setNoteMap]  = useState({});
  const [expanded, setExpanded] = useState("");

  /* ── Real-time from withdrawalRequests ── */
  useEffect(() => {
    const q = query(collection(db, "withdrawalRequests"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q,
      snap => { setRequests(snap.docs.map(d => ({ id:d.id, ...d.data() }))); setLoading(false); },
      e    => { console.error(e); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() =>
    filter === "all" ? requests : requests.filter(r => (r.status||"pending") === filter),
  [requests, filter]);

  const counts = useMemo(() => ({
    all:       requests.length,
    pending:   requests.filter(r => r.status === "pending").length,
    approved:  requests.filter(r => r.status === "approved").length,
    completed: requests.filter(r => r.status === "completed" || r.status === "paid").length,
    rejected:  requests.filter(r => r.status === "rejected").length,
  }), [requests]);

  const pendingAmount   = requests.filter(r => r.status === "pending").reduce((s,r) => s + Number(r.amount||0), 0);
  const completedAmount = requests.filter(r => ["completed","paid"].includes(r.status)).reduce((s,r) => s + Number(r.amount||0), 0);

  const updateStatus = async (id, status) => {
    if (!isSuperAdmin) return;
    setUpdating(id);
    try {
      await updateDoc(doc(db, "withdrawalRequests", id), {
        status,
        adminNote:  noteMap[id] || null,
        reviewedBy: user?.uid,
        reviewedAt: serverTimestamp(),
        updatedAt:  serverTimestamp(),
      });
      setNoteMap(prev => { const n = {...prev}; delete n[id]; return n; });
      setExpanded("");
    } catch(e) { console.error(e); }
    finally { setUpdating(""); }
  };

  /* ── Account details string for copying ── */
  const getAccountDetails = r => {
    if (r.method === "momo") {
      return `MoMo | ${r.momoNetwork || ""} | ${r.momoNumber || ""} | ${r.accountName || ""}`;
    }
    return `Bank | ${r.bankName || ""} | ${r.bankAccount || ""} | ${r.accountName || ""}`;
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="ap-page-header-row" style={{ marginBottom:18 }}>
        <div>
          <div className="ap-page-title">Payout Requests</div>
          <div className="ap-page-sub">Review and process seller withdrawal requests</div>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="ap-stats-grid" style={{ gridTemplateColumns:"repeat(4,1fr)", marginBottom:16 }}>
        {[
          ["Total",     counts.all,       ""],
          ["Pending",   counts.pending,   fmtMoney(pendingAmount)],
          ["Completed", counts.completed, fmtMoney(completedAmount)],
          ["Rejected",  counts.rejected,  ""],
        ].map(([l,v,sub]) => (
          <div key={l} className="ap-stat" style={{ padding:"14px 16px" }}>
            <div className="ap-stat-label">{l}</div>
            <div className="ap-stat-value" style={{ fontSize:22 }}>{v}</div>
            {sub && <div style={{ fontSize:11, color:"var(--ap-muted)", marginTop:3 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div className="ap-filter-tabs" style={{ marginBottom:16 }}>
        {["pending","all","approved","completed","rejected"].map(f => (
          <button key={f}
            className={`ap-filter-tab${filter===f?" ap-filter-tab--active":""}`}
            onClick={() => setFilter(f)}>
            {titleize(f === "completed" ? "paid/completed" : f)}
            {f !== "all" && counts[f] > 0 && (
              <span style={{ marginLeft:5, background:filter===f?"rgba(255,255,255,0.25)":"var(--ap-border2)", borderRadius:20, padding:"1px 6px", fontSize:10, fontWeight:700 }}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Flow guide ── */}
      <div style={{ display:"flex", gap:8, padding:"10px 14px", background:"rgba(124,58,237,0.05)", borderRadius:10, border:"1px solid rgba(124,58,237,0.12)", marginBottom:16, fontSize:12, color:"var(--ap-muted)", alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontWeight:700, color:"var(--ap-text)" }}>Flow:</span>
        {["1. Review request","2. Copy account details","3. Send money manually via MoMo app or bank","4. Mark as Completed"].map((s,i) => (
          <span key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            {i>0 && <span style={{ color:"var(--ap-border)" }}>→</span>}
            {s}
          </span>
        ))}
      </div>

      {/* ── Request cards ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {loading
          ? [1,2,3].map(i => <div key={i} className="ap-skeleton" style={{ height:90, borderRadius:12 }}/>)
          : filtered.length === 0
            ? <div className="ap-empty"><div className="ap-empty-title">No {filter === "all" ? "" : filter} requests</div></div>
            : filtered.map(r => {
                const status    = r.status || "pending";
                const isMomo    = r.method === "momo";
                const isOpen    = expanded === r.id;
                const isWorking = updating === r.id;

                return (
                  <div key={r.id} className="ap-card ap-card--p"
                    style={{ border:`1px solid var(--ap-border2)`, borderRadius:12, overflow:"hidden" }}>

                    {/* ── Card top row ── */}
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        {/* ID + status */}
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"var(--ap-text)" }}>#{r.id?.slice(0,10)}</span>
                          <span className={`ap-badge ap-badge--${STATUS_COLOR[status]||"gray"}`}>{status}</span>
                          <span style={{ fontSize:11, color:"var(--ap-muted)" }}>{fmtDate(r.createdAt)}</span>
                        </div>

                        {/* Amount */}
                        <div style={{ fontSize:22, fontWeight:900, color:"var(--ap-text)", letterSpacing:"-0.02em", marginBottom:6 }}>
                          {fmtMoney(r.amount)}
                        </div>

                        {/* Account details inline */}
                        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                          <div style={{ padding:"6px 12px", background:"var(--ap-bg2,rgba(0,0,0,0.04))", borderRadius:8, fontSize:12, fontWeight:600, color:"var(--ap-text)", fontFamily:"monospace" }}>
                            {isMomo
                              ? `${r.momoNetwork} · ${r.momoNumber} · ${r.accountName}`
                              : `${r.bankName} · ${r.bankAccount} · ${r.accountName}`
                            }
                          </div>
                          <CopyBtn text={getAccountDetails(r)} />
                        </div>

                        {/* Seller + shop info */}
                        {(r.shopId || r.sellerId) && (
                          <div style={{ fontSize:11, color:"var(--ap-muted)", marginTop:6 }}>
                            Seller: {r.sellerId?.slice(0,12)}… · Shop: {r.shopId?.slice(0,12)}…
                          </div>
                        )}

                        {/* Admin note if already set */}
                        {r.adminNote && (
                          <div style={{ fontSize:12, color:"var(--ap-muted)", marginTop:4, fontStyle:"italic" }}>
                            Note: {r.adminNote}
                          </div>
                        )}
                      </div>

                      {/* ── Action buttons ── */}
                      {isSuperAdmin && (
                        <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0, alignItems:"flex-end" }}>
                          {status === "pending" && (
                            <div style={{ display:"flex", gap:8 }}>
                              <button
                                className="ap-btn ap-btn--sm ap-btn--secondary"
                                onClick={() => setExpanded(isOpen ? "" : r.id)}
                                disabled={isWorking}>
                                {isOpen ? "Cancel" : "Add Note"}
                              </button>
                              <button
                                className="ap-btn ap-btn--sm ap-btn--success"
                                onClick={() => updateStatus(r.id, "completed")}
                                disabled={isWorking}>
                                {isWorking ? "…" : "Mark Paid"}
                              </button>
                              <button
                                className="ap-btn ap-btn--sm ap-btn--danger"
                                onClick={() => setExpanded(isOpen ? "" : r.id)}
                                disabled={isWorking}>
                                Reject
                              </button>
                            </div>
                          )}
                          {status === "approved" && (
                            <div style={{ display:"flex", gap:8 }}>
                              <button
                                className="ap-btn ap-btn--sm ap-btn--success"
                                onClick={() => updateStatus(r.id, "completed")}
                                disabled={isWorking}>
                                {isWorking ? "…" : "Mark Paid"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Expandable note + reject confirm ── */}
                    {isOpen && isSuperAdmin && (
                      <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid var(--ap-border2)" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"var(--ap-muted)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                          Admin Note (optional)
                        </div>
                        <textarea
                          value={noteMap[r.id] || ""}
                          onChange={e => setNoteMap(prev => ({...prev, [r.id]: e.target.value}))}
                          placeholder="Reason for rejection or additional info…"
                          rows={2}
                          style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1px solid var(--ap-border)", background:"var(--ap-card)", color:"var(--ap-text)", fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box" }}
                        />
                        <div style={{ display:"flex", gap:8, marginTop:10 }}>
                          <button
                            className="ap-btn ap-btn--sm ap-btn--success"
                            onClick={() => updateStatus(r.id, "completed")}
                            disabled={isWorking}>
                            {isWorking ? "…" : "Mark as Paid"}
                          </button>
                          <button
                            className="ap-btn ap-btn--sm ap-btn--danger"
                            onClick={() => updateStatus(r.id, "rejected")}
                            disabled={isWorking || !noteMap[r.id]?.trim()}>
                            {isWorking ? "…" : "Reject"}
                          </button>
                          <span style={{ fontSize:11, color:"var(--ap-muted)", alignSelf:"center" }}>
                            {!noteMap[r.id]?.trim() && "Add a reason to reject"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
        }
      </div>
    </div>
  );
}
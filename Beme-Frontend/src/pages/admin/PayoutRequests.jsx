// ============================================================
// src/pages/admin/PayoutRequests.jsx
// Admin payout management — separate from existing AdminDashboard
// ============================================================
import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { approveWithdrawal, rejectWithdrawal } from "../../services/payoutService";
import "./AdminSeller.css";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGE = { pending: "as-badge-yellow", processing: "as-badge-blue", approved: "as-badge-blue", completed: "as-badge-green", rejected: "as-badge-red" };

export default function PayoutRequests() {
  const { user } = useAuth();
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("pending");
  const [processing, setProcessing] = useState(null);
  const [noteModal, setNoteModal]  = useState(null);
  const [note, setNote]            = useState("");

  const load = () => {
    setLoading(true);
    getDocs(query(collection(db, "withdrawalRequests"), orderBy("createdAt", "desc")))
      .then((snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const handleApprove = async (req) => {
    setProcessing(req.id);
    try {
      await approveWithdrawal(req.id, user.uid, note);
      load();
      setNoteModal(null);
      setNote("");
    } catch (err) { alert(err.message); }
    finally { setProcessing(null); }
  };

  const handleReject = async (req, reason) => {
    if (!reason?.trim()) { alert("Please provide a rejection reason."); return; }
    setProcessing(req.id);
    try {
      await rejectWithdrawal(req.id, user.uid, reason);
      load();
      setNoteModal(null);
      setNote("");
    } catch (err) { alert(err.message); }
    finally { setProcessing(null); }
  };

  const totals = { pending: requests.filter((r) => r.status === "pending").length, total: requests.reduce((s, r) => s + (r.amount || 0), 0) };

  return (
    <div className="as-root">
      <div className="as-topbar">
        <div>
          <div className="as-title">Payout Requests</div>
          <div className="as-sub">{totals.pending} pending • GHS {totals.total.toFixed(2)} all-time</div>
        </div>
        <button className="as-refresh-btn" onClick={load}>↺ Refresh</button>
      </div>

      {/* Tabs */}
      <div className="as-tabs">
        {["all","pending","approved","completed","rejected"].map((t) => (
          <button key={t} className={`as-tab ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} {t !== "all" && `(${requests.filter((r) => r.status === t).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="as-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="as-skeleton" style={{ height: 52, marginBottom: 10 }} />)
          : filtered.length === 0
            ? <div className="as-empty">No {filter === "all" ? "" : filter} payout requests</div>
            : (
              <div className="as-table-wrap">
                <table className="as-table">
                  <thead>
                    <tr><th>Date</th><th>Seller</th><th>Amount</th><th>Method</th><th>Account</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td className="as-muted">{fmtDate(r.createdAt)}</td>
                        <td><div style={{ fontWeight: 600 }}>{r.accountName || "—"}</div><div className="as-muted-sm">{r.shopId}</div></td>
                        <td><strong>GHS {Number(r.amount || 0).toFixed(2)}</strong></td>
                        <td className="as-muted">{r.method === "momo" ? `MoMo · ${r.momoNetwork}` : `Bank · ${r.bankName}`}</td>
                        <td className="as-muted">{r.method === "momo" ? r.momoNumber : r.bankAccount}</td>
                        <td><span className={`as-badge ${STATUS_BADGE[r.status] || "as-badge-gray"}`}>{r.status}</span></td>
                        <td>
                          {r.status === "pending" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="as-btn as-btn-green" onClick={() => { setNoteModal({ req: r, action: "approve" }); setNote(""); }} disabled={processing === r.id}>Approve</button>
                              <button className="as-btn as-btn-red" onClick={() => { setNoteModal({ req: r, action: "reject" }); setNote(""); }} disabled={processing === r.id}>Reject</button>
                            </div>
                          )}
                          {r.adminNote && <div className="as-muted-sm" style={{ marginTop: 4 }}>Note: {r.adminNote}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Note modal */}
      {noteModal && (
        <div className="as-modal-backdrop">
          <div className="as-modal">
            <h3>{noteModal.action === "approve" ? "Approve" : "Reject"} Payout Request</h3>
            <div style={{ marginBottom: 14, fontSize: 14, color: "#374151" }}>
              <strong>GHS {Number(noteModal.req.amount || 0).toFixed(2)}</strong> → {noteModal.req.accountName}
              <br />{noteModal.req.method === "momo" ? `${noteModal.req.momoNetwork} · ${noteModal.req.momoNumber}` : `${noteModal.req.bankName} · ${noteModal.req.bankAccount}`}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>
                {noteModal.action === "approve" ? "Admin Note (optional)" : "Rejection Reason *"}
              </label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="as-textarea" rows={3} placeholder={noteModal.action === "approve" ? "e.g. Payment sent via MoMo" : "e.g. Bank account details incorrect"} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="as-btn" onClick={() => setNoteModal(null)} style={{ flex: 1 }}>Cancel</button>
              <button className={`as-btn ${noteModal.action === "approve" ? "as-btn-green" : "as-btn-red"}`} style={{ flex: 2 }}
                onClick={() => noteModal.action === "approve" ? handleApprove(noteModal.req) : handleReject(noteModal.req, note)}>
                {processing ? "Processing…" : noteModal.action === "approve" ? "✓ Approve & Mark Sent" : "✗ Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================
// src/pages/admin/VerificationRequests.jsx
// ============================================================
import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import "./AdminSeller.css";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

export function VerificationRequests() {
  const { user } = useAuth();
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("pending");
  const [modal, setModal]           = useState(null);
  const [note, setNote]             = useState("");
  const [processing, setProcessing] = useState(false);

  const load = () => {
    setLoading(true);
    getDocs(query(collection(db, "verificationRequests"), orderBy("createdAt", "desc")))
      .then((snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const handleReview = async (action) => {
    if (!modal) return;
    if (action === "reject" && !note.trim()) { alert("Rejection reason is required."); return; }
    setProcessing(true);
    try {
      await updateDoc(doc(db, "verificationRequests", modal.id), {
        status: action === "approve" ? "approved" : "rejected",
        adminNote: note.trim() || null,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
      });
      // Also update shop document if approving
      if (action === "approve" && modal.shopId) {
        await updateDoc(doc(db, "shops", modal.shopId), { verified: true, verifiedBadge: "verified" });
        await updateDoc(doc(db, "users", modal.sellerId), { sellerVerified: true });
      }
      load();
      setModal(null);
      setNote("");
    } catch (err) { alert(err.message); }
    finally { setProcessing(false); }
  };

  return (
    <div className="as-root">
      <div className="as-topbar">
        <div>
          <div className="as-title">Verification Requests</div>
          <div className="as-sub">{requests.filter((r) => r.status === "pending").length} pending reviews</div>
        </div>
        <button className="as-refresh-btn" onClick={load}>↺ Refresh</button>
      </div>

      <div className="as-tabs">
        {["all","pending","approved","rejected"].map((t) => (
          <button key={t} className={`as-tab ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === "all" ? requests.length : requests.filter((r) => r.status === t).length})
          </button>
        ))}
      </div>

      <div className="as-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="as-skeleton" style={{ height: 52, marginBottom: 10 }} />)
          : filtered.length === 0
            ? <div className="as-empty">No {filter === "all" ? "" : filter} verification requests</div>
            : (
              <div className="as-table-wrap">
                <table className="as-table">
                  <thead><tr><th>Date</th><th>Store</th><th>Business Type</th><th>Documents</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td className="as-muted">{fmtDate(r.createdAt)}</td>
                        <td><div style={{ fontWeight: 600 }}>{r.shopName || "—"}</div><div className="as-muted-sm">{r.shopId}</div></td>
                        <td className="as-muted">{r.businessType || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            {(r.documents || []).map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 6, background: "rgba(4,110,242,0.1)", color: "#046EF2", fontSize: 11, fontWeight: 700 }}>
                                Doc {i + 1} ↗
                              </a>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`as-badge ${r.status === "approved" ? "as-badge-green" : r.status === "rejected" ? "as-badge-red" : "as-badge-yellow"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {r.status === "pending" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="as-btn as-btn-green" onClick={() => { setModal(r); setNote(""); }}>Review</button>
                            </div>
                          )}
                          {r.adminNote && <div className="as-muted-sm">Note: {r.adminNote}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {modal && (
        <div className="as-modal-backdrop">
          <div className="as-modal" style={{ maxWidth: 500 }}>
            <h3>Review Verification — {modal.shopName}</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#8B8FA8", marginBottom: 8 }}>Documents submitted:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(modal.documents || []).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, background: "#F8F9FF", color: "#046EF2", fontSize: 13, fontWeight: 600, border: "1px solid rgba(4,110,242,0.2)" }}>
                    📄 Document {i + 1} ↗
                  </a>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Admin Note</label>
              <textarea className="as-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for approval or rejection…" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="as-btn" onClick={() => { setModal(null); setNote(""); }} style={{ flex: 1 }}>Cancel</button>
              <button className="as-btn as-btn-red" onClick={() => handleReview("reject")} disabled={processing} style={{ flex: 1 }}>✗ Reject</button>
              <button className="as-btn as-btn-green" onClick={() => handleReview("approve")} disabled={processing} style={{ flex: 1 }}>✓ Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerificationRequests;


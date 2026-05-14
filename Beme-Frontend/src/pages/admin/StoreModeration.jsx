import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import "./AdminSeller.css";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" });
}

export default function StoreModeration() {
  const { user }  = useAuth();
  const [shops, setShops]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState(null);
  const [reason, setReason]   = useState("");
  const [processing, setProcessing] = useState(false);

  const load = () => {
    setLoading(true);
    getDocs(query(collection(db, "shops"), orderBy("createdAt", "desc")))
      .then((snap) => setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = shops
    .filter((s) => filter === "all" || s.status === filter)
    .filter((s) => !search || s.shopName?.toLowerCase().includes(search.toLowerCase()) || s.ownerId?.includes(search));

  const handleAction = async (action) => {
    if (!modal) return;
    const needReason = ["suspend", "freeze"].includes(action);
    if (needReason && !reason.trim()) { alert("Please provide a reason."); return; }

    setProcessing(true);
    try {
      const updates = { updatedAt: serverTimestamp() };
      if (action === "suspend")   { updates.status = "suspended"; updates.suspensionReason = reason; updates.suspendedBy = user.uid; updates.suspendedAt = serverTimestamp(); }
      if (action === "activate")  { updates.status = "active"; updates.suspensionReason = null; }
      if (action === "freeze")    { updates.withdrawalsFrozen = true; updates.freezeReason = reason; updates.frozenBy = user.uid; }
      if (action === "unfreeze")  { updates.withdrawalsFrozen = false; updates.freezeReason = null; }
      if (action === "verify")    { updates.verified = true; updates.verifiedBadge = "verified"; }
      if (action === "unverify")  { updates.verified = false; updates.verifiedBadge = "none"; }

      await updateDoc(doc(db, "shops", modal.id), updates);

      // Also update user sellerStatus if suspending
      if (action === "suspend" && modal.ownerId) {
        await updateDoc(doc(db, "users", modal.ownerId), { sellerStatus: "suspended" });
      }
      if (action === "activate" && modal.ownerId) {
        await updateDoc(doc(db, "users", modal.ownerId), { sellerStatus: "active" });
      }

      // Log admin action
      const { addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid, action, target: "shop", targetId: modal.id,
        reason: reason || null, timestamp: serverTimestamp(),
      });

      load();
      setModal(null);
      setReason("");
    } catch (err) { alert(err.message); }
    finally { setProcessing(false); }
  };

  const stats = {
    total: shops.length,
    active: shops.filter((s) => s.status === "active").length,
    suspended: shops.filter((s) => s.status === "suspended").length,
    pending: shops.filter((s) => s.status === "pending").length,
  };

  return (
    <div className="as-root">
      <div className="as-topbar">
        <div>
          <div className="as-title">Store Moderation</div>
          <div className="as-sub">Manage all seller stores on the platform</div>
        </div>
        <button className="as-refresh-btn" onClick={load}>↺ Refresh</button>
      </div>

      {/* Stats */}
      <div className="as-stats-row">
        {[
          { l: "Total Stores",     v: stats.total,     c: "#046EF2" },
          { l: "Active",           v: stats.active,    c: "#22C55E" },
          { l: "Suspended",        v: stats.suspended, c: "#EF4444" },
          { l: "Pending Review",   v: stats.pending,   c: "#F59E0B" },
        ].map((s) => (
          <div key={s.l} className="as-stat-card">
            <div className="as-stat-label">{s.l}</div>
            <div className="as-stat-val" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="as-tabs">
        {["all","active","suspended","pending"].map((t) => (
          <button key={t} className={`as-tab ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === "all" ? shops.length : shops.filter((s) => s.status === t).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="as-search-row">
        <input className="as-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by store name or seller ID…" />
      </div>

      <div className="as-panel">
        {loading
          ? [1,2,3,4].map((i) => <div key={i} className="as-skeleton" style={{ height: 52, marginBottom: 10 }} />)
          : filtered.length === 0
            ? <div className="as-empty">No stores found</div>
            : (
              <div className="as-table-wrap">
                <table className="as-table">
                  <thead>
                    <tr><th>Store</th><th>Owner</th><th>Plan</th><th>Status</th><th>Verified</th><th>Created</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#F0F2FF", overflow: "hidden", flexShrink: 0 }}>
                              {s.logoUrl ? <img src={s.logoUrl} alt={s.shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏪</div>}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{s.shopName || "Unnamed Store"}</div>
                              <div className="as-muted-sm">{s.city || ""}{s.region ? `, ${s.region}` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="as-muted">{s.ownerId?.slice(0, 8) || "—"}…</td>
                        <td>
                          <span className={`as-badge ${s.planId === "pro" ? "as-badge-purple" : s.planId === "standard" ? "as-badge-blue" : "as-badge-gray"}`}>
                            {s.planId || "basic"}
                          </span>
                        </td>
                        <td>
                          <span className={`as-badge ${s.status === "active" ? "as-badge-green" : s.status === "suspended" ? "as-badge-red" : "as-badge-yellow"}`}>
                            {s.status || "active"}
                          </span>
                          {s.withdrawalsFrozen && <span className="as-badge as-badge-red" style={{ marginLeft: 4 }}>Frozen</span>}
                        </td>
                        <td>
                          <span className={`as-badge ${s.verified ? "as-badge-green" : "as-badge-gray"}`}>
                            {s.verified ? `✓ ${s.verifiedBadge || "verified"}` : "Unverified"}
                          </span>
                        </td>
                        <td className="as-muted">{fmtDate(s.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <button className="as-btn as-btn-blue" style={{ fontSize: 11 }} onClick={() => { setModal(s); setReason(""); }}>Manage</button>
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

      {/* Management modal */}
      {modal && (
        <div className="as-modal-backdrop">
          <div className="as-modal" style={{ maxWidth: 480 }}>
            <h3>Manage: {modal.shopName}</h3>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
              Status: <strong style={{ color: modal.status === "active" ? "#22C55E" : "#EF4444" }}>{modal.status}</strong>
              {" | "}Plan: <strong style={{ color: "#046EF2" }}>{modal.planId || "basic"}</strong>
              {" | "}Verified: <strong>{modal.verified ? "Yes" : "No"}</strong>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Action Reason</label>
              <textarea className="as-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for this action (required for suspend/freeze)…" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {modal.status !== "suspended"
                ? <button className="as-btn as-btn-red" onClick={() => handleAction("suspend")} disabled={processing || !reason.trim()}>🚫 Suspend Store</button>
                : <button className="as-btn as-btn-green" onClick={() => handleAction("activate")} disabled={processing}>✓ Reactivate</button>
              }
              {!modal.withdrawalsFrozen
                ? <button className="as-btn as-btn-red" onClick={() => handleAction("freeze")} disabled={processing || !reason.trim()}>❄️ Freeze Payouts</button>
                : <button className="as-btn as-btn-green" onClick={() => handleAction("unfreeze")} disabled={processing}>🔓 Unfreeze Payouts</button>
              }
              {!modal.verified
                ? <button className="as-btn as-btn-green" onClick={() => handleAction("verify")} disabled={processing}>✅ Grant Verification</button>
                : <button className="as-btn as-btn-red" onClick={() => handleAction("unverify")} disabled={processing}>❌ Remove Badge</button>
              }
            </div>
            <button className="as-btn" onClick={() => { setModal(null); setReason(""); }} style={{ width: "100%" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}


// src/components/admin/StoreApprovalCard.jsx
// Card used by admin to review and moderate stores

export default function StoreApprovalCard({ shop, onAction, loading }) {
  const { shopName, category, city, region, planId, status, verified, verifiedBadge, createdAt, logoUrl, ownerId, totalProducts = 0, totalOrders = 0 } = shop;

  const PLAN_COLORS = { basic: "#6B7280", standard: "#046EF2", pro: "#7C3AED" };
  const STATUS_COLORS = { active: "#22C55E", suspended: "#EF4444", pending: "#F59E0B" };

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
    return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#F0F2FF", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {logoUrl ? <img src={logoUrl} alt={shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🏪"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1D3B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shopName || "Unnamed Store"}</div>
          <div style={{ fontSize: 11, color: "#8B8FA8" }}>{city}{region ? `, ${region}` : ""} · {category}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <span style={{ padding: "2px 10px", borderRadius: 100, fontSize: 10, fontWeight: 700, background: `${STATUS_COLORS[status] || "#6B7280"}15`, color: STATUS_COLORS[status] || "#6B7280" }}>
            {status}
          </span>
          <span style={{ padding: "2px 10px", borderRadius: 100, fontSize: 10, fontWeight: 700, background: `${PLAN_COLORS[planId] || "#6B7280"}15`, color: PLAN_COLORS[planId] || "#6B7280" }}>
            {planId}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        {[
          { l: "Products",  v: totalProducts },
          { l: "Orders",    v: totalOrders   },
          { l: "Verified",  v: verified ? (verifiedBadge || "✓") : "No" },
        ].map((s, i) => (
          <div key={s.l} style={{ padding: "12px 14px", borderRight: i < 2 ? "1px solid rgba(0,0,0,0.06)" : "none", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1D3B", fontFamily: "'Space Grotesk', sans-serif" }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "#8B8FA8", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, color: "#8B8FA8" }}>Joined {fmtDate(createdAt)}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {status === "active"
            ? <button onClick={() => onAction?.("suspend", shop)} disabled={loading} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.1)", color: "#DC2626", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}>Suspend</button>
            : <button onClick={() => onAction?.("activate", shop)} disabled={loading} style={{ padding: "6px 12px", background: "rgba(34,197,94,0.1)", color: "#16A34A", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}>Activate</button>
          }
          {!verified && <button onClick={() => onAction?.("verify", shop)} disabled={loading} style={{ padding: "6px 12px", background: "rgba(4,110,242,0.1)", color: "#046EF2", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}>Verify</button>}
        </div>
      </div>
    </div>
  );
}


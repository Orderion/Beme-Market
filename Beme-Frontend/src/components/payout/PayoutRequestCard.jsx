// src/components/payout/PayoutRequestCard.jsx
// Card used by admin to review payout requests
export default function PayoutRequestCard({ request, onApprove, onReject, loading }) {
  const { accountName, amount, method, momoNumber, momoNetwork, bankName, bankAccount, status, createdAt, adminNote } = request;

  const STATUS_COLORS = { pending: "#F59E0B", approved: "#22C55E", rejected: "#EF4444", completed: "#22C55E", processing: "#046EF2" };
  const color = STATUS_COLORS[status] || "#6B7280";

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
    return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "18px 20px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1D3B", marginBottom: 2 }}>{accountName}</div>
          <div style={{ fontSize: 11, color: "#8B8FA8" }}>{fmtDate(createdAt)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, color: "#1A1D3B", letterSpacing: "-0.03em" }}>GHS {Number(amount || 0).toFixed(2)}</div>
          <div style={{ display: "inline-flex", padding: "2px 10px", borderRadius: 100, background: `${color}18`, color, fontSize: 11, fontWeight: 700, marginTop: 4 }}>{status}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
        {method === "momo"
          ? `📱 ${momoNetwork} MoMo · ${momoNumber}`
          : `🏦 ${bankName} · ${bankAccount}`
        }
      </div>

      {adminNote && (
        <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.04)", borderRadius: 6, fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
          Admin Note: {adminNote}
        </div>
      )}

      {status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onReject?.(request)}
            disabled={loading}
            style={{ flex: 1, padding: "8px 0", background: "rgba(239,68,68,0.08)", color: "#DC2626", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}
          >
            Reject
          </button>
          <button
            onClick={() => onApprove?.(request)}
            disabled={loading}
            style={{ flex: 2, padding: "8px 0", background: "#046EF2", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}
          >
            {loading ? "Processing…" : "Approve & Send"}
          </button>
        </div>
      )}
    </div>
  );
}


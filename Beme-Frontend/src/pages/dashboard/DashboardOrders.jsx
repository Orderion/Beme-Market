// ============================================================
// DashboardOrders.jsx
// ============================================================
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getSellerOrders } from "../../services/storeService";

const STATUS_TABS = ["all", "pending", "processing", "delivered", "cancelled"];
const BADGE = { delivered: "sd-badge-green", processing: "sd-badge-blue", pending: "sd-badge-yellow", cancelled: "sd-badge-red" };

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

export function DashboardOrders() {
  const { storeId, shop }  = useSellerAuth();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("all");

  useEffect(() => {
    if (!storeId) return;
    getSellerOrders(storeId).then((data) => { setOrders(data); setLoading(false); }).catch(() => setLoading(false));
  }, [storeId]);

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status === tab || o.fulfillmentStatus === tab);

  return (
    <div>
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Orders</div>
          <div className="sd-page-sub">{orders.length} total orders</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sd-tabs">
        {STATUS_TABS.map((t) => (
          <button key={t} className={`sd-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="sd-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 52, marginBottom: 10, borderRadius: 8 }} />)
          : filtered.length === 0
            ? <div className="sd-empty"><div className="sd-empty-icon">🛍️</div><div className="sd-empty-title">No {tab === "all" ? "" : tab} orders yet</div><div className="sd-empty-text">Orders from customers will appear here.</div></div>
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {filtered.map((o) => {
                      const total = o.pricing?.total || 0;
                      const cust  = o.customer;
                      const items = Array.isArray(o.items) ? o.items.length : 0;
                      return (
                        <tr key={o.id}>
                          <td style={{ fontSize: 12, color: "#8B8FA8", fontFamily: "monospace" }}>#{o.id?.slice(0,8).toUpperCase()}</td>
                          <td style={{ fontWeight: 600 }}>{cust?.firstName || ""} {cust?.lastName || ""}</td>
                          <td style={{ color: "#8B8FA8" }}>{items} item{items !== 1 ? "s" : ""}</td>
                          <td style={{ fontWeight: 700 }}>GHS {Number(total).toFixed(2)}</td>
                          <td style={{ color: "#8B8FA8", fontSize: 12 }}>{fmtDate(o.createdAt)}</td>
                          <td><span className={`sd-badge ${BADGE[o.status] || "sd-badge-gray"}`}>{o.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}

export default DashboardOrders;


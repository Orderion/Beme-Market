// ============================================================
// DashboardOrders.jsx — SVG empty state instead of emoji
// ============================================================
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getSellerOrders } from "../../services/storeService";
import TutorialOverlay from "../../components/ai/TutorialOverlay";
import { TUTORIAL_STEPS } from "../../components/ai/tutorialSteps";
import { useTutorial } from "../../hooks/useTutorial";

const STATUS_TABS = ["all","pending","processing","delivered","cancelled"];
const BADGE = { delivered:"sd-badge-green", processing:"sd-badge-blue", pending:"sd-badge-yellow", cancelled:"sd-badge-red" };

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

function EmptyOrders() {
  return (
    <div className="sd-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.4" strokeLinecap="round" style={{ marginBottom: 12 }}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
      <div className="sd-empty-title">No orders yet</div>
      <div className="sd-empty-text">Orders from customers will appear here.</div>
    </div>
  );
}

export default function DashboardOrders() {
  const { showTutorial, markSeen } = useTutorial("orders");
  const { storeId, shop } = useSellerAuth();
  // Use shop.id (the actual Firestore doc ID) as primary key
  // storeId may be user.uid which differs from the shop doc ID
  const queryId = shop?.id || storeId;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (!queryId) return;
    getSellerOrders(queryId).then((d) => { setOrders(d); setLoading(false); }).catch(() => setLoading(false));
  }, [queryId]);

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status === tab || o.fulfillmentStatus === tab);

  return (
    <div>
      <div className="sd-page-head">
        <div><div className="sd-page-title">Orders</div><div className="sd-page-sub">{orders.length} total orders</div></div>
      </div>
      <div className="sd-tabs">
        {STATUS_TABS.map((t) => (
          <button key={t} className={`sd-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="sd-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : filtered.length === 0 ? <EmptyOrders />
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
                        <td style={{ fontSize:12, color:"#8B8FA8", fontFamily:"monospace" }}>#{o.id?.slice(0,8).toUpperCase()}</td>
                        <td style={{ fontWeight:600 }}>{cust?.firstName || ""} {cust?.lastName || ""}</td>
                        <td style={{ color:"#8B8FA8" }}>{items} item{items !== 1 ? "s" : ""}</td>
                        <td style={{ fontWeight:700 }}>GHS {Number(total).toFixed(2)}</td>
                        <td style={{ color:"#8B8FA8", fontSize:12 }}>{fmtDate(o.createdAt)}</td>
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
    {showTutorial && (
      <TutorialOverlay
        steps={TUTORIAL_STEPS.orders}
        onFinish={markSeen}
        pageTitle="Orders"
      />
    )}
    </div>
  );
}
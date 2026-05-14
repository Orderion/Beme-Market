import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getSellerOrders } from "../../services/storeService";

export default function DashboardCustomers() {
  const { storeId }           = useSellerAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!storeId) return;
    getSellerOrders(storeId, 200).then((orders) => {
      // Aggregate unique customers
      const map = {};
      orders.forEach((o) => {
        const id = o.userId || o.customer?.email || "anon";
        if (!map[id]) {
          map[id] = {
            id, name: `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim(),
            phone: o.customer?.phone || "—",
            orders: 0, spent: 0, lastOrder: o.createdAt,
          };
        }
        map[id].orders++;
        map[id].spent += Number(o.pricing?.total || 0);
        const ts = o.createdAt?.toMillis ? o.createdAt.toMillis() : 0;
        const lt = map[id].lastOrder?.toMillis ? map[id].lastOrder.toMillis() : 0;
        if (ts > lt) map[id].lastOrder = o.createdAt;
      });
      setCustomers(Object.values(map).sort((a, b) => b.spent - a.spent));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [storeId]);

  return (
    <div>
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Customers</div>
          <div className="sd-page-sub">{customers.length} unique customers</div>
        </div>
      </div>

      <div className="sd-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 52, marginBottom: 10, borderRadius: 8 }} />)
          : customers.length === 0
            ? <div className="sd-empty"><div className="sd-empty-icon">👥</div><div className="sd-empty-title">No customers yet</div><div className="sd-empty-text">Customers who purchase from your store will appear here.</div></div>
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Orders</th>
                      <th>Total Spent</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#046EF215", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#046EF2", flexShrink: 0 }}>
                              {(c.name || "?")[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600 }}>{c.name || "Anonymous"}</span>
                          </div>
                        </td>
                        <td style={{ color: "#8B8FA8", fontSize: 12 }}>{c.phone}</td>
                        <td style={{ fontWeight: 600 }}>{c.orders}</td>
                        <td style={{ fontWeight: 700 }}>GHS {Number(c.spent).toFixed(2)}</td>
                        <td>
                          <span className={`sd-badge ${c.orders > 1 ? "sd-badge-blue" : "sd-badge-gray"}`}>
                            {c.orders > 1 ? "Repeat" : "New"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}


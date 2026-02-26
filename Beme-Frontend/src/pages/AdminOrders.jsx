import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./AdminOrders.css";

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "Orders"), orderBy("createdAt", "desc")); // change to "orders" if you rename
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => (o.status || "pending") === filter);
  }, [orders, filter]);

  const setStatus = async (id, status) => {
    await updateDoc(doc(db, "Orders", id), { status, updatedAt: new Date() });
  };

  return (
    <div className="admin-orders">
      <div className="admin-orders-head">
        <h1>Orders</h1>

        <div className="admin-filters">
          <button className={filter === "all" ? "chip active" : "chip"} onClick={() => setFilter("all")}>
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={filter === s ? "chip active" : "chip"}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="orders-list">
        {filtered.map((o) => {
          const status = o.status || "pending";
          const total = o.total ?? o.totals?.total ?? 0;
          const name =
            o.customer?.firstName
              ? `${o.customer.firstName} ${o.customer.lastName || ""}`.trim()
              : "Customer";

          return (
            <div className="order-card" key={o.id}>
              <div className="order-top">
                <div>
                  <div className="order-id">#{o.id.slice(0, 8)}</div>
                  <div className="order-meta">
                    <span>{name}</span>
                    <span className="muted">{o.customer?.phone || ""}</span>
                  </div>
                </div>

                <div className="order-total">GHS {Number(total).toFixed(2)}</div>
              </div>

              <div className="order-items">
                {(o.items || []).slice(0, 3).map((it) => (
                  <div key={it.id} className="order-item">
                    <span>{it.name}</span>
                    <span className="muted">x{it.qty}</span>
                  </div>
                ))}
                {(o.items || []).length > 3 && (
                  <div className="muted">+{(o.items || []).length - 3} more</div>
                )}
              </div>

              <div className="order-bottom">
                <div className="pill">{status}</div>

                <select value={status} onChange={(e) => setStatus(o.id, e.target.value)} className="status-select">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && <div className="muted">No orders found.</div>}
      </div>
    </div>
  );
}
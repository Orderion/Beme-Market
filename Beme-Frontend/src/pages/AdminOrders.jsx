// src/pages/AdminOrders.jsx
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "./AdminOrders.css";

const STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "payment_failed",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const q = query(
      collection(db, "Orders"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setOrders(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const setStatus = async (id, status) => {
    await updateDoc(doc(db, "Orders", id), {
      status,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div className="admin-orders">
      <div className="admin-orders-head">
        <h1>Orders</h1>

        <div className="admin-filters">
          <button
            className={filter === "all" ? "chip active" : "chip"}
            onClick={() => setFilter("all")}
          >
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
          const total = o.amounts?.total ?? 0;
          const name = `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim();
          const phone = o.customer?.phone || "";
          const emailSent = o.emailSent === true;
          const paid = o.paid === true;

          return (
            <div className="order-card" key={o.id}>
              <div className="order-top">
                <div>
                  <div className="order-id">#{o.id.slice(0, 8)}</div>

                  <div className="order-meta">
                    <span>{name || "Customer"}</span>
                    <span className="muted">{phone}</span>
                  </div>
                </div>

                <div className="order-total">
                  GHS {Number(total).toFixed(2)}
                </div>
              </div>

              <div className="order-items">
                {(o.items || []).slice(0, 3).map((it) => (
                  <div key={it.id} className="order-item">
                    <span>{it.name}</span>
                    <span className="muted">x{it.qty}</span>
                  </div>
                ))}

                {(o.items || []).length > 3 && (
                  <div className="muted">
                    +{(o.items || []).length - 3} more
                  </div>
                )}
              </div>

              <div className="order-bottom">
                <div className="pill">
                  {o.status}
                  {paid && " • Paid"}
                  {emailSent && " • Email sent"}
                </div>

                <select
                  value={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                  className="status-select"
                >
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

        {filtered.length === 0 && (
          <div className="muted">No orders found.</div>
        )}
      </div>
    </div>
  );
}
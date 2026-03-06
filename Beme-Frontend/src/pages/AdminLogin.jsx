import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "./AdminOrders.css";

const STATUSES = [
  "pending",
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "payment_failed",
];

function getSortableTime(value) {
  if (!value) return 0;

  try {
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    return new Date(value).getTime() || 0;
  } catch {
    return 0;
  }
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "orders"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        rows.sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));

        setError("");
        setOrders(rows);
      },
      (err) => {
        console.error("Admin orders snapshot error:", err);
        setError(err?.message || "Failed to load orders.");
      }
    );

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const setStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "orders", id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to update order status:", err);
      alert(err?.message || "Failed to update order status.");
    }
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

      {!!error && <div className="muted">{error}</div>}

      <div className="orders-list">
        {filtered.map((o) => {
          const total = o.pricing?.total ?? o.amounts?.total ?? 0;
          const name = `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim();
          const phone = o.customer?.phone || "";
          const email = o.customer?.email || "";
          const emailSent = o.emailSent === true;
          const paid =
            o.paid === true ||
            o.paymentStatus === "paid" ||
            o.status === "paid";

          return (
            <div className="order-card" key={o.id}>
              <div className="order-top">
                <div>
                  <div className="order-id">#{o.id.slice(0, 8)}</div>

                  <div className="order-meta">
                    <span>{name || "Customer"}</span>
                    {phone ? <span className="muted">{phone}</span> : null}
                    {email ? <span className="muted">{email}</span> : null}
                  </div>
                </div>

                <div className="order-total">
                  GHS {Number(total).toFixed(2)}
                </div>
              </div>

              <div className="order-items">
                {(o.items || []).slice(0, 3).map((it, index) => (
                  <div key={it.id || `${o.id}-${index}`} className="order-item">
                    <span>{it.name || "Item"}</span>
                    <span className="muted">x{it.qty || 1}</span>
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
                  {o.status || "pending"}
                  {paid && " • Paid"}
                  {emailSent && " • Email sent"}
                </div>

                <select
                  value={o.status || "pending"}
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

        {!error && filtered.length === 0 && (
          <div className="muted">No orders found.</div>
        )}
      </div>
    </div>
  );
}
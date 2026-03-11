import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Navigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
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

function normalizeShop(value) {
  return String(value || "main").trim().toLowerCase() || "main";
}

function orderMatchesShop(order, adminShop) {
  if (!adminShop) return false;

  const shops = Array.isArray(order?.shops)
    ? order.shops.map((shop) => normalizeShop(shop))
    : [];

  if (shops.includes(adminShop)) return true;

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((item) => normalizeShop(item?.shop) === adminShop);
}

function getOrderTotal(order) {
  return Number(order?.pricing?.total ?? 0);
}

export default function AdminOrders() {
  const { user, isAdmin, isSuperAdmin, isShopAdmin, adminShop, loading } =
    useAuth();

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user || !isAdmin) return undefined;

    let qRef;

    if (isShopAdmin) {
      if (!adminShop) {
        setOrders([]);
        setError("No assigned shop found for this account.");
        return undefined;
      }

      qRef = query(
        collection(db, "orders"),
        where("shops", "array-contains", adminShop),
        orderBy("createdAt", "desc")
      );
    } else {
      qRef = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    }

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        let rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        if (isShopAdmin && adminShop) {
          rows = rows.filter((order) => orderMatchesShop(order, adminShop));
        }

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
  }, [loading, user, isAdmin, isShopAdmin, adminShop]);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => (o.status || "pending") === filter);
  }, [orders, filter]);

  const totalRevenue = useMemo(() => {
    return filtered.reduce((sum, order) => sum + getOrderTotal(order), 0);
  }, [filtered]);

  const setStatus = async (id, status) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;

    if (isShopAdmin && adminShop && !orderMatchesShop(order, adminShop)) {
      alert("You can only update orders that belong to your shop.");
      return;
    }

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

  if (loading) {
    return (
      <div className="admin-orders">
        <div className="muted">Checking admin session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin-login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="admin-orders">
        <div className="muted">Signed in, but this account is not an admin.</div>
      </div>
    );
  }

  return (
    <div className="admin-orders">
      <div className="admin-orders-head">
        <div>
          <h1>{isSuperAdmin ? "Admin Orders" : "Shop Orders"}</h1>
          <div className="muted">
            {isSuperAdmin
              ? `Viewing all marketplace orders • Revenue GHS ${totalRevenue.toFixed(2)}`
              : `Viewing only ${adminShop} orders • Revenue GHS ${totalRevenue.toFixed(2)}`}
          </div>
        </div>

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
          const total = o.pricing?.total ?? 0;
          const name = `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim();
          const phone = o.customer?.phone || "";
          const email = o.customer?.email || "";
          const emailSent = o.emailSent === true;
          const paid =
            o.paid === true ||
            o.paymentStatus === "paid" ||
            o.status === "paid";

          const itemCount = Array.isArray(o.items) ? o.items.length : 0;
          const shops = Array.isArray(o.shops) ? o.shops : [];

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
                    <span>
                      {it.name || "Item"}
                      {it.shop ? (
                        <span className="muted"> • {normalizeShop(it.shop)}</span>
                      ) : null}
                    </span>
                    <span className="muted">x{it.qty || 1}</span>
                  </div>
                ))}

                {(o.items || []).length > 3 && (
                  <div className="muted">+{(o.items || []).length - 3} more</div>
                )}
              </div>

              <div className="order-bottom" style={{ justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <div className="pill">
                    {o.status || "pending"}
                    {paid && " • Paid"}
                    {emailSent && " • Email sent"}
                  </div>

                  <div className="pill">
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </div>

                  {shops.length ? (
                    <div className="pill">
                      {shops.join(", ")}
                    </div>
                  ) : null}
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
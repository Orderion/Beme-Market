import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
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

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function orderMatchesShop(order, adminShop) {
  if (!adminShop) return false;

  const normalizedAdminShop = normalizeShop(adminShop);

  const shops = Array.isArray(order?.shops)
    ? order.shops.map((shop) => normalizeShop(shop))
    : [];

  if (shops.includes(normalizedAdminShop)) return true;

  const primaryShop = normalizeShop(order?.primaryShop);
  if (primaryShop === normalizedAdminShop) return true;

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((item) => normalizeShop(item?.shop) === normalizedAdminShop);
}

function getOrderTotal(order) {
  const direct =
    order?.pricing?.total ??
    order?.total ??
    order?.amount ??
    order?.grandTotal ??
    order?.subtotal;

  if (Number.isFinite(Number(direct))) return Number(direct);

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum, item) => {
    const price = Number(item?.price || 0);
    const qty = Number(item?.qty || 0);
    return sum + price * qty;
  }, 0);
}

function getShopRevenueFromOrder(order, adminShop) {
  if (!adminShop) return 0;

  const normalizedAdminShop = normalizeShop(adminShop);
  const items = Array.isArray(order?.items) ? order.items : [];

  const matchingItems = items.filter(
    (item) => normalizeShop(item?.shop) === normalizedAdminShop
  );

  if (matchingItems.length) {
    return matchingItems.reduce((sum, item) => {
      const price = Number(item?.price || 0);
      const qty = Number(item?.qty || 0);
      return sum + price * qty;
    }, 0);
  }

  return orderMatchesShop(order, normalizedAdminShop) ? getOrderTotal(order) : 0;
}

function sortOrders(rows) {
  return [...rows].sort(
    (a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt)
  );
}

export default function AdminOrders() {
  const {
    user,
    isAdmin,
    isSuperAdmin,
    isShopAdmin,
    adminShop,
    loading,
  } = useAuth();

  const normalizedAdminShop = useMemo(() => normalizeShop(adminShop), [adminShop]);

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user || !isAdmin) return undefined;

    let unsub = null;
    let cancelled = false;

    async function setup() {
      try {
        if (isShopAdmin) {
          if (!normalizedAdminShop) {
            setOrders([]);
            setError("No assigned shop found for this account.");
            return;
          }

          try {
            const qRef = query(
              collection(db, "orders"),
              where("shops", "array-contains", normalizedAdminShop),
              orderBy("createdAt", "desc")
            );

            unsub = onSnapshot(
              qRef,
              (snap) => {
                if (cancelled) return;

                const rows = sortOrders(
                  snap.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                  }))
                ).filter((order) => orderMatchesShop(order, normalizedAdminShop));

                setOrders(rows);
                setError("");
              },
              async (err) => {
                console.error("Admin orders snapshot error:", err);

                try {
                  const fallbackQ = query(
                    collection(db, "orders"),
                    where("shops", "array-contains", normalizedAdminShop)
                  );

                  const fallbackSnap = await getDocs(fallbackQ);
                  if (cancelled) return;

                  const rows = sortOrders(
                    fallbackSnap.docs.map((d) => ({
                      id: d.id,
                      ...d.data(),
                    }))
                  ).filter((order) => orderMatchesShop(order, normalizedAdminShop));

                  setOrders(rows);
                  setError("");
                } catch (fallbackErr) {
                  console.error("Admin orders fallback error:", fallbackErr);
                  if (cancelled) return;
                  setOrders([]);
                  setError(
                    fallbackErr?.message || err?.message || "Failed to load orders."
                  );
                }
              }
            );
          } catch (outerErr) {
            console.error("Admin orders shop query setup error:", outerErr);

            const fallbackQ = query(
              collection(db, "orders"),
              where("shops", "array-contains", normalizedAdminShop)
            );

            const fallbackSnap = await getDocs(fallbackQ);
            if (cancelled) return;

            const rows = sortOrders(
              fallbackSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              }))
            ).filter((order) => orderMatchesShop(order, normalizedAdminShop));

            setOrders(rows);
            setError("");
          }

          return;
        }

        const qRef = query(collection(db, "orders"), orderBy("createdAt", "desc"));

        unsub = onSnapshot(
          qRef,
          (snap) => {
            if (cancelled) return;

            const rows = sortOrders(
              snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              }))
            );

            setOrders(rows);
            setError("");
          },
          async (err) => {
            console.error("Admin orders snapshot error:", err);

            try {
              const fallbackSnap = await getDocs(collection(db, "orders"));
              if (cancelled) return;

              const rows = sortOrders(
                fallbackSnap.docs.map((d) => ({
                  id: d.id,
                  ...d.data(),
                }))
              );

              setOrders(rows);
              setError("");
            } catch (fallbackErr) {
              console.error("Admin orders fallback error:", fallbackErr);
              if (cancelled) return;
              setOrders([]);
              setError(
                fallbackErr?.message || err?.message || "Failed to load orders."
              );
            }
          }
        );
      } catch (err) {
        console.error("Admin orders setup error:", err);
        if (!cancelled) {
          setOrders([]);
          setError(err?.message || "Failed to load orders.");
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [loading, user, isAdmin, isShopAdmin, normalizedAdminShop]);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => (o.status || "pending") === filter);
  }, [orders, filter]);

  const totalRevenue = useMemo(() => {
    return filtered.reduce((sum, order) => {
      if (isShopAdmin && normalizedAdminShop) {
        return sum + getShopRevenueFromOrder(order, normalizedAdminShop);
      }
      return sum + getOrderTotal(order);
    }, 0);
  }, [filtered, isShopAdmin, normalizedAdminShop]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const paid = filtered.filter(
      (o) =>
        o.paid === true ||
        o.paymentStatus === "paid" ||
        o.status === "paid"
    ).length;
    const processing = filtered.filter((o) => o.status === "processing").length;
    const delivered = filtered.filter((o) => o.status === "delivered").length;

    return { total, paid, processing, delivered };
  }, [filtered]);

  const setStatus = async (id, status) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;

    if (isShopAdmin && normalizedAdminShop && !orderMatchesShop(order, normalizedAdminShop)) {
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
              : `Viewing only ${titleize(normalizedAdminShop)} orders • Revenue GHS ${totalRevenue.toFixed(2)}`}
          </div>
        </div>

        <div className="admin-filters">
          <button
            className={filter === "all" ? "chip active" : "chip"}
            onClick={() => setFilter("all")}
            type="button"
          >
            All
          </button>

          {STATUSES.map((s) => (
            <button
              key={s}
              className={filter === s ? "chip active" : "chip"}
              onClick={() => setFilter(s)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div className="order-card" style={{ padding: 16 }}>
          <div className="muted">Visible orders</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
            {summary.total}
          </div>
        </div>

        <div className="order-card" style={{ padding: 16 }}>
          <div className="muted">Paid</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
            {summary.paid}
          </div>
        </div>

        <div className="order-card" style={{ padding: 16 }}>
          <div className="muted">Processing</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
            {summary.processing}
          </div>
        </div>

        <div className="order-card" style={{ padding: 16 }}>
          <div className="muted">Delivered</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
            {summary.delivered}
          </div>
        </div>
      </div>

      {!!error && <div className="muted">{error}</div>}

      <div className="orders-list">
        {filtered.map((o) => {
          const total = isShopAdmin && normalizedAdminShop
            ? getShopRevenueFromOrder(o, normalizedAdminShop)
            : getOrderTotal(o);

          const name = `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim();
          const phone = o.customer?.phone || "";
          const email = o.customer?.email || "";
          const emailSent = o.emailSent === true;
          const paid =
            o.paid === true ||
            o.paymentStatus === "paid" ||
            o.status === "paid";

          const items = Array.isArray(o.items) ? o.items : [];
          const visibleItems = isShopAdmin && normalizedAdminShop
            ? items.filter((it) => normalizeShop(it?.shop) === normalizedAdminShop)
            : items;

          const itemCount = visibleItems.length || items.length || 0;
          const shops = Array.isArray(o.shops)
            ? o.shops.map((shop) => normalizeShop(shop))
            : [];

          const displayShops = isShopAdmin && normalizedAdminShop
            ? [normalizedAdminShop]
            : shops;

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
                {visibleItems.slice(0, 3).map((it, index) => (
                  <div key={it.id || `${o.id}-${index}`} className="order-item">
                    <span>
                      {it.name || "Item"}
                      {it.shop ? (
                        <span className="muted"> • {titleize(normalizeShop(it.shop))}</span>
                      ) : null}
                    </span>
                    <span className="muted">x{it.qty || 1}</span>
                  </div>
                ))}

                {visibleItems.length > 3 && (
                  <div className="muted">+{visibleItems.length - 3} more</div>
                )}
              </div>

              <div
                className="order-bottom"
                style={{ justifyContent: "space-between", gap: 12 }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <div className="pill">
                    {o.status || "pending"}
                    {paid && " • Paid"}
                    {emailSent && " • Email sent"}
                  </div>

                  <div className="pill">
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </div>

                  {displayShops.length ? (
                    <div className="pill">
                      {displayShops.map(titleize).join(", ")}
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
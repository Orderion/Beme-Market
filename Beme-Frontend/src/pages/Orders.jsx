import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import "./Orders.css";

const STATUS_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

function getStepIndex(status) {
  const index = STATUS_STEPS.indexOf(status);
  return index === -1 ? 0 : index;
}

function formatMoney(value) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return new Intl.DateTimeFormat("en-GH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

export default function Orders() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        );
        setPageError("");
        setLoadingOrders(false);
      },
      (error) => {
        console.error("Orders snapshot error:", error);
        setPageError(error?.message || "Failed to load orders.");
        setLoadingOrders(false);
      }
    );

    return () => unsub();
  }, [user, loading]);

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  if (loading || loadingOrders) {
    return (
      <div className="orders-page">
        <div className="orders-wrap">
          <div className="orders-empty-card">
            <h1 className="orders-title">Orders</h1>
            <p className="orders-empty-text">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="orders-page">
        <div className="orders-wrap">
          <div className="orders-empty-card">
            <h1 className="orders-title">Orders</h1>
            <p className="orders-empty-text">Please log in to view your orders.</p>
            <Link to="/login" className="orders-action-btn">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-wrap">
        <div className="orders-head">
          <div>
            <p className="orders-eyebrow">Account</p>
            <h1 className="orders-title">Orders</h1>
          </div>
          <Link to="/shop" className="orders-link-btn">
            Continue shopping
          </Link>
        </div>

        {pageError ? (
          <div className="orders-empty-card">
            <p className="orders-empty-text">{pageError}</p>
          </div>
        ) : !hasOrders ? (
          <div className="orders-empty-card">
            <h2 className="orders-empty-title">No orders yet</h2>
            <p className="orders-empty-text">
              When you place an order, it will appear here with its progress.
            </p>
            <Link to="/shop" className="orders-action-btn">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const status = order.status || "pending";
              const stepIndex = getStepIndex(status);
              const total = order.pricing?.total ?? order.amounts?.total ?? 0;
              const createdAt = formatDate(order.createdAt);

              return (
                <article className="orders-card" key={order.id}>
                  <div className="orders-card-top">
                    <div>
                      <p className="orders-order-label">Order</p>
                      <h2 className="orders-order-id">#{order.id.slice(0, 8).toUpperCase()}</h2>
                    </div>

                    <div className="orders-card-meta">
                      <div>
                        <span className="orders-meta-label">Placed</span>
                        <strong>{createdAt}</strong>
                      </div>
                      <div>
                        <span className="orders-meta-label">Total</span>
                        <strong>{formatMoney(total)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="orders-status-row">
                    <span className={`orders-status-badge status-${status.replace(/\s+/g, "-")}`}>
                      {status}
                    </span>
                    <span className="orders-items-count">
                      {(order.items || []).length} item{(order.items || []).length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="orders-progress">
                    {STATUS_STEPS.map((step, index) => {
                      const active = index <= stepIndex;
                      return (
                        <div className="orders-progress-step" key={step}>
                          <span className={`orders-progress-dot ${active ? "active" : ""}`} />
                          <span className={`orders-progress-text ${active ? "active" : ""}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="orders-items-preview">
                    {(order.items || []).slice(0, 3).map((item, index) => (
                      <div className="orders-item-row" key={item.id || `${order.id}-${index}`}>
                        <span className="orders-item-name">{item.name || "Product"}</span>
                        <span className="orders-item-qty">x{item.qty || 1}</span>
                      </div>
                    ))}

                    {(order.items || []).length > 3 ? (
                      <p className="orders-more-items">
                        +{(order.items || []).length - 3} more item(s)
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
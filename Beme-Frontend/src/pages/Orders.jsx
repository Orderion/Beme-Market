import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import "./Orders.css";

const API_BASE = String(import.meta.env.VITE_BACKEND_URL || "")
  .trim()
  .replace(/\/+$/, "");

const STATUS_STEPS = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
];

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getStepIndex(status) {
  const normalized = normalizeStatus(status || "pending");
  const index = STATUS_STEPS.indexOf(normalized);
  return index === -1 ? 0 : index;
}

function formatMoney(value) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";

  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-GH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

function getSortableTime(value) {
  if (!value) return 0;

  try {
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.seconds === "number") return value.seconds * 1000;

    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  } catch {
    return 0;
  }
}

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatOptionPair(key, value) {
  const cleanKey = String(key || "").trim();
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "";
  return cleanKey ? `${titleize(cleanKey)}: ${cleanValue}` : cleanValue;
}

function extractItemOptions(item) {
  if (!item || typeof item !== "object") return [];

  const collected = [];

  const pushEntry = (text) => {
    const clean = String(text || "").trim();
    if (!clean) return;
    if (!collected.includes(clean)) collected.push(clean);
  };

  pushEntry(item?.selectedOptionsLabel);

  if (Array.isArray(item?.selectedOptionDetails)) {
    item.selectedOptionDetails.forEach((entry) => {
      if (typeof entry === "string") {
        pushEntry(entry);
        return;
      }

      if (entry && typeof entry === "object") {
        pushEntry(
          formatOptionPair(
            entry?.groupName || entry?.label || entry?.name || entry?.key,
            entry?.label || entry?.value || entry?.title
          )
        );
      }
    });
  }

  const objectSources = [
    item?.selectedOptions,
    item?.customizations,
    item?.customizationOptions,
    item?.options,
    item?.variant,
    item?.variantOptions,
  ];

  objectSources.forEach((source) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) return;

    Object.entries(source).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const joined = value
          .map((v) => String(v || "").trim())
          .filter(Boolean)
          .join(", ");

        pushEntry(formatOptionPair(key, joined));
        return;
      }

      if (value && typeof value === "object") {
        const nested =
          value?.value ?? value?.label ?? value?.name ?? value?.title ?? "";
        pushEntry(formatOptionPair(key, nested));
        return;
      }

      pushEntry(formatOptionPair(key, value));
    });
  });

  if (Array.isArray(item?.customizations)) {
    item.customizations.forEach((entry) => {
      if (typeof entry === "string") {
        pushEntry(entry);
        return;
      }

      if (entry && typeof entry === "object") {
        pushEntry(
          formatOptionPair(
            entry?.label || entry?.name || entry?.key || entry?.title,
            entry?.value || entry?.selected || entry?.option || entry?.label
          )
        );
      }
    });
  }

  return collected;
}

async function getOwnOrders() {
  if (!API_BASE) {
    throw new Error("Missing backend URL. Set VITE_BACKEND_URL.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to view your orders.");
  }

  const token = await currentUser.getIdToken();

  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to load orders.");
  }

  return Array.isArray(data?.orders) ? data.orders : [];
}

export default function Orders() {
  const { user, loading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      if (loading) return;

      if (!user) {
        if (!active) return;
        setOrders([]);
        setPageError("");
        setLoadingOrders(false);
        return;
      }

      setLoadingOrders(true);
      setPageError("");

      try {
        const rows = await getOwnOrders();

        if (!active) return;

        const sorted = [...rows].sort(
          (a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt)
        );

        setOrders(sorted);
        setPageError("");
      } catch (error) {
        console.error("Orders load error:", error);
        if (!active) return;
        setOrders([]);
        setPageError(error?.message || "Failed to load orders.");
      } finally {
        if (active) {
          setLoadingOrders(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
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
              const status = normalizeStatus(order.status || "pending");
              const stepIndex = getStepIndex(status);
              const total = order.pricing?.total ?? order.amounts?.total ?? 0;
              const createdAt = formatDate(order.createdAt);
              const items = Array.isArray(order.items) ? order.items : [];

              return (
                <article className="orders-card" key={order.id}>
                  <div className="orders-card-top">
                    <div>
                      <p className="orders-order-label">Order</p>
                      <h2 className="orders-order-id">
                        #{String(order.id || "").slice(0, 8).toUpperCase()}
                      </h2>
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
                    <span
                      className={`orders-status-badge status-${status.replace(
                        /\s+/g,
                        "-"
                      )}`}
                    >
                      {titleize(status)}
                    </span>

                    <span className="orders-items-count">
                      {items.length} item{items.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="orders-progress">
                    {STATUS_STEPS.map((step, index) => {
                      const active = index <= stepIndex;

                      return (
                        <div className="orders-progress-step" key={step}>
                          <span
                            className={`orders-progress-dot ${
                              active ? "active" : ""
                            }`}
                          />
                          <span
                            className={`orders-progress-text ${
                              active ? "active" : ""
                            }`}
                          >
                            {titleize(step)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="orders-items-preview">
                    {items.slice(0, 3).map((item, index) => {
                      const optionLines = extractItemOptions(item);

                      return (
                        <div
                          className="orders-item-row"
                          key={item.id || `${order.id}-${index}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "64px 1fr auto",
                            gap: 12,
                            alignItems: "start",
                          }}
                        >
                          <div
                            className="orders-item-image"
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 14,
                              overflow: "hidden",
                              border: "1px solid var(--border)",
                              background: "var(--soft)",
                              flexShrink: 0,
                            }}
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name || "Product"}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  opacity: 0.6,
                                  textAlign: "center",
                                  padding: 6,
                                }}
                              >
                                No image
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="orders-item-name">
                              {item.name || "Product"}
                            </span>

                            {optionLines.length ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  marginTop: 6,
                                }}
                              >
                                {optionLines.map((line, optionIndex) => (
                                  <span
                                    key={`${
                                      item.id || `${order.id}-${index}`
                                    }-opt-${optionIndex}`}
                                    style={{
                                      fontSize: 12,
                                      opacity: 0.82,
                                      padding: "5px 8px",
                                      borderRadius: 999,
                                      border: "1px solid var(--border)",
                                      background: "var(--soft)",
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    {line}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <span className="orders-item-qty">
                            x{item.qty || 1}
                          </span>
                        </div>
                      );
                    })}

                    {items.length > 3 ? (
                      <p className="orders-more-items">
                        +{items.length - 3} more item(s)
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
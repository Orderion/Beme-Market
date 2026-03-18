import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import "./Orders.css";

const STATUS_STEPS = [
  "pending",
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
];

function normalizeStatus(value) {
  return String(value || "pending").trim().toLowerCase();
}

function getVisualStatus(status, paymentStatus, paid) {
  const normalizedStatus = normalizeStatus(status);
  const normalizedPaymentStatus = normalizeStatus(paymentStatus);

  if (paid === true || normalizedPaymentStatus === "paid") {
    if (
      ["processing", "shipped", "delivered"].includes(normalizedStatus)
    ) {
      return normalizedStatus;
    }
    return "paid";
  }

  if (
    [
      "payment_failed",
      "failed",
      "verify_error",
      "cancelled",
      "canceled",
      "abandoned",
      "reversed",
      "amount_mismatch",
      "invalid_metadata_type",
      "invalid_user",
      "user_mismatch",
      "not_found",
    ].includes(normalizedStatus)
  ) {
    return "pending_payment";
  }

  if (STATUS_STEPS.includes(normalizedStatus)) {
    return normalizedStatus;
  }

  return "pending";
}

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
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : typeof value?.seconds === "number"
          ? new Date(value.seconds * 1000)
          : typeof value?._seconds === "number"
            ? new Date(value._seconds * 1000)
            : new Date(value);

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
    if (typeof value?._seconds === "number") return value._seconds * 1000;
    return new Date(value).getTime() || 0;
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

async function getAuthHeaders() {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to continue.");
  }

  const token = await currentUser.getIdToken(true);

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

async function fetchOwnOrders() {
  const apiBase = String(import.meta.env.VITE_BACKEND_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (!apiBase) {
    throw new Error("Missing backend URL. Set VITE_BACKEND_URL.");
  }

  const headers = await getAuthHeaders();

  const res = await fetch(`${apiBase}/api/orders`, {
    method: "GET",
    headers,
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
    let cancelled = false;

    async function loadOrders() {
      if (loading) return;

      if (!user) {
        if (!cancelled) {
          setOrders([]);
          setPageError("");
          setLoadingOrders(false);
        }
        return;
      }

      setLoadingOrders(true);

      try {
        const rows = await fetchOwnOrders();

        if (cancelled) return;

        rows.sort(
          (a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt)
        );

        setOrders(rows);
        setPageError("");
      } catch (error) {
        console.error("Orders fetch error:", error);
        if (cancelled) return;
        setOrders([]);
        setPageError(error?.message || "Failed to load orders.");
      } finally {
        if (!cancelled) {
          setLoadingOrders(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
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
            <p className="orders-empty-text">
              Please log in to view your orders.
            </p>
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
              const rawStatus = normalizeStatus(order.status || "pending");
              const visualStatus = getVisualStatus(
                order.status,
                order.paymentStatus,
                order.paid
              );
              const stepIndex = getStepIndex(visualStatus);
              const total = order.pricing?.total ?? order.amounts?.total ?? 0;
              const createdAt = formatDate(order.createdAt);
              const items = Array.isArray(order.items) ? order.items : [];
              const badgeText =
                rawStatus === "payment_failed"
                  ? "Payment Failed"
                  : titleize(rawStatus);

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
                      className={`orders-status-badge status-${rawStatus.replace(
                        /\s+/g,
                        "-"
                      )}`}
                    >
                      {badgeText}
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
                        >
                          <div className="orders-item-image">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name || "Product"}
                                className="orders-item-image-tag"
                              />
                            ) : (
                              <div className="orders-item-image-empty">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="orders-item-main">
                            <span className="orders-item-name">
                              {item.name || "Product"}
                            </span>

                            {optionLines.length ? (
                              <div className="orders-item-options">
                                {optionLines.map((line, optionIndex) => (
                                  <span
                                    key={`${
                                      item.id || `${order.id}-${index}`
                                    }-opt-${optionIndex}`}
                                    className="orders-item-option-chip"
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
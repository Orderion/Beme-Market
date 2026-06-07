// src/pages/dashboard/DashboardOrders.jsx
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getSellerOrders } from "../../services/storeService";
import TutorialOverlay from "../../components/ai/TutorialOverlay";
import { TUTORIAL_STEPS } from "../../components/ai/tutorialSteps";
import { useTutorial } from "../../hooks/useTutorial";
import "./DashboardOrders.css";

const STATUS_TABS = ["all","pending","processing","delivered","cancelled"];

const BADGE = {
  delivered:      "do-badge do-badge--green",
  processing:     "do-badge do-badge--blue",
  pending:        "do-badge do-badge--yellow",
  cancelled:      "do-badge do-badge--red",
  pending_payment:"do-badge do-badge--gray",
  paid:           "do-badge do-badge--green",
  payment_failed: "do-badge do-badge--red",
};

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour:"2-digit", minute:"2-digit" });
}

function ProductThumb({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="do-thumb do-thumb--empty">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
      </div>
    );
  }
  return <img className="do-thumb" src={src} alt={alt || "Product"} onError={() => setErr(true)} />;
}

function EmptyOrders() {
  return (
    <div className="do-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--sd-border)" strokeWidth="1.2" strokeLinecap="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
      <div className="do-empty-title">No orders yet</div>
      <div className="do-empty-text">Orders from customers will appear here.</div>
    </div>
  );
}

/* ── Order Detail Panel ── */
function OrderDetail({ order, onClose }) {
  if (!order) return null;
  const cust  = order.customer || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const del   = order.delivery || {};
  const price = order.pricing  || {};

  return (
    <div className="do-detail-backdrop" onClick={onClose}>
      <div className="do-detail" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="do-detail-head">
          <div>
            <div className="do-detail-id">#{order.id?.slice(0,8).toUpperCase()}</div>
            <div className="do-detail-meta">{fmtDate(order.createdAt)} · {fmtTime(order.createdAt)}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span className={BADGE[order.status] || "do-badge do-badge--gray"}>
              {order.status?.replace(/_/g," ")}
            </span>
            <button className="do-detail-close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="do-detail-body">

          {/* Items */}
          <div className="do-detail-section">
            <div className="do-detail-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              Items ordered
            </div>
            <div className="do-detail-items">
              {items.map((item, i) => {
                const img = item.image || (Array.isArray(item.images) ? item.images[0] : "");
                const opts = item.selectedOptionsLabel || Object.entries(item.selectedOptions || {}).map(([k,v])=>`${k}: ${v}`).join(" · ");
                return (
                  <div key={i} className="do-detail-item">
                    <ProductThumb src={img} alt={item.name} />
                    <div className="do-detail-item-info">
                      <div className="do-detail-item-name">{item.name || "Product"}</div>
                      {opts && <div className="do-detail-item-opts">{opts}</div>}
                      <div className="do-detail-item-meta">
                        Qty: {item.qty} · GHS {Number(item.price || 0).toFixed(2)} each
                      </div>
                    </div>
                    <div className="do-detail-item-total">
                      GHS {(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer */}
          <div className="do-detail-section">
            <div className="do-detail-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Customer
            </div>
            <div className="do-detail-grid">
              <div className="do-detail-field">
                <span className="do-detail-label">Name</span>
                <span className="do-detail-value">{cust.firstName} {cust.lastName}</span>
              </div>
              <div className="do-detail-field">
                <span className="do-detail-label">Phone</span>
                <span className="do-detail-value">{cust.phone || "—"}</span>
              </div>
              <div className="do-detail-field">
                <span className="do-detail-label">Email</span>
                <span className="do-detail-value">{cust.email || "—"}</span>
              </div>
              <div className="do-detail-field">
                <span className="do-detail-label">Network</span>
                <span className="do-detail-value">{cust.network || "—"}</span>
              </div>
              <div className="do-detail-field do-detail-field--full">
                <span className="do-detail-label">Address</span>
                <span className="do-detail-value">
                  {[cust.address, cust.area, cust.city, cust.region, cust.country].filter(Boolean).join(", ")}
                </span>
              </div>
              {cust.notes && (
                <div className="do-detail-field do-detail-field--full">
                  <span className="do-detail-label">Notes</span>
                  <span className="do-detail-value">{cust.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div className="do-detail-section">
            <div className="do-detail-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Delivery
            </div>
            <div className="do-detail-grid">
              <div className="do-detail-field">
                <span className="do-detail-label">Method</span>
                <span className="do-detail-value">{del.label || del.method || "—"}</span>
              </div>
              <div className="do-detail-field">
                <span className="do-detail-label">Delivery fee</span>
                <span className="do-detail-value">GHS {Number(del.fee || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div className="do-detail-section">
            <div className="do-detail-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Payment
            </div>
            <div className="do-detail-grid">
              <div className="do-detail-field">
                <span className="do-detail-label">Method</span>
                <span className="do-detail-value">{order.paymentMethod === "cod" ? "Pay on Delivery" : "Paystack"}</span>
              </div>
              <div className="do-detail-field">
                <span className="do-detail-label">Status</span>
                <span className="do-detail-value">{order.paymentStatus || "—"}</span>
              </div>
            </div>
            <div className="do-detail-totals">
              <div className="do-detail-total-row">
                <span>Subtotal</span>
                <span>GHS {Number(price.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="do-detail-total-row">
                <span>Delivery</span>
                <span>GHS {Number(price.deliveryFee || 0).toFixed(2)}</span>
              </div>
              <div className="do-detail-total-row do-detail-total-row--total">
                <span>Total</span>
                <span>GHS {Number(price.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function DashboardOrders() {
  const { showTutorial, markSeen } = useTutorial("orders");
  const { storeId, shop } = useSellerAuth();
  const queryId = shop?.id || storeId;
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!queryId) return;
    getSellerOrders(queryId)
      .then(d => { setOrders(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [queryId]);

  const filtered = tab === "all"
    ? orders
    : orders.filter(o => o.status === tab || o.fulfillmentStatus === tab);

  return (
    <div className="do-root">
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Orders</div>
          <div className="sd-page-sub">{orders.length} total order{orders.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      <div className="sd-tabs">
        {STATUS_TABS.map(t => (
          <button key={t} className={`sd-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="sd-panel">
        {loading
          ? [1,2,3].map(i => (
              <div key={i} className="sd-skeleton" style={{ height:60, marginBottom:10, borderRadius:10 }} />
            ))
          : filtered.length === 0
            ? <EmptyOrders />
            : (
              <div className="sd-table-wrap">
                <table className="sd-table do-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => {
                      const total    = o.pricing?.total || 0;
                      const cust     = o.customer || {};
                      const items    = Array.isArray(o.items) ? o.items : [];
                      const firstImg = items[0]?.image || (Array.isArray(items[0]?.images) ? items[0]?.images[0] : "");
                      const extraCount = items.length - 1;

                      return (
                        <tr key={o.id} className="do-row" onClick={() => setSelected(o)}>
                          {/* Product thumb */}
                          <td>
                            <div className="do-thumb-stack">
                              <ProductThumb src={firstImg} alt={items[0]?.name} />
                              {extraCount > 0 && (
                                <span className="do-thumb-extra">+{extraCount}</span>
                              )}
                            </div>
                          </td>

                          {/* Order ID */}
                          <td>
                            <span className="do-order-id">#{o.id?.slice(0,8).toUpperCase()}</span>
                          </td>

                          {/* Customer */}
                          <td>
                            <div className="do-customer-name">{cust.firstName} {cust.lastName}</div>
                            <div className="do-customer-phone">{cust.phone || ""}</div>
                          </td>

                          {/* Amount */}
                          <td>
                            <span className="do-amount">GHS {Number(total).toFixed(2)}</span>
                          </td>

                          {/* Date */}
                          <td>
                            <div className="do-date">{fmtDate(o.createdAt)}</div>
                          </td>

                          {/* Status */}
                          <td>
                            <span className={BADGE[o.status] || "do-badge do-badge--gray"}>
                              {o.status?.replace(/_/g," ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} />}

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
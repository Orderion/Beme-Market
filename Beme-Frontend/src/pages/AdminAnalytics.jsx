import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import "./Analytics.css";

const PRODUCTS_COLLECTION = "Products";
const ORDERS_COLLECTION = "orders";
const USERS_COLLECTION = "users";

function formatMoney(value) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function getOrderTotal(order) {
  const direct =
    order.total ??
    order.amount ??
    order.orderTotal ??
    order.subtotal ??
    order.grandTotal;

  if (Number.isFinite(Number(direct))) return Number(direct);

  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum, item) => {
    const price = Number(item?.price || 0);
    const qty = Number(item?.qty || 0);
    return sum + price * qty;
  }, 0);
}

function getOrderItemsCount(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum, item) => sum + Number(item?.qty || 0), 0);
}

function getDayKeyFromTimestamp(ts) {
  const date = ts ? new Date(toMillis(ts)) : new Date();
  return date.toISOString().slice(0, 10);
}

function labelFromDayKey(dayKey) {
  const date = new Date(`${dayKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildDailySeries(orders, days = 7) {
  const today = new Date();
  const map = new Map();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, {
      key,
      label: labelFromDayKey(key),
      orders: 0,
      revenue: 0,
    });
  }

  for (const order of orders) {
    const key = getDayKeyFromTimestamp(order.createdAt || order.timestamp);
    if (!map.has(key)) continue;

    const current = map.get(key);
    current.orders += 1;
    current.revenue += getOrderTotal(order);
  }

  return Array.from(map.values());
}

function buildShopPerformance(products, orders) {
  const bucket = new Map();

  for (const product of products) {
    const shop = String(product.shop || "unknown").trim() || "unknown";

    if (!bucket.has(shop)) {
      bucket.set(shop, {
        key: shop,
        label: shop.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
        products: 0,
        featured: 0,
        inStock: 0,
        estimatedRevenue: 0,
      });
    }

    const row = bucket.get(shop);
    row.products += 1;
    if (product.featured) row.featured += 1;
    if (product.inStock) row.inStock += 1;
  }

  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const shop = String(item?.shop || "unknown").trim() || "unknown";

      if (!bucket.has(shop)) {
        bucket.set(shop, {
          key: shop,
          label: shop.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
          products: 0,
          featured: 0,
          inStock: 0,
          estimatedRevenue: 0,
        });
      }

      const row = bucket.get(shop);
      row.estimatedRevenue += Number(item?.price || 0) * Number(item?.qty || 0);
    }
  }

  return Array.from(bucket.values()).sort(
    (a, b) => b.estimatedRevenue - a.estimatedRevenue || b.products - a.products
  );
}

function buildTopProducts(orders) {
  const map = new Map();

  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];

    for (const item of items) {
      const id = String(item?.id || item?.productId || item?.name || "").trim();
      const name = String(item?.name || "Unnamed Product").trim() || "Unnamed Product";

      if (!id) continue;

      if (!map.has(id)) {
        map.set(id, {
          id,
          name,
          units: 0,
          revenue: 0,
        });
      }

      const row = map.get(id);
      const qty = Number(item?.qty || 0);
      const price = Number(item?.price || 0);

      row.units += qty;
      row.revenue += qty * price;
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 6);
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [productsSnap, ordersSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, PRODUCTS_COLLECTION))),
          getDocs(query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"), limit(300))).catch(
            async () => getDocs(collection(db, ORDERS_COLLECTION))
          ),
          getDocs(collection(db, USERS_COLLECTION)).catch(() => ({ docs: [] })),
        ]);

        if (!alive) return;

        setProducts(
          productsSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        );

        setOrders(
          ordersSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        );

        setUsers(usersSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      } catch (err) {
        console.error("Analytics load error:", err);
        if (!alive) return;
        setError("Failed to load analytics.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const inStockProducts = products.filter((p) => p.inStock !== false).length;
    const featuredProducts = products.filter((p) => !!p.featured).length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + getOrderTotal(order), 0);
    const totalUnitsSold = orders.reduce((sum, order) => sum + getOrderItemsCount(order), 0);
    const activeCustomers = users.filter((u) => u.role !== "admin").length;

    const stockHealth =
      totalProducts > 0 ? Math.round((inStockProducts / totalProducts) * 100) : 0;

    const featuredCoverage =
      totalProducts > 0 ? Math.round((featuredProducts / totalProducts) * 100) : 0;

    const avgOrderValue =
      totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalProducts,
      inStockProducts,
      featuredProducts,
      totalOrders,
      totalRevenue,
      totalUnitsSold,
      activeCustomers,
      stockHealth,
      featuredCoverage,
      avgOrderValue,
    };
  }, [products, orders, users]);

  const dailySeries = useMemo(() => buildDailySeries(orders, 7), [orders]);
  const shopPerformance = useMemo(
    () => buildShopPerformance(products, orders),
    [products, orders]
  );
  const topProducts = useMemo(() => buildTopProducts(orders), [orders]);

  const revenueMax = Math.max(...dailySeries.map((item) => item.revenue), 1);
  const orderMax = Math.max(...dailySeries.map((item) => item.orders), 1);
  const shopRevenueMax = Math.max(...shopPerformance.map((item) => item.estimatedRevenue), 1);
  const topUnitsMax = Math.max(...topProducts.map((item) => item.units), 1);

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-shell">
          <div className="analytics-head">
            <h1 className="analytics-title">Admin Analytics</h1>
            <p className="analytics-sub">Loading performance insights…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-shell">
          <div className="analytics-panel">
            <h1 className="analytics-title">Admin Analytics</h1>
            <p className="analytics-error">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-shell">
        <div className="analytics-head">
          <div>
            <h1 className="analytics-title">Admin Analytics</h1>
            <p className="analytics-sub">
              Performance overview across products, orders, customers, stores, and selling trends.
            </p>
          </div>

          <div className="analytics-head-pill">
            {orders.length} orders analysed
          </div>
        </div>

        <section className="analytics-metrics">
          <div className="analytics-metric-card">
            <span className="analytics-metric-label">Revenue</span>
            <strong className="analytics-metric-value">
              {formatMoney(metrics.totalRevenue)}
            </strong>
            <span className="analytics-metric-note">
              Avg order: {formatMoney(metrics.avgOrderValue)}
            </span>
          </div>

          <div className="analytics-metric-card">
            <span className="analytics-metric-label">Orders</span>
            <strong className="analytics-metric-value">{metrics.totalOrders}</strong>
            <span className="analytics-metric-note">
              Units sold: {metrics.totalUnitsSold}
            </span>
          </div>

          <div className="analytics-metric-card">
            <span className="analytics-metric-label">Products</span>
            <strong className="analytics-metric-value">{metrics.totalProducts}</strong>
            <span className="analytics-metric-note">
              In stock: {metrics.inStockProducts}
            </span>
          </div>

          <div className="analytics-metric-card">
            <span className="analytics-metric-label">Customers</span>
            <strong className="analytics-metric-value">{metrics.activeCustomers}</strong>
            <span className="analytics-metric-note">
              Featured products: {metrics.featuredProducts}
            </span>
          </div>
        </section>

        <section className="analytics-grid">
          <div className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>7-day revenue trend</h2>
              <span>Graph view</span>
            </div>

            <div className="analytics-chart">
              {dailySeries.map((item) => (
                <div className="analytics-bar-card" key={item.key}>
                  <div className="analytics-bar-meta">
                    <span>{item.label}</span>
                    <strong>{formatMoney(item.revenue)}</strong>
                  </div>
                  <div className="analytics-bar-track tall">
                    <div
                      className="analytics-bar-fill"
                      style={{
                        width: `${Math.max((item.revenue / revenueMax) * 100, item.revenue > 0 ? 8 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>7-day order activity</h2>
              <span>Conversion pulse</span>
            </div>

            <div className="analytics-chart">
              {dailySeries.map((item) => (
                <div className="analytics-bar-card" key={`${item.key}-orders`}>
                  <div className="analytics-bar-meta">
                    <span>{item.label}</span>
                    <strong>{item.orders} orders</strong>
                  </div>
                  <div className="analytics-bar-track">
                    <div
                      className="analytics-bar-fill analytics-bar-fill--soft"
                      style={{
                        width: `${Math.max((item.orders / orderMax) * 100, item.orders > 0 ? 12 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Store performance</h2>
              <span>Revenue by storefront</span>
            </div>

            <div className="analytics-chart">
              {shopPerformance.length ? (
                shopPerformance.map((shop) => (
                  <div className="analytics-store-row" key={shop.key}>
                    <div className="analytics-store-meta">
                      <div>
                        <strong>{shop.label}</strong>
                        <span>
                          {shop.products} products • {shop.inStock} in stock • {shop.featured} featured
                        </span>
                      </div>
                      <strong>{formatMoney(shop.estimatedRevenue)}</strong>
                    </div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{
                          width: `${Math.max(
                            (shop.estimatedRevenue / shopRevenueMax) * 100,
                            shop.estimatedRevenue > 0 ? 8 : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="analytics-empty">No store analytics yet.</div>
              )}
            </div>
          </div>

          <div className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Top selling products</h2>
              <span>Best performers</span>
            </div>

            <div className="analytics-chart">
              {topProducts.length ? (
                topProducts.map((item) => (
                  <div className="analytics-store-row" key={item.id}>
                    <div className="analytics-store-meta">
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.units} units sold</span>
                      </div>
                      <strong>{formatMoney(item.revenue)}</strong>
                    </div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill analytics-bar-fill--dark"
                        style={{
                          width: `${Math.max((item.units / topUnitsMax) * 100, item.units > 0 ? 12 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="analytics-empty">No product sales data yet.</div>
              )}
            </div>
          </div>
        </section>

        <section className="analytics-summary-grid">
          <div className="analytics-summary-card">
            <span className="analytics-summary-label">Stock health</span>
            <strong className="analytics-summary-value">{metrics.stockHealth}%</strong>
            <p className="analytics-summary-text">
              Share of listed products currently available for purchase.
            </p>
          </div>

          <div className="analytics-summary-card">
            <span className="analytics-summary-label">Featured coverage</span>
            <strong className="analytics-summary-value">{metrics.featuredCoverage}%</strong>
            <p className="analytics-summary-text">
              Portion of your catalog currently highlighted for conversion.
            </p>
          </div>

          <div className="analytics-summary-card">
            <span className="analytics-summary-label">Catalog depth</span>
            <strong className="analytics-summary-value">{metrics.totalProducts}</strong>
            <p className="analytics-summary-text">
              Total products across Fashion, Main Store, Kente, Perfume, and Tech.
            </p>
          </div>

          <div className="analytics-summary-card">
            <span className="analytics-summary-label">Customer activity</span>
            <strong className="analytics-summary-value">{metrics.activeCustomers}</strong>
            <p className="analytics-summary-text">
              Registered non-admin accounts currently in your database.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
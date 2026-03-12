import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Analytics.css";

const PRODUCTS_COLLECTION = "Products";
const ORDERS_COLLECTION = "orders";
const USERS_COLLECTION = "users";
const RESET_CONFIRM_TEXT = "RESET BEME";

function formatMoney(value) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  return 0;
}

function normalizeShop(value) {
  return String(value || "main").trim().toLowerCase() || "main";
}

function toShopLabel(value) {
  return normalizeShop(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getOrderTotal(order) {
  const direct =
    order.total ??
    order.amount ??
    order.orderTotal ??
    order.subtotal ??
    order.grandTotal ??
    order.pricing?.total;

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

function productBelongsToShop(product, shopKey) {
  return normalizeShop(product?.shop) === normalizeShop(shopKey);
}

function orderBelongsToShop(order, shopKey) {
  const normalizedShop = normalizeShop(shopKey);

  const shops = Array.isArray(order?.shops)
    ? order.shops.map((shop) => normalizeShop(shop))
    : [];

  if (shops.includes(normalizedShop)) return true;

  const primaryShop = normalizeShop(order?.primaryShop);
  if (primaryShop === normalizedShop) return true;

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((item) => normalizeShop(item?.shop) === normalizedShop);
}

function getRevenueForShopFromOrder(order, shopKey) {
  const normalizedShop = normalizeShop(shopKey);
  const items = Array.isArray(order?.items) ? order.items : [];

  const matchingItems = items.filter(
    (item) => normalizeShop(item?.shop) === normalizedShop
  );

  if (matchingItems.length) {
    return matchingItems.reduce((sum, item) => {
      const price = Number(item?.price || 0);
      const qty = Number(item?.qty || 0);
      return sum + price * qty;
    }, 0);
  }

  if (orderBelongsToShop(order, normalizedShop)) {
    return getOrderTotal(order);
  }

  return 0;
}

function getUnitsForShopFromOrder(order, shopKey) {
  const normalizedShop = normalizeShop(shopKey);
  const items = Array.isArray(order?.items) ? order.items : [];

  const matchingItems = items.filter(
    (item) => normalizeShop(item?.shop) === normalizedShop
  );

  if (matchingItems.length) {
    return matchingItems.reduce((sum, item) => sum + Number(item?.qty || 0), 0);
  }

  if (orderBelongsToShop(order, normalizedShop)) {
    return getOrderItemsCount(order);
  }

  return 0;
}

function getTopProductsForShop(orders, shopKey) {
  const normalizedShop = normalizeShop(shopKey);
  const map = new Map();

  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];

    for (const item of items) {
      if (normalizeShop(item?.shop) !== normalizedShop) continue;

      const id = String(item?.id || item?.productId || item?.name || "").trim();
      const name =
        String(item?.name || "Unnamed Product").trim() || "Unnamed Product";

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

function buildDailySeries(orders, days = 7, shopKey = null) {
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

    if (shopKey) {
      if (!orderBelongsToShop(order, shopKey)) continue;
      current.orders += 1;
      current.revenue += getRevenueForShopFromOrder(order, shopKey);
    } else {
      current.orders += 1;
      current.revenue += getOrderTotal(order);
    }
  }

  return Array.from(map.values());
}

function buildShopPerformance(products, orders, options = {}) {
  const { activeShopOnly = null, restrictRevenueToOwnerId = null } = options;
  const bucket = new Map();

  const filteredProducts = activeShopOnly
    ? products.filter((product) => productBelongsToShop(product, activeShopOnly))
    : products;

  const filteredOrders = activeShopOnly
    ? orders.filter((order) => orderBelongsToShop(order, activeShopOnly))
    : orders;

  for (const product of filteredProducts) {
    const shop = normalizeShop(product.shop);

    if (!bucket.has(shop)) {
      bucket.set(shop, {
        key: shop,
        label: toShopLabel(shop),
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

  for (const order of filteredOrders) {
    const items = Array.isArray(order.items) ? order.items : [];

    for (const item of items) {
      const shop = normalizeShop(item?.shop);

      if (activeShopOnly && shop !== normalizeShop(activeShopOnly)) continue;

      if (
        restrictRevenueToOwnerId &&
        String(item?.ownerId || "").trim() !== String(restrictRevenueToOwnerId).trim()
      ) {
        continue;
      }

      if (!bucket.has(shop)) {
        bucket.set(shop, {
          key: shop,
          label: toShopLabel(shop),
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
      const name =
        String(item?.name || "Unnamed Product").trim() || "Unnamed Product";

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

async function deleteAllDocsInCollection(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  const docs = snap.docs;

  for (const item of docs) {
    await deleteDoc(doc(db, collectionName, item.id));
  }

  return docs.length;
}

export default function Analytics() {
  const { isSuperAdmin, isShopAdmin, adminShop, reauthenticate, user } = useAuth();

  const normalizedAdminShop = useMemo(() => normalizeShop(adminShop), [adminShop]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSelections, setResetSelections] = useState({
    orders: true,
    products: true,
    shopApplications: false,
    payoutRequests: false,
    subscriptions: false,
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const productsPromise =
          isShopAdmin && normalizedAdminShop
            ? getDocs(
                query(
                  collection(db, PRODUCTS_COLLECTION),
                  where("shop", "==", normalizedAdminShop)
                )
              ).catch(() => getDocs(collection(db, PRODUCTS_COLLECTION)))
            : getDocs(collection(db, PRODUCTS_COLLECTION));

        const ordersPromise =
          isShopAdmin && normalizedAdminShop
            ? getDocs(
                query(
                  collection(db, ORDERS_COLLECTION),
                  where("shops", "array-contains", normalizedAdminShop),
                  orderBy("createdAt", "desc"),
                  limit(300)
                )
              ).catch(() =>
                getDocs(
                  query(
                    collection(db, ORDERS_COLLECTION),
                    where("shops", "array-contains", normalizedAdminShop)
                  )
                )
              )
            : getDocs(
                query(
                  collection(db, ORDERS_COLLECTION),
                  orderBy("createdAt", "desc"),
                  limit(300)
                )
              ).catch(() => getDocs(collection(db, ORDERS_COLLECTION)));

        const usersPromise = isSuperAdmin
          ? getDocs(collection(db, USERS_COLLECTION)).catch(() => ({ docs: [] }))
          : Promise.resolve({ docs: [] });

        const [productsSnap, ordersSnap, usersSnap] = await Promise.all([
          productsPromise,
          ordersPromise,
          usersPromise,
        ]);

        if (!alive) return;

        let nextProducts = productsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        let nextOrders = ordersSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        const nextUsers = usersSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        if (isShopAdmin && normalizedAdminShop) {
          nextProducts = nextProducts.filter((product) =>
            productBelongsToShop(product, normalizedAdminShop)
          );

          nextOrders = nextOrders.filter((order) =>
            orderBelongsToShop(order, normalizedAdminShop)
          );
        }

        setProducts(nextProducts);
        setOrders(nextOrders);
        setUsers(nextUsers);
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
  }, [isShopAdmin, normalizedAdminShop, isSuperAdmin]);

  const metrics = useMemo(() => {
    const scopedProducts =
      isShopAdmin && normalizedAdminShop
        ? products.filter((product) =>
            productBelongsToShop(product, normalizedAdminShop)
          )
        : products;

    const scopedOrders =
      isShopAdmin && normalizedAdminShop
        ? orders.filter((order) => orderBelongsToShop(order, normalizedAdminShop))
        : orders;

    const totalProducts = scopedProducts.length;
    const inStockProducts = scopedProducts.filter((p) => p.inStock !== false).length;
    const featuredProducts = scopedProducts.filter((p) => !!p.featured).length;
    const totalOrders = scopedOrders.length;

    const totalRevenue = scopedOrders.reduce((sum, order) => {
      if (isShopAdmin && normalizedAdminShop) {
        return sum + getRevenueForShopFromOrder(order, normalizedAdminShop);
      }
      return sum + getOrderTotal(order);
    }, 0);

    const totalUnitsSold = scopedOrders.reduce((sum, order) => {
      if (isShopAdmin && normalizedAdminShop) {
        return sum + getUnitsForShopFromOrder(order, normalizedAdminShop);
      }
      return sum + getOrderItemsCount(order);
    }, 0);

    const activeCustomers = isSuperAdmin
      ? users.filter(
          (u) =>
            !["super_admin", "shop_admin", "admin"].includes(
              String(u.role || "").toLowerCase()
            )
        ).length
      : new Set(
          scopedOrders
            .map((order) => String(order.userId || "").trim())
            .filter(Boolean)
        ).size;

    const stockHealth =
      totalProducts > 0 ? Math.round((inStockProducts / totalProducts) * 100) : 0;

    const featuredCoverage =
      totalProducts > 0 ? Math.round((featuredProducts / totalProducts) * 100) : 0;

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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
  }, [products, orders, users, isSuperAdmin, isShopAdmin, normalizedAdminShop]);

  const dailySeries = useMemo(() => {
    return buildDailySeries(
      orders,
      7,
      isShopAdmin && normalizedAdminShop ? normalizedAdminShop : null
    );
  }, [orders, isShopAdmin, normalizedAdminShop]);

  const shopPerformance = useMemo(() => {
    if (isShopAdmin && normalizedAdminShop) {
      return buildShopPerformance(products, orders, {
        activeShopOnly: normalizedAdminShop,
      });
    }

    return buildShopPerformance(products, orders, {
      restrictRevenueToOwnerId: user?.uid || "__none__",
    });
  }, [products, orders, isShopAdmin, normalizedAdminShop, user?.uid]);

  const topProducts = useMemo(() => {
    if (isShopAdmin && normalizedAdminShop) {
      return getTopProductsForShop(orders, normalizedAdminShop);
    }
    return buildTopProducts(orders);
  }, [orders, isShopAdmin, normalizedAdminShop]);

  const revenueMax = Math.max(...dailySeries.map((item) => item.revenue), 1);
  const orderMax = Math.max(...dailySeries.map((item) => item.orders), 1);
  const shopRevenueMax = Math.max(
    ...shopPerformance.map((item) => item.estimatedRevenue),
    1
  );
  const topUnitsMax = Math.max(...topProducts.map((item) => item.units), 1);

  const pageTitle = isShopAdmin ? "Shop Analytics" : "Admin Analytics";
  const pageSub = isShopAdmin
    ? `Performance overview for ${toShopLabel(normalizedAdminShop)} only.`
    : "Marketplace overview. Product counts span all visible products, while store revenue in this view reflects only products uploaded by this super admin account.";

  const closeResetModal = () => {
    if (resetting) return;
    setResetOpen(false);
    setResetPassword("");
    setResetConfirmText("");
    setResetError("");
    setResetSelections({
      orders: true,
      products: true,
      shopApplications: false,
      payoutRequests: false,
      subscriptions: false,
    });
  };

  const handleResetSelection = (key) => {
    setResetSelections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleResetData = async () => {
    if (!isSuperAdmin) {
      setResetError("Only the super admin can reset marketplace data.");
      return;
    }

    if (!resetPassword.trim()) {
      setResetError("Enter your admin password.");
      return;
    }

    if (resetConfirmText.trim() !== RESET_CONFIRM_TEXT) {
      setResetError(`Type ${RESET_CONFIRM_TEXT} to confirm this reset.`);
      return;
    }

    const targets = Object.entries(resetSelections).filter(([, value]) => value);
    if (!targets.length) {
      setResetError("Select at least one data group to reset.");
      return;
    }

    setResetting(true);
    setResetError("");

    try {
      await reauthenticate(resetPassword.trim());

      for (const [key] of targets) {
        if (key === "orders") await deleteAllDocsInCollection("orders");
        if (key === "products") await deleteAllDocsInCollection("Products");
        if (key === "shopApplications") {
          await deleteAllDocsInCollection("shopApplications");
        }
        if (key === "payoutRequests") {
          await deleteAllDocsInCollection("payoutRequests");
        }
        if (key === "subscriptions") {
          await deleteAllDocsInCollection("subscriptions");
        }
      }

      setProducts((prev) => (resetSelections.products ? [] : prev));
      setOrders((prev) => (resetSelections.orders ? [] : prev));
      closeResetModal();
    } catch (err) {
      console.error("Analytics reset error:", err);
      const code = err?.code || "";
      let message = "Failed to reset selected data.";

      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        message = "Incorrect password. Reset cancelled.";
      } else if (err?.message) {
        message = err.message;
      }

      setResetError(message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-shell">
          <div className="analytics-head">
            <h1 className="analytics-title">{pageTitle}</h1>
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
            <h1 className="analytics-title">{pageTitle}</h1>
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
            <h1 className="analytics-title">{pageTitle}</h1>
            <p className="analytics-sub">{pageSub}</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {isSuperAdmin ? (
              <button
                type="button"
                className="analytics-head-pill"
                onClick={() => setResetOpen(true)}
                style={{ cursor: "pointer", border: "none" }}
              >
                Reset test data
              </button>
            ) : null}

            <div className="analytics-head-pill">
              {metrics.totalOrders} orders analysed
            </div>
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
            <strong className="analytics-metric-value">
              {metrics.activeCustomers}
            </strong>
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
                        width: `${Math.max(
                          (item.revenue / revenueMax) * 100,
                          item.revenue > 0 ? 8 : 0
                        )}%`,
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
                        width: `${Math.max(
                          (item.orders / orderMax) * 100,
                          item.orders > 0 ? 12 : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>{isShopAdmin ? "Shop performance" : "Store performance"}</h2>
              <span>
                {isShopAdmin
                  ? "Revenue by your storefront"
                  : "Revenue for super admin-uploaded products"}
              </span>
            </div>

            <div className="analytics-chart">
              {shopPerformance.length ? (
                shopPerformance.map((shop) => (
                  <div className="analytics-store-row" key={shop.key}>
                    <div className="analytics-store-meta">
                      <div>
                        <strong>{shop.label}</strong>
                        <span>
                          {shop.products} products • {shop.inStock} in stock •{" "}
                          {shop.featured} featured
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
                          width: `${Math.max(
                            (item.units / topUnitsMax) * 100,
                            item.units > 0 ? 12 : 0
                          )}%`,
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
            <strong className="analytics-summary-value">
              {metrics.featuredCoverage}%
            </strong>
            <p className="analytics-summary-text">
              Portion of your catalog currently highlighted for conversion.
            </p>
          </div>

          <div className="analytics-summary-card">
            <span className="analytics-summary-label">Catalog depth</span>
            <strong className="analytics-summary-value">{metrics.totalProducts}</strong>
            <p className="analytics-summary-text">
              Total products currently included in this analytics view.
            </p>
          </div>

          <div className="analytics-summary-card">
            <span className="analytics-summary-label">Customer activity</span>
            <strong className="analytics-summary-value">
              {metrics.activeCustomers}
            </strong>
            <p className="analytics-summary-text">
              {isShopAdmin
                ? "Unique customers who placed orders in your shop."
                : "Registered non-admin accounts currently in your database."}
            </p>
          </div>
        </section>
      </div>

      {resetOpen ? (
        <div
          className="admin-modal-backdrop"
          onClick={closeResetModal}
          role="presentation"
        >
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-reset-title"
          >
            <div className="admin-modal-head">
              <h3 id="analytics-reset-title" className="admin-modal-title">
                Reset test marketplace data
              </h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeResetModal}
                disabled={resetting}
                aria-label="Close reset modal"
              >
                ×
              </button>
            </div>

            <p className="admin-modal-text">
              This permanently deletes selected test data from Firestore.
            </p>

            <div className="admin-options-list" style={{ marginTop: 12 }}>
              <label className="admin-checkline">
                <input
                  type="checkbox"
                  checked={resetSelections.orders}
                  onChange={() => handleResetSelection("orders")}
                  disabled={resetting}
                />
                <span>Orders</span>
              </label>

              <label className="admin-checkline">
                <input
                  type="checkbox"
                  checked={resetSelections.products}
                  onChange={() => handleResetSelection("products")}
                  disabled={resetting}
                />
                <span>Products</span>
              </label>

              <label className="admin-checkline">
                <input
                  type="checkbox"
                  checked={resetSelections.shopApplications}
                  onChange={() => handleResetSelection("shopApplications")}
                  disabled={resetting}
                />
                <span>Shop applications</span>
              </label>

              <label className="admin-checkline">
                <input
                  type="checkbox"
                  checked={resetSelections.payoutRequests}
                  onChange={() => handleResetSelection("payoutRequests")}
                  disabled={resetting}
                />
                <span>Payout requests</span>
              </label>

              <label className="admin-checkline">
                <input
                  type="checkbox"
                  checked={resetSelections.subscriptions}
                  onChange={() => handleResetSelection("subscriptions")}
                  disabled={resetting}
                />
                <span>Subscriptions</span>
              </label>
            </div>

            <label className="admin-field">
              <span>Admin password</span>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                disabled={resetting}
              />
            </label>

            <label className="admin-field">
              <span>Type {RESET_CONFIRM_TEXT} to confirm</span>
              <input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder={RESET_CONFIRM_TEXT}
                disabled={resetting}
              />
            </label>

            {resetError ? <div className="admin-msg">❌ {resetError}</div> : null}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={closeResetModal}
                disabled={resetting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-danger-btn"
                onClick={handleResetData}
                disabled={resetting}
              >
                {resetting ? "Resetting…" : "Verify and reset"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
import { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import {
  collection, query, where, getDocs, orderBy,
  onSnapshot, doc, limit,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateRange(days) {
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function daysBetween(start, end) {
  const days = [];
  const cur  = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function useAnalyticsData(periodDays = 7) {
  const { user }    = useAuth();
  const { storeId, shop } = useSellerAuth();
  const sellerId    = user?.uid;

  const [orders,        setOrders]        = useState([]);
  const [dailyTracking, setDailyTracking] = useState([]);
  const [productViews,  setProductViews]  = useState({});
  const [liveVisitors,  setLiveVisitors]  = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  /* ── Fetch orders for this seller ── */
  useEffect(() => {
    if (!sellerId) { setLoading(false); return; }
    const { start } = dateRange(periodDays);
    setLoading(true);

    const q = query(
      collection(db, "orders"),
      where("shops", "array-contains", sellerId),
      orderBy("createdAt", "desc")
    );

    getDocs(q).then(snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(all.filter(o => {
        const ts = o.createdAt?.toMillis?.() || o.createdAt?.seconds * 1000 || 0;
        return ts >= start.getTime();
      }));
      setLoading(false);
    }).catch(e => {
      console.error("[useAnalyticsData] orders:", e);
      setLoading(false);
    });
  }, [sellerId, periodDays]);

  /* ── Fetch daily tracking (visits, productViews) ── */
  useEffect(() => {
    const sid = storeId || sellerId;
    if (!sid) return;
    const { start } = dateRange(periodDays);
    const startKey  = start.toISOString().split("T")[0];

    getDocs(
      query(collection(db, "sellerAnalytics", sid, "daily"), orderBy("date", "asc"))
    ).then(snap => {
      const docs = snap.docs
        .map(d => d.data())
        .filter(d => d.date >= startKey);
      setDailyTracking(docs);
    }).catch(() => {});

    // Product views
    getDocs(
      query(collection(db, "productAnalytics"), where("shopId", "==", sid))
    ).then(snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setProductViews(map);
    }).catch(() => {});
  }, [storeId, sellerId, periodDays]);

  /* ── Live visitors ── */
  useEffect(() => {
    const sid = storeId || sellerId;
    if (!sid) return;
    const unsub = onSnapshot(
      collection(db, "storePresence", sid, "visitors"),
      snap => setLiveVisitors(snap.size),
      () => {}
    );
    return unsub;
  }, [storeId, sellerId]);

  /* ── Computed metrics ── */
  const computed = useMemo(() => {
    const { start, end } = dateRange(periodDays);
    const days           = daysBetween(start, end);

    // Daily series
    const seriesMap = {};
    days.forEach(d => {
      const key = d.toISOString().split("T")[0];
      seriesMap[key] = {
        label:    `${d.getMonth() + 1}/${d.getDate()}`,
        dayLabel: DAY_LABELS[d.getDay()],
        date:     key,
        revenue:  0,
        orders:   0,
        visitors: 0,
        productViews: 0,
      };
    });

    // Fill from tracking
    dailyTracking.forEach(d => {
      if (seriesMap[d.date]) {
        seriesMap[d.date].visitors     = d.visits         || 0;
        seriesMap[d.date].productViews = d.productViews   || 0;
      }
    });

    // Fill from orders
    const customerSet = new Set();
    const productMap  = {}; // productId → { name, revenue, orders, views }
    let totalRevenue  = 0;
    let totalOrders   = 0;
    const customerSpend = {}; // userId → { name, total, count }
    const repeats       = new Set();

    orders.forEach(o => {
      const ts  = o.createdAt?.toMillis?.() || (o.createdAt?.seconds || 0) * 1000;
      const key = new Date(ts).toISOString().split("T")[0];
      const rev = Number(o.pricing?.total || 0);

      if (seriesMap[key]) {
        seriesMap[key].revenue += rev;
        seriesMap[key].orders  += 1;
      }

      totalRevenue += rev;
      totalOrders  += 1;
      const uid = o.userId || o.customer?.email || "anon";
      if (customerSet.has(uid)) repeats.add(uid);
      customerSet.add(uid);

      // Customer spend
      if (uid) {
        if (!customerSpend[uid]) {
          customerSpend[uid] = {
            name:  o.customer?.firstName ? `${o.customer.firstName} ${o.customer.lastName || ""}`.trim() : "Customer",
            email: o.customer?.email || "",
            total: 0,
            count: 0,
          };
        }
        customerSpend[uid].total += rev;
        customerSpend[uid].count += 1;
      }

      // Product breakdown
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach(item => {
        const pid  = item.productId || item.id || "unknown";
        const name = item.name || item.productName || "Product";
        if (!productMap[pid]) productMap[pid] = { id: pid, name, revenue: 0, orders: 0 };
        productMap[pid].revenue += Number(item.price || 0) * Number(item.qty || 1);
        productMap[pid].orders  += 1;
      });
    });

    // Merge product views
    Object.entries(productMap).forEach(([pid, p]) => {
      p.views = productViews[pid]?.totalViews || 0;
      p.convRate = p.views > 0 ? ((p.orders / p.views) * 100).toFixed(1) + "%" : "—";
    });

    const series = Object.values(seriesMap);
    const totalVisitors   = series.reduce((s, d) => s + d.visitors, 0);
    const conversionRate  = totalVisitors > 0 ? ((totalOrders / totalVisitors) * 100).toFixed(1) : 0;
    const uniqueCustomers = customerSet.size;
    const repeatRate      = uniqueCustomers > 0 ? ((repeats.size / uniqueCustomers) * 100).toFixed(0) : 0;
    const avgOrderValue   = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00";

    // Day of week revenue
    const dowMap = { Sun:0, Mon:0, Tue:0, Wed:0, Thu:0, Fri:0, Sat:0 };
    series.forEach(d => { dowMap[d.dayLabel] = (dowMap[d.dayLabel] || 0) + d.revenue; });
    const byDayOfWeek = DAY_LABELS.map(d => ({ day: d, revenue: dowMap[d] || 0 }));

    // Top products
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // Top customers
    const topCustomers = Object.values(customerSpend)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Payout forecast (80% of pending revenue — rough estimate)
    const pendingRevenue = orders
      .filter(o => ["paid","approved"].includes(o.status))
      .reduce((s, o) => s + Number(o.pricing?.total || 0), 0);

    return {
      series,
      totalRevenue,
      totalOrders,
      totalVisitors,
      uniqueCustomers,
      conversionRate,
      repeatRate,
      avgOrderValue,
      byDayOfWeek,
      topProducts,
      topCustomers,
      pendingRevenue,
      forecastRevenue: (pendingRevenue * 0.8).toFixed(2),
    };
  }, [orders, dailyTracking, productViews, periodDays]);

  return {
    ...computed,
    liveVisitors,
    loading,
    error,
    rawOrders: orders,
  };
}

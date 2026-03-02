// src/pages/AdminAnalytics.jsx
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import "./AdminAnalytics.css";

function formatMoney(n) {
  return `GHS ${Number(n || 0).toFixed(2)}`;
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("en-GH", {
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function AdminAnalytics() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "Orders"),
      where("paid", "==", true)
    );

    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // ------------------------------
  // BASIC METRICS
  // ------------------------------

  const totalRevenue = useMemo(() => {
    return orders.reduce(
      (sum, o) => sum + (o.amounts?.total || 0),
      0
    );
  }, [orders]);

  const totalOrders = orders.length;

  const averageOrderValue =
    totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const thisMonthRevenue = useMemo(() => {
    const now = new Date();
    return orders.reduce((sum, o) => {
      const created = o.createdAt?.toDate?.();
      if (!created) return sum;

      if (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      ) {
        return sum + (o.amounts?.total || 0);
      }

      return sum;
    }, 0);
  }, [orders]);

  // ------------------------------
  // MONTHLY AGGREGATION (LAST 6)
  // ------------------------------

  const monthlyData = useMemo(() => {
    const map = new Map();

    orders.forEach((o) => {
      const created = o.createdAt?.toDate?.();
      if (!created) return;

      const key = monthKey(created);
      const prev = map.get(key) || {
        total: 0,
        label: monthLabel(created),
      };

      prev.total += o.amounts?.total || 0;
      map.set(key, prev);
    });

    return Array.from(map.values())
      .sort((a, b) => new Date(a.label) - new Date(b.label))
      .slice(-6);
  }, [orders]);

  const maxBar = Math.max(...monthlyData.map((m) => m.total), 1);

  // ------------------------------
  // STATUS COUNTS
  // ------------------------------

  const statusCounts = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const s = o.status || "unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [orders]);

  return (
    <div className="admin-analytics">
      <h1>Revenue Analytics</h1>

      {/* KPI Cards */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-label">Total Revenue</div>
          <div className="analytics-value">
            {formatMoney(totalRevenue)}
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-label">Total Orders</div>
          <div className="analytics-value">{totalOrders}</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-label">
            Avg Order Value
          </div>
          <div className="analytics-value">
            {formatMoney(averageOrderValue)}
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-label">
            This Month Revenue
          </div>
          <div className="analytics-value">
            {formatMoney(thisMonthRevenue)}
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="analytics-section">
        <h3>Revenue (Last 6 Months)</h3>

        <div className="bar-chart">
          {monthlyData.map((m, i) => (
            <div key={i} className="bar-item">
              <div
                className="bar"
                style={{
                  height: `${(m.total / maxBar) * 180}px`,
                }}
              />
              <div className="bar-label">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="analytics-section">
        <h3>Order Status</h3>

        <div className="status-list">
          {Object.entries(statusCounts).map(([k, v]) => (
            <div key={k} className="status-row">
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
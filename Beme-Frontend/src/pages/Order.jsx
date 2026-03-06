import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import "./Orders.css";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setOrders(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, [user]);

  if (!user) {
    return (
      <div className="orders-page">
        <h1>Orders</h1>
        <p>Please login to see your orders.</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <h1>Orders</h1>

      {orders.length === 0 && (
        <div className="orders-empty">
          No orders yet.
        </div>
      )}

      {orders.map((order) => (
        <div key={order.id} className="order-card">
          <div className="order-row">
            <span>Order</span>
            <strong>#{order.id.slice(0,8)}</strong>
          </div>

          <div className="order-row">
            <span>Status</span>
            <strong>{order.status}</strong>
          </div>

          <div className="order-row">
            <span>Total</span>
            <strong>GHS {order.pricing?.total?.toFixed(2)}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
// src/pages/Checkout.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { startPaystackCheckout } from "../lib/checkout";
import "./Checkout.css";

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();

  const [method, setMethod] = useState("paystack");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    region: "",
    city: "",
    area: "",
    notes: "",
  });

  // UI-only subtotal (display). NOT trusted for Paystack.
  const subtotalUI = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const validateRequired = () => {
    if (!form.email) return "Email is required";
    if (!form.firstName) return "First name is required";
    if (!form.phone) return "Phone is required";
    if (!form.address) return "Address is required";
    if (!cartItems.length) return "Your cart is empty";
    return null;
  };

  const placeCOD = async () => {
    const err = validateRequired();
    if (err) return alert(err);

    setLoading(true);
    try {
      // NOTE: COD can stay client-created for now.
      // For maximum security, you can also move COD order creation to backend later.
      await addDoc(collection(db, "orders"), {
        customer: form,
        items: cartItems.map((i) => ({ id: i.id, qty: i.qty || 1 })), // store minimal
        paymentMethod: "cod",
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      clearCart();
      navigate("/order-success");
    } catch (e) {
      console.error(e);
      alert("Failed to place order. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const payWithPaystack = async () => {
    const err = validateRequired();
    if (err) return alert(err);

    setLoading(true);
    try {
      // ✅ Secure: backend computes amount using Firestore Admin prices
      await startPaystackCheckout({
        email: form.email,
        cartItems,
        customer: form, // shipping/contact info stored server-side in order
      });

      // no further code; browser redirects to Paystack
    } catch (e) {
      console.error(e);
      alert(e?.message || "Paystack init failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="checkout">
      <div className="checkout-container">
        <h1 className="checkout-title">Checkout</h1>

        <div className="checkout-grid">
          <div className="checkout-form">
            <h3>Contact</h3>
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={loading}
            />

            <h3>Shipping address</h3>

            <select value="Ghana" disabled>
              <option>Ghana</option>
            </select>

            <div className="row-2">
              <input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                disabled={loading}
              />
              <input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                disabled={loading}
              />
            </div>

            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              disabled={loading}
            />

            <div className="row-2">
              <input
                placeholder="Region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                disabled={loading}
              />
              <input
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                disabled={loading}
              />
            </div>

            <input
              placeholder="Area"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              disabled={loading}
            />

            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={loading}
            />

            <h3>Payment method</h3>

            <div className="payment-options">
              <button
                type="button"
                className={method === "paystack" ? "chip active" : "chip"}
                onClick={() => setMethod("paystack")}
                disabled={loading}
              >
                Paystack
              </button>

              <button
                type="button"
                className={method === "cod" ? "chip active" : "chip"}
                onClick={() => setMethod("cod")}
                disabled={loading}
              >
                Pay on Delivery
              </button>
            </div>

            {method === "cod" ? (
              <button className="primary-btn" onClick={placeCOD} disabled={loading}>
                {loading ? "Placing order..." : "Place Order"}
              </button>
            ) : (
              <button className="primary-btn" onClick={payWithPaystack} disabled={loading}>
                {loading ? "Redirecting..." : "Pay with Paystack"}
              </button>
            )}
          </div>

          <div className="checkout-summary">
            <h3>Order Summary</h3>

            {cartItems.map((item) => (
              <div key={item.id} className="summary-item">
                <div>
                  <p>{item.name}</p>
                  <small>x{item.qty}</small>
                </div>
                <p>GHS {(Number(item.price) * Number(item.qty)).toFixed(2)}</p>
              </div>
            ))}

            <div className="summary-total">
              <span>Total</span>
              {/* UI display only — backend is authoritative */}
              <strong>GHS {subtotalUI.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { paystackInit } from "../services/api"; // ✅ NEW
import "./Checkout.css";

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();

  const [method, setMethod] = useState("paystack");
  const [loading, setLoading] = useState(false); // ✅ NEW

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

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.qty),
      0
    );
  }, [cartItems]);

  const total = subtotal;

  const validateRequired = () => {
    if (!form.email) return "Email is required";
    if (!form.firstName) return "First name is required";
    if (!form.phone) return "Phone is required";
    if (!form.address) return "Address is required";
    if (!cartItems.length) return "Your cart is empty";
    return null;
  };

  // ✅ COD stays the same (but includes basic validation)
  const placeCOD = async () => {
    const err = validateRequired();
    if (err) return alert(err);

    setLoading(true);
    try {
      await addDoc(collection(db, "Orders"), {
        customer: form,
        items: cartItems,
        total,
        paymentMethod: "cod",
        status: "cod_pending",
        createdAt: serverTimestamp(),
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

  // ✅ NEW: Paystack flow (create order doc -> init -> redirect)
  const payWithPaystack = async () => {
    const err = validateRequired();
    if (err) return alert(err);

    setLoading(true);
    try {
      // 1) Create order first so we have orderId
      const docRef = await addDoc(collection(db, "Orders"), {
        customer: form,
        items: cartItems,
        total,
        paymentMethod: "paystack",
        status: "paystack_pending",
        createdAt: serverTimestamp(),
      });

      const orderId = docRef.id;

      // 2) Initialize Paystack on backend (Render)
      const { data } = await paystackInit({
        email: form.email,
        amountGHS: total,
        orderId,
      });

      if (!data?.authorizationUrl) {
        throw new Error("Missing Paystack authorization URL");
      }

      // 3) Redirect to Paystack hosted checkout
      window.location.href = data.authorizationUrl;
    } catch (e) {
      console.error(e);
      alert("Paystack init failed. Please try again.");

      // Optional: you can update order to failed here if you want
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout">
      <div className="checkout-container">
        <h1 className="checkout-title">Checkout</h1>

        <div className="checkout-grid">
          {/* LEFT SIDE FORM */}
          <div className="checkout-form">
            <h3>Contact</h3>
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              />
              <input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>

            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            <div className="row-2">
              <input
                placeholder="Region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
              <input
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <input
              placeholder="Area"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />

            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                {loading ? "Redirecting..." : `Pay GHS ${total.toFixed(2)}`}
              </button>
            )}
          </div>

          {/* RIGHT SIDE SUMMARY */}
          <div className="checkout-summary">
            <h3>Order Summary</h3>

            {cartItems.map((item) => (
              <div key={item.id} className="summary-item">
                <div>
                  <p>{item.name}</p>
                  <small>x{item.qty}</small>
                </div>
                <p>GHS {(item.price * item.qty).toFixed(2)}</p>
              </div>
            ))}

            <div className="summary-total">
              <span>Total</span>
              <strong>GHS {total.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
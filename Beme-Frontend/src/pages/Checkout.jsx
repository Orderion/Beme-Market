import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import "./Checkout.css";

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();

  const [method, setMethod] = useState("paystack");

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

  const placeCOD = async () => {
    if (!form.firstName || !form.phone || !form.address) {
      return alert("Please complete required fields");
    }

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
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <h3>Shipping address</h3>

            <select
              value="Ghana"
              disabled
            >
              <option>Ghana</option>
            </select>

            <div className="row-2">
              <input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
              <input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
              />
            </div>

            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />

            <div className="row-2">
              <input
                placeholder="Region"
                value={form.region}
                onChange={(e) =>
                  setForm({ ...form, region: e.target.value })
                }
              />
              <input
                placeholder="City"
                value={form.city}
                onChange={(e) =>
                  setForm({ ...form, city: e.target.value })
                }
              />
            </div>

            <input
              placeholder="Area"
              value={form.area}
              onChange={(e) =>
                setForm({ ...form, area: e.target.value })
              }
            />

            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
            />

            <h3>Payment method</h3>

            <div className="payment-options">
              <button
                type="button"
                className={method === "paystack" ? "chip active" : "chip"}
                onClick={() => setMethod("paystack")}
              >
                Paystack
              </button>

              <button
                type="button"
                className={method === "cod" ? "chip active" : "chip"}
                onClick={() => setMethod("cod")}
              >
                Pay on Delivery
              </button>
            </div>

            {method === "cod" ? (
              <button className="primary-btn" onClick={placeCOD}>
                Place Order
              </button>
            ) : (
              <button className="primary-btn">
                Pay GHS {total.toFixed(2)}
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
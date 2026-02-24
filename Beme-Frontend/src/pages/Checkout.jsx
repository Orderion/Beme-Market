import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useCart } from "../context/CartContext";

function loadPaystack() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Paystack failed to load"));
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();

  const [method, setMethod] = useState("paystack"); // or "cod"
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    region: "",
    notes: "",
  });

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + Number(it.price) * Number(it.qty), 0);
  }, [cartItems]);

  const total = subtotal; // later add shipping

  const validate = () => {
    if (!cartItems.length) return "Your cart is empty.";
    if (!form.fullName.trim()) return "Full name is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!form.address.trim()) return "Delivery address is required.";
    if (method === "paystack" && !form.email.trim()) return "Email is required for Paystack.";
    return null;
  };

  const createOrder = async (extra) => {
    return await addDoc(collection(db, "Orders"), {
      customer: {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || "",
        address: form.address,
        city: form.city || "",
        region: form.region || "",
        notes: form.notes || "",
      },
      items: cartItems.map((i) => ({
        id: i.id,
        name: i.name,
        price: Number(i.price),
        qty: Number(i.qty),
        image: i.image || "",
      })),
      currency: "GHS",
      subtotal: Number(subtotal),
      total: Number(total),
      paymentMethod: method, // "paystack" or "cod"
      status: extra?.status || "pending",
      paystackRef: extra?.paystackRef || "",
      createdAt: serverTimestamp(),
    });
  };

  const handleCOD = async () => {
    const err = validate();
    if (err) return alert(err);

    setLoading(true);
    try {
      await createOrder({ status: "cod_pending" });
      clearCart();
      navigate("/order-success");
    } catch (e) {
      console.error(e);
      alert("Could not place order. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaystack = async () => {
    const err = validate();
    if (err) return alert(err);

    setLoading(true);
    try {
      await loadPaystack();

      const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY; // set in .env
      if (!key) {
        alert("Missing VITE_PAYSTACK_PUBLIC_KEY in .env");
        setLoading(false);
        return;
      }

      const amountPesewas = Math.round(Number(total) * 100); // GHS -> pesewas
      const reference = `BEME_${Date.now()}`;

      const handler = window.PaystackPop.setup({
        key,
        email: form.email,
        amount: amountPesewas,
        currency: "GHS",
        ref: reference,
        metadata: {
          custom_fields: [{ display_name: "Phone", variable_name: "phone", value: form.phone }],
        },
        callback: async function () {
          // NOTE: In real production you should VERIFY payment on your backend.
          await createOrder({ status: "paid", paystackRef: reference });
          clearCart();
          navigate("/order-success");
        },
        onClose: function () {
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (e) {
      console.error(e);
      alert("Paystack error. Check console.");
      setLoading(false);
    }
  };

  return (
    <div className="co">
      <h1 className="coTitle">Checkout</h1>

      <div className="coGrid">
        <div className="coForm">
          <label>Full name</label>
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />

          <label>Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

          <label>Email (required for Paystack)</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

          <label>Address</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

          <div className="coTwo">
            <div>
              <label>City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label>Region</label>
              <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </div>
          </div>

          <label>Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="coPay">
            <button
              className={method === "paystack" ? "chip active" : "chip"}
              onClick={() => setMethod("paystack")}
              type="button"
            >
              Paystack
            </button>

            <button
              className={method === "cod" ? "chip active" : "chip"}
              onClick={() => setMethod("cod")}
              type="button"
            >
              Pay on delivery
            </button>
          </div>

          {method === "cod" ? (
            <button className="btnPrimary" disabled={loading} onClick={handleCOD}>
              {loading ? "Placing order…" : "Place order"}
            </button>
          ) : (
            <button className="btnPrimary" disabled={loading} onClick={handlePaystack}>
              {loading ? "Opening Paystack…" : `Pay GHS ${Number(total).toFixed(2)}`}
            </button>
          )}
        </div>

        <div className="coSummary">
          <h2>Order Summary</h2>
          {cartItems.map((it) => (
            <div key={it.id} className="coItem">
              <div className="coItemName">{it.name}</div>
              <div className="coItemMeta">
                x{it.qty} · GHS {(Number(it.price) * Number(it.qty)).toFixed(2)}
              </div>
            </div>
          ))}

          <div className="coTotal">
            <span>Total</span>
            <span>GHS {Number(total).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
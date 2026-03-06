import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { startPaystackCheckout } from "../lib/checkout";
import "./Checkout.css";

const SPECIAL_REGIONS = new Set([
  "Ashanti",
  "Greater Accra",
  "Eastern",
  "Western",
]);

const GH_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
];

const CITY_MAP = {
  "Greater Accra": ["Accra", "Tema", "Madina", "Adenta", "Kasoa"],
  Ashanti: ["Kumasi", "Obuasi", "Ejisu", "Mampong", "Konongo"],
  Eastern: ["Koforidua", "Nsawam", "Nkawkaw", "Akosombo", "Akim Oda"],
  Western: ["Sekondi-Takoradi", "Tarkwa", "Axim", "Prestea", "Elubo"],
};

const DEFAULT_OTHER_CITIES = ["Other"];
const CHECKOUT_DURATION_SECONDS = 10 * 60;

const INITIAL_FORM = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  region: "",
  city: "",
  area: "",
  notes: "",
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

function isValidName(value) {
  const s = String(value || "").trim();
  if (s.length < 2) return false;
  return /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(s);
}

function isValidGhanaAddress(value) {
  const s = String(value || "").trim();
  if (s.length < 6) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  return /^[A-Za-z0-9\s,./#-]+$/.test(s);
}

function normalizeGhanaPhone(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (/^\+233\d{9}$/.test(s)) return "0" + s.slice(4);
  if (/^233\d{9}$/.test(s)) return "0" + s.slice(3);
  if (/^0\d{9}$/.test(s)) return s;

  return null;
}

const PREFIX_TO_NETWORK = [
  { prefix: "024", network: "MTN" },
  { prefix: "025", network: "MTN" },
  { prefix: "053", network: "MTN" },
  { prefix: "054", network: "MTN" },
  { prefix: "055", network: "MTN" },
  { prefix: "059", network: "MTN" },

  { prefix: "020", network: "Telecel" },
  { prefix: "050", network: "Telecel" },

  { prefix: "026", network: "AirtelTigo" },
  { prefix: "056", network: "AirtelTigo" },
  { prefix: "027", network: "AirtelTigo" },
  { prefix: "057", network: "AirtelTigo" },
];

function detectNetwork(local10) {
  if (!local10) return null;
  const p = local10.slice(0, 3);
  return PREFIX_TO_NETWORK.find((x) => x.prefix === p)?.network || null;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();

  const [method, setMethod] = useState("paystack");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [timeLeft, setTimeLeft] = useState(CHECKOUT_DURATION_SECONDS);
  const [sessionExpired, setSessionExpired] = useState(false);

  const subtotalUI = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const deliveryFeeUI = useMemo(() => {
    if (!form.region) return 0;
    return SPECIAL_REGIONS.has(form.region) ? 0 : 50;
  }, [form.region]);

  const totalUI = useMemo(() => subtotalUI + deliveryFeeUI, [subtotalUI, deliveryFeeUI]);

  const citiesForRegion = useMemo(() => {
    if (!form.region) return [];
    return CITY_MAP[form.region] || DEFAULT_OTHER_CITIES;
  }, [form.region]);

  const normalizedPhone = useMemo(() => normalizeGhanaPhone(form.phone), [form.phone]);
  const network = useMemo(() => detectNetwork(normalizedPhone), [normalizedPhone]);

  const isFinalMinute = timeLeft <= 60 && !sessionExpired;
  const inputsDisabled = loading || sessionExpired;
  const formattedTimeLeft = formatTime(timeLeft);

  useEffect(() => {
    if (sessionExpired) return;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setSessionExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sessionExpired]);

  const setField = (key) => (e) => {
    if (sessionExpired) return;

    const value = e.target.value;

    if (key === "region") {
      setForm((p) => ({ ...p, region: value, city: "" }));
      return;
    }

    setForm((p) => ({ ...p, [key]: value }));
  };

  const markTouched = (key) => () => setTouched((p) => ({ ...p, [key]: true }));

  const validate = (v) => {
    const next = {};

    if (!v.email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(v.email)) next.email = "Enter a valid email (e.g., name@gmail.com).";

    if (!v.firstName.trim()) next.firstName = "First name is required.";
    else if (!isValidName(v.firstName)) next.firstName = "Use letters only (spaces/hyphen allowed).";

    if (!v.lastName.trim()) next.lastName = "Last name is required.";
    else if (!isValidName(v.lastName)) next.lastName = "Use letters only (spaces/hyphen allowed).";

    if (!v.address.trim()) next.address = "Address is required (House No., Street, Landmark).";
    else if (!isValidGhanaAddress(v.address)) {
      next.address = "Use a valid address (e.g., Hse 12, Ring Rd, near ...).";
    }

    if (!v.region) next.region = "Select a region.";
    if (!v.city) next.city = "Select a city.";

    if (!v.area.trim()) next.area = "Area/Locality is required (e.g., East Legon, Adum).";
    else if (v.area.trim().length < 2) next.area = "Area is too short.";

    if (!v.phone.trim()) next.phone = "Phone is required.";
    else if (!normalizedPhone) next.phone = "Use 0XXXXXXXXX or +233XXXXXXXXX.";
    else if (!network) next.phone = "Phone must be MTN, Telecel, or AirtelTigo.";

    if (!cartItems.length) next.cart = "Your cart is empty.";

    return next;
  };

  useEffect(() => {
    setErrors(validate(form));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.email,
    form.firstName,
    form.lastName,
    form.phone,
    form.address,
    form.region,
    form.city,
    form.area,
    cartItems.length,
  ]);

  const showError = (key) => touched[key] && errors[key];

  const validateRequired = () => {
    if (sessionExpired) {
      alert("Checkout session expired. Please restart checkout.");
      return "Checkout session expired.";
    }

    const next = validate(form);
    setErrors(next);

    setTouched({
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
      region: true,
      city: true,
      area: true,
    });

    const msg = Object.values(next)[0] || null;
    return msg;
  };

  const restartCheckout = () => {
    setForm(INITIAL_FORM);
    setTouched({});
    setErrors({});
    setMethod("paystack");
    setLoading(false);
    setSessionExpired(false);
    setTimeLeft(CHECKOUT_DURATION_SECONDS);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildOrderPayload = () => {
    return {
      userId: user?.uid || null,
      customer: {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: normalizedPhone,
        address: form.address.trim(),
        region: form.region,
        city: form.city,
        area: form.area.trim(),
        notes: form.notes?.trim() || "",
        country: "Ghana",
        network,
      },
      items: cartItems.map((item) => ({
        id: item.id || "",
        name: item.name || "",
        price: Number(item.price) || 0,
        qty: Number(item.qty) || 1,
        image: item.image || "",
      })),
      pricing: {
        subtotal: subtotalUI,
        deliveryFee: deliveryFeeUI,
        total: totalUI,
        currency: "GHS",
      },
      paymentMethod: method === "cod" ? "cod" : "paystack",
      paymentStatus: method === "cod" ? "pending" : "pending",
      status: method === "cod" ? "pending" : "pending_payment",
      source: "web",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  };

  const placeCOD = async () => {
    const err = validateRequired();
    if (err) return;

    setLoading(true);

    try {
      const payload = buildOrderPayload();
      await addDoc(collection(db, "orders"), payload);

      clearCart();
      navigate("/order-success");
    } catch (e) {
      console.error("COD order failed:", e);
      alert(
        e?.message ? `Failed to place order: ${e.message}` : "Failed to place order. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const payWithPaystack = async () => {
    const err = validateRequired();
    if (err) return;

    setLoading(true);
    try {
      await startPaystackCheckout({
        email: form.email.trim(),
        cartItems,
        customer: {
          ...form,
          country: "Ghana",
          phone: normalizedPhone,
          network,
          deliveryFee: deliveryFeeUI,
          userId: user?.uid || null,
        },
      });
    } catch (e) {
      console.error(e);
      alert(e?.message || "Paystack init failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="checkout">
      <div className="checkout-container">
        <div
          className={[
            "checkout-timer",
            isFinalMinute ? "is-warning" : "",
            sessionExpired ? "is-expired" : "",
          ]
            .join(" ")
            .trim()}
        >
          <div className="checkout-timer__left">
            <span className="checkout-timer__eyebrow">Checkout timer</span>
            <strong className="checkout-timer__time">{formattedTimeLeft}</strong>
          </div>

          <div className="checkout-timer__right">
            {sessionExpired ? (
              <>
                <p className="checkout-timer__message">
                  Your checkout session has expired. Please restart checkout to continue.
                </p>
                <button
                  type="button"
                  className="checkout-timer__action"
                  onClick={restartCheckout}
                >
                  Restart Checkout
                </button>
              </>
            ) : (
              <p className="checkout-timer__message">
                {isFinalMinute
                  ? "Final minute — complete your order now before the session locks."
                  : "Complete your order within 10 minutes to keep this checkout session active."}
              </p>
            )}
          </div>
        </div>

        <h1 className="checkout-title">Checkout</h1>

        <div className="checkout-grid">
          <div className="checkout-form">
            {!!errors.cart && (
              <div className="field-error" style={{ marginBottom: 14 }}>
                {errors.cart}
              </div>
            )}

            <h3>Contact</h3>
            <input
              placeholder="Email"
              value={form.email}
              onBlur={markTouched("email")}
              onChange={setField("email")}
              disabled={inputsDisabled}
            />
            {showError("email") ? <div className="field-error">{errors.email}</div> : null}

            <h3>Shipping address</h3>

            <select value="Ghana" disabled>
              <option>Ghana</option>
            </select>

            <div className="row-2">
              <div>
                <input
                  placeholder="First name"
                  value={form.firstName}
                  onBlur={markTouched("firstName")}
                  onChange={setField("firstName")}
                  disabled={inputsDisabled}
                />
                {showError("firstName") ? (
                  <div className="field-error">{errors.firstName}</div>
                ) : null}
              </div>

              <div>
                <input
                  placeholder="Last name"
                  value={form.lastName}
                  onBlur={markTouched("lastName")}
                  onChange={setField("lastName")}
                  disabled={inputsDisabled}
                />
                {showError("lastName") ? (
                  <div className="field-error">{errors.lastName}</div>
                ) : null}
              </div>
            </div>

            <input
              placeholder="Address (House No., Street, Landmark)"
              value={form.address}
              onBlur={markTouched("address")}
              onChange={setField("address")}
              disabled={inputsDisabled}
            />
            {showError("address") ? <div className="field-error">{errors.address}</div> : null}

            <div className="row-2">
              <div>
                <select
                  value={form.region}
                  onBlur={markTouched("region")}
                  onChange={setField("region")}
                  disabled={inputsDisabled}
                >
                  <option value="">Select region</option>
                  {GH_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {showError("region") ? <div className="field-error">{errors.region}</div> : null}
              </div>

              <div>
                <select
                  value={form.city}
                  onBlur={markTouched("city")}
                  onChange={setField("city")}
                  disabled={inputsDisabled || !form.region}
                >
                  <option value="">{form.region ? "Select city" : "Select region first"}</option>
                  {citiesForRegion.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {showError("city") ? <div className="field-error">{errors.city}</div> : null}
              </div>
            </div>

            <input
              placeholder="Area / Locality (e.g., East Legon)"
              value={form.area}
              onBlur={markTouched("area")}
              onChange={setField("area")}
              disabled={inputsDisabled}
            />
            {showError("area") ? <div className="field-error">{errors.area}</div> : null}

            <input
              placeholder="Phone (0XXXXXXXXX or +233XXXXXXXXX)"
              value={form.phone}
              onBlur={markTouched("phone")}
              onChange={setField("phone")}
              disabled={inputsDisabled}
            />
            {showError("phone") ? <div className="field-error">{errors.phone}</div> : null}

            {normalizedPhone && network ? (
              <div className="field-hint">
                Network detected: <b>{network}</b> ({normalizedPhone})
              </div>
            ) : null}

            <h3>Payment method</h3>

            <div className="payment-options">
              <button
                type="button"
                className={method === "paystack" ? "chip active" : "chip"}
                onClick={() => setMethod("paystack")}
                disabled={inputsDisabled}
              >
                Paystack
              </button>

              <button
                type="button"
                className={method === "cod" ? "chip active" : "chip"}
                onClick={() => setMethod("cod")}
                disabled={inputsDisabled}
              >
                Pay on Delivery
              </button>
            </div>

            {method === "cod" ? (
              <button
                className="primary-btn"
                onClick={placeCOD}
                disabled={inputsDisabled || !!errors.cart}
              >
                {loading ? "Placing order..." : "Place Order"}
              </button>
            ) : (
              <button
                className="primary-btn"
                onClick={payWithPaystack}
                disabled={inputsDisabled || !!errors.cart}
              >
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

            <div className="summary-line">
              <span>Subtotal</span>
              <span>GHS {subtotalUI.toFixed(2)}</span>
            </div>

            <div className="summary-line">
              <span>
                Delivery
                {form.region ? (
                  <small style={{ display: "block", opacity: 0.7 }}>
                    {SPECIAL_REGIONS.has(form.region) ? "Special region" : "Outside special regions (+50)"}
                  </small>
                ) : (
                  <small style={{ display: "block", opacity: 0.7 }}>Select region to calculate</small>
                )}
              </span>
              <span>GHS {deliveryFeeUI.toFixed(2)}</span>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <strong>GHS {totalUI.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
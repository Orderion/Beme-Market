import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SHOPS } from "../constants/catalog";
import { startShopOwnerCheckout } from "../lib/checkout";
import "./AdminLogin.css";

const YEARLY_PRICE_USD = 120;
const YEARLY_PRICE_GHS = 1300;

const INITIAL_FORM = {
  businessName: "",
  ownerName: "",
  phone: "",
  email: "",
  shopName: "",
  shopKey: "",
  category: "",
  description: "",
  website: "",
  instagram: "",
};

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

export default function ShopOwnerApply() {
  const { user, loading, isAdmin } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user?.email) {
      setForm((prev) => ({
        ...prev,
        email: prev.email || user.email,
      }));
    }
  }, [user]);

  const suggestedShopKey = useMemo(() => {
    return slugify(form.shopKey || form.shopName || form.businessName);
  }, [form.shopKey, form.shopName, form.businessName]);

  const shopOptions = useMemo(() => {
    return SHOPS.map((shop) => ({
      value: shop.key,
      label: shop.label,
    }));
  }, []);

  const setField = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const validate = () => {
    if (!user?.uid) return "You must be logged in.";
    if (!form.businessName.trim()) return "Business name is required.";
    if (!form.ownerName.trim()) return "Owner name is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!isValidEmail(form.email)) return "Enter a valid email address.";
    if (!form.shopName.trim()) return "Shop display name is required.";
    if (!suggestedShopKey) return "A valid shop key is required.";
    if (!form.category.trim()) return "Business category is required.";
    if (!form.description.trim()) return "Shop description is required.";
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    const validationError = validate();
    if (validationError) {
      setErr(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await startShopOwnerCheckout({
        userId: user.uid,
        businessName: form.businessName.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        shopName: form.shopName.trim(),
        shop: suggestedShopKey,
        requestedShop: form.shopKey.trim() || suggestedShopKey,
        category: form.category.trim(),
        description: form.description.trim(),
        website: form.website.trim(),
        instagram: form.instagram.trim(),
        yearlyFee: {
          usd: YEARLY_PRICE_USD,
          ghs: YEARLY_PRICE_GHS,
        },
      });
    } catch (error) {
      console.error("Shop owner payment init error:", error);
      setErr(error?.message || "Failed to continue to payment.");
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: "/own-a-shop" }} />;
  }

  if (isAdmin) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <p className="admin-login-eyebrow">Beme Market</p>
          <h1 className="admin-login-title">Own a Shop</h1>
          <p className="admin-login-subtitle">
            Your account already has marketplace admin access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card" style={{ maxWidth: 760 }}>
        <p className="admin-login-eyebrow">Beme Market Marketplace</p>
        <h1 className="admin-login-title">Own a Shop</h1>
        <p className="admin-login-subtitle">
          Apply to become a verified Beme Market shop owner. Yearly access fee:
          <strong> ${YEARLY_PRICE_USD}</strong> or <strong>GHS {YEARLY_PRICE_GHS}</strong>.
          You will continue to payment after submitting this form. Your shop is only activated after payment verification and super admin approval.
        </p>

        <form className="admin-login-form" onSubmit={onSubmit}>
          <label className="admin-login-label">
            <span>Business name</span>
            <input
              value={form.businessName}
              onChange={setField("businessName")}
              placeholder="e.g. Luxe Scents Ghana"
              disabled={submitting}
            />
          </label>

          <label className="admin-login-label">
            <span>Owner full name</span>
            <input
              value={form.ownerName}
              onChange={setField("ownerName")}
              placeholder="Your full name"
              disabled={submitting}
            />
          </label>

          <label className="admin-login-label">
            <span>Phone</span>
            <input
              value={form.phone}
              onChange={setField("phone")}
              placeholder="0XXXXXXXXX"
              disabled={submitting}
            />
          </label>

          <label className="admin-login-label">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={setField("email")}
              placeholder="business@email.com"
              disabled={submitting}
            />
          </label>

          <label className="admin-login-label">
            <span>Shop display name</span>
            <input
              value={form.shopName}
              onChange={setField("shopName")}
              placeholder="Displayed publicly on Beme Market"
              disabled={submitting}
            />
          </label>

          <label className="admin-login-label">
            <span>Preferred shop key / slug</span>
            <input
              value={form.shopKey}
              onChange={setField("shopKey")}
              placeholder="e.g. luxe-scents"
              disabled={submitting}
            />
            <small style={{ opacity: 0.75 }}>
              Suggested key: <strong>{suggestedShopKey || "—"}</strong>
            </small>
          </label>

          <label className="admin-login-label">
            <span>Category</span>
            <input
              list="shop-categories"
              value={form.category}
              onChange={setField("category")}
              placeholder="e.g. perfumes, fashion, tech"
              disabled={submitting}
            />
            <datalist id="shop-categories">
              {shopOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </datalist>
          </label>

          <label className="admin-login-label">
            <span>Shop description</span>
            <textarea
              value={form.description}
              onChange={setField("description")}
              placeholder="Describe what you sell and your business positioning."
              rows={5}
              disabled={submitting}
            />
          </label>

          <label className="admin-login-label">
            <span>Website (optional)</span>
            <input
              value={form.website}
              onChange={setField("website")}
              placeholder="https://"
              disabled={submitting}
            />
          </label>

          <label className="admin-login-label">
            <span>Instagram (optional)</span>
            <input
              value={form.instagram}
              onChange={setField("instagram")}
              placeholder="@yourshop"
              disabled={submitting}
            />
          </label>

          {err ? <div className="admin-login-error">{err}</div> : null}
          {msg ? (
            <div className="admin-login-error" style={{ color: "green" }}>
              {msg}
            </div>
          ) : null}

          <button type="submit" className="admin-login-btn" disabled={submitting}>
            {submitting ? "Redirecting to payment..." : "Continue to payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
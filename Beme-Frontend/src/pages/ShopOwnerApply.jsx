import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SHOPS } from "../constants/catalog";
import { startShopOwnerCheckout } from "../lib/checkout";
import "./AdminLogin.css";

const YEARLY_PRICE_USD = 120;
const YEARLY_PRICE_GHS = 1300;
const DESCRIPTION_MIN = 40;
const DESCRIPTION_MAX = 500;

const INITIAL_FORM = {
  businessName: "",
  ownerName: "",
  phone: "",
  email: "",
  shopName: "",
  shop: "",
  category: "",
  description: "",
  website: "",
  instagram: "",
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

function normalizePhoneInput(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function normalizeGhanaPhone(value) {
  const raw = String(value || "").replace(/\D/g, "");

  if (!raw) return "";
  if (raw.startsWith("233") && raw.length === 12) return `+${raw}`;
  if (raw.startsWith("0") && raw.length === 10) return `+233${raw.slice(1)}`;
  if (raw.length === 9) return `+233${raw}`;
  return "";
}

function isValidGhanaPhone(value) {
  return /^\+233\d{9}$/.test(String(value || "").trim());
}

function toWebsiteUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidWebsite(value) {
  if (!value) return true;

  try {
    const url = new URL(toWebsiteUrl(value));
    return /^https?:$/i.test(url.protocol);
  } catch {
    return false;
  }
}

function normalizeInstagram(value) {
  return String(value || "").trim().replace(/^@+/, "");
}

function isValidInstagram(value) {
  if (!value) return true;
  return /^[a-zA-Z0-9._]{1,30}$/.test(normalizeInstagram(value));
}

function trimText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export default function ShopOwnerApply() {
  const { user, loading, isAdmin, adminShop, profile } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user?.email) return;

    setForm((prev) => ({
      ...prev,
      email: prev.email || user.email,
    }));
  }, [user]);

  const alreadyOwnsShop = !!adminShop || !!profile?.shop || isAdmin;

  const shopOptions = useMemo(() => {
    return SHOPS.map((shop) => ({
      value: shop.key,
      label: shop.label,
    }));
  }, []);

  const selectedShopMeta = useMemo(() => {
    return SHOPS.find((shop) => shop.key === form.shop) || null;
  }, [form.shop]);

  const normalizedPhone = useMemo(() => normalizeGhanaPhone(form.phone), [form.phone]);
  const descriptionLength = form.description.trim().length;

  const setField = (key) => (e) => {
    let nextValue = e.target.value;

    if (key === "phone") {
      nextValue = normalizePhoneInput(nextValue).slice(0, 16);
    }

    if (key === "description") {
      nextValue = nextValue.slice(0, DESCRIPTION_MAX);
    }

    setForm((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
  };

  const validate = () => {
    if (!user?.uid) return "You must be logged in.";
    if (alreadyOwnsShop) return "This account already owns a shop.";

    const businessName = trimText(form.businessName);
    const ownerName = trimText(form.ownerName);
    const email = trimText(form.email).toLowerCase();
    const category = trimText(form.category);
    const description = trimText(form.description);
    const shopName = trimText(form.shopName);
    const website = trimText(form.website);
    const instagram = normalizeInstagram(form.instagram);

    if (businessName.length < 2) return "Business name must be at least 2 characters.";
    if (ownerName.length < 2) return "Owner name must be at least 2 characters.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!normalizedPhone || !isValidGhanaPhone(normalizedPhone)) {
      return "Enter a valid Ghana phone number. Example: 0241234567";
    }
    if (!email) return "Email is required.";
    if (!isValidEmail(email)) return "Enter a valid email address.";
    if (!shopName) return "Shop display name is required.";
    if (shopName.length < 2) return "Shop display name must be at least 2 characters.";
    if (!form.shop) return "Please select one available shop.";
    if (!selectedShopMeta) return "Select a valid marketplace shop.";
    if (!category) return "Business category is required.";
    if (category.length < 2) return "Business category is too short.";
    if (!description) return "Shop description is required.";
    if (description.length < DESCRIPTION_MIN) {
      return `Shop description must be at least ${DESCRIPTION_MIN} characters.`;
    }
    if (description.length > DESCRIPTION_MAX) {
      return `Shop description cannot exceed ${DESCRIPTION_MAX} characters.`;
    }
    if (website && !isValidWebsite(website)) {
      return "Enter a valid website URL.";
    }
    if (instagram && !isValidInstagram(instagram)) {
      return "Enter a valid Instagram username.";
    }

    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
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
        businessName: trimText(form.businessName),
        ownerName: trimText(form.ownerName),
        phone: normalizedPhone,
        email: trimText(form.email).toLowerCase(),
        shopName: trimText(form.shopName),
        shop: form.shop,
        requestedShop: form.shop,
        category: trimText(form.category),
        description: trimText(form.description),
        website: trimText(form.website) ? toWebsiteUrl(trimText(form.website)) : "",
        instagram: normalizeInstagram(form.instagram)
          ? `@${normalizeInstagram(form.instagram)}`
          : "",
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

  if (alreadyOwnsShop) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <p className="admin-login-eyebrow">Beme Market</p>
          <h1 className="admin-login-title">Own a Shop</h1>
          <p className="admin-login-subtitle">
            Your account already has marketplace shop access{adminShop ? ` for ${adminShop}` : ""}.
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
          Choose one of the available marketplace shops below. After payment is verified
          successfully, your account will be activated automatically and redirected to your admin area.
        </p>

        <form className="admin-login-form" onSubmit={onSubmit}>
          <label className="admin-login-label">
            <span>Business name</span>
            <input
              value={form.businessName}
              onChange={setField("businessName")}
              placeholder="e.g. Luxe Scents Ghana"
              disabled={submitting}
              autoComplete="organization"
              maxLength={80}
            />
          </label>

          <label className="admin-login-label">
            <span>Owner full name</span>
            <input
              value={form.ownerName}
              onChange={setField("ownerName")}
              placeholder="Your full name"
              disabled={submitting}
              autoComplete="name"
              maxLength={80}
            />
          </label>

          <label className="admin-login-label">
            <span>Phone</span>
            <input
              value={form.phone}
              onChange={setField("phone")}
              placeholder="0241234567"
              disabled={submitting}
              inputMode="tel"
              autoComplete="tel"
            />
            <small style={{ opacity: 0.75 }}>
              Ghana numbers only. Accepted format becomes{" "}
              <strong>{normalizedPhone || "+233XXXXXXXXX"}</strong>
            </small>
          </label>

          <label className="admin-login-label">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={setField("email")}
              placeholder="business@email.com"
              disabled={submitting}
              autoComplete="email"
              maxLength={120}
            />
          </label>

          <label className="admin-login-label">
            <span>Shop display name</span>
            <input
              value={form.shopName}
              onChange={setField("shopName")}
              placeholder="Displayed publicly on Beme Market"
              disabled={submitting}
              maxLength={80}
            />
          </label>

          <label className="admin-login-label">
            <span>Available shop</span>
            <select
              value={form.shop}
              onChange={setField("shop")}
              disabled={submitting}
            >
              <option value="">Select a shop</option>
              {shopOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small style={{ opacity: 0.75 }}>
              One account can own only one approved marketplace shop.
            </small>
          </label>

          <label className="admin-login-label">
            <span>Business category</span>
            <input
              value={form.category}
              onChange={setField("category")}
              placeholder="e.g. perfumes, fashion, gadgets"
              disabled={submitting}
              maxLength={60}
            />
          </label>

          <label className="admin-login-label">
            <span>Shop description</span>
            <textarea
              value={form.description}
              onChange={setField("description")}
              placeholder="Describe what you sell, your positioning, and what customers should expect from your shop."
              rows={5}
              disabled={submitting}
            />
            <small style={{ opacity: 0.75 }}>
              {descriptionLength}/{DESCRIPTION_MAX} characters
            </small>
          </label>

          <label className="admin-login-label">
            <span>Website (optional)</span>
            <input
              value={form.website}
              onChange={setField("website")}
              placeholder="https://yourshop.com"
              disabled={submitting}
              maxLength={200}
            />
          </label>

          <label className="admin-login-label">
            <span>Instagram (optional)</span>
            <input
              value={form.instagram}
              onChange={setField("instagram")}
              placeholder="@yourshop"
              disabled={submitting}
              maxLength={40}
            />
          </label>

          {err ? <div className="admin-login-error">{err}</div> : null}

          <button type="submit" className="admin-login-btn" disabled={submitting}>
            {submitting ? "Redirecting to payment..." : "Continue to payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
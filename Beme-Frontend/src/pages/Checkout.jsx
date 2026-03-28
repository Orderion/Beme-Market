import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { startPaystackCheckout } from "../lib/checkout";
import { createCodOrder, getMyOrders } from "../services/api";
import "./Checkout.css";

const FREE_DELIVERY_REGIONS = new Set(["Greater Accra"]);
const GH_REGIONS = ["Greater Accra"];

const CITY_MAP = {
  "Greater Accra": [
    "Accra Central",
    "East Legon",
    "Madina",
    "Adenta",
    "Dodowa",
    "Tema",
    "Teshie",
    "Nungua",
    "Spintex",
    "Kasoa",
    "Dansoman",
    "Achimota",
    "Lapaz",
    "Haatso",
    "Dome",
    "Taifa",
    "Abokobi",
    "Ashaiman",
    "Osu",
    "Cantonments",
    "Airport Residential",
    "Dzorwulu",
    "Tesano",
    "Abelemkpe",
    "Kokomlemle",
  ],
};

const DEFAULT_OTHER_CITIES = ["Other"];
const CHECKOUT_DURATION_SECONDS = 10 * 60;
const OUTSIDE_ACCRA_DELIVERY_FEE = 50;

/* Delivery setup */
const DELIVERY_METHODS = {
  MALL_PICKUP: "mall_pickup",
  HOME_DELIVERY: "home_delivery",
};

const ACCRA_MALL_PICKUP_OPTIONS = [
  {
    id: "accra-mall",
    label: "Accra Mall Pickup",
    area: "Tetteh Quarshie / Spintex",
    fee: 0,
  },
  {
    id: "achimota-mall",
    label: "Achimota Mall Pickup",
    area: "Achimota",
    fee: 5,
  },
  {
    id: "marina-mall",
    label: "Marina Mall Pickup",
    area: "Airport",
    fee: 10,
  },
  {
    id: "west-hills-mall",
    label: "West Hills Mall Pickup",
    area: "Weija",
    fee: 15,
  },
];

const ACCRA_HOME_DELIVERY_FEE = 150;

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

const INITIAL_DELIVERY = {
  method: "",
  mallId: "",
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

function normalizeShop(value) {
  return String(value || "main").trim().toLowerCase() || "main";
}

function getNumericStock(item) {
  const raw = item?.stock;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isItemOutOfStock(item) {
  if (!item) return true;
  if (item.inStock === false) return true;

  const stock = getNumericStock(item);
  if (stock !== null && stock <= 0) return true;

  return false;
}

function hasQuantityIssue(item) {
  const stock = getNumericStock(item);
  const qty = Number(item?.qty) || 0;

  if (stock === null) return false;
  return qty > stock;
}

function getUnavailableReason(item) {
  if (isItemOutOfStock(item)) {
    return "Out of stock";
  }

  if (hasQuantityIssue(item)) {
    const stock = getNumericStock(item);
    return `Only ${stock} left in stock`;
  }

  return "";
}

function getItemAbroadDeliveryFee(item) {
  if (!item?.shipsFromAbroad) return 0;
  const parsed = Number(item?.abroadDeliveryFee);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function sanitizeText(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function sanitizeOptionalText(value, max = 200) {
  return sanitizeText(value, max);
}

function sanitizeSelectedOptions(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};

  const out = {};

  Object.entries(source).forEach(([rawKey, rawValue]) => {
    const key = sanitizeText(rawKey, 60);
    if (!key) return;

    if (Array.isArray(rawValue)) {
      const cleanValues = rawValue
        .map((entry) => sanitizeText(entry, 80))
        .filter(Boolean)
        .slice(0, 20);

      if (cleanValues.length) out[key] = cleanValues;
      return;
    }

    if (rawValue && typeof rawValue === "object") {
      const nested =
        sanitizeText(rawValue?.value, 80) ||
        sanitizeText(rawValue?.label, 80) ||
        sanitizeText(rawValue?.name, 80) ||
        sanitizeText(rawValue?.title, 80);

      if (nested) out[key] = nested;
      return;
    }

    const clean = sanitizeText(rawValue, 80);
    if (clean) out[key] = clean;
  });

  return out;
}

function sanitizeSelectedOptionDetails(source) {
  if (!Array.isArray(source)) return [];

  return source
    .map((entry) => {
      const groupName = sanitizeText(
        entry?.groupName || entry?.group || entry?.name || entry?.key,
        60
      );
      const label = sanitizeText(
        entry?.label || entry?.value || entry?.title,
        80
      );
      const priceBump = Number(entry?.priceBump);
      const safePriceBump =
        Number.isFinite(priceBump) && priceBump > 0 ? priceBump : 0;

      if (!groupName && !label) return null;

      return {
        groupName,
        label,
        priceBump: safePriceBump,
      };
    })
    .filter(Boolean)
    .slice(0, 40);
}

function sanitizeCustomizations(source) {
  if (!Array.isArray(source)) return [];

  return source
    .map((entry) => {
      if (typeof entry === "string") {
        const value = sanitizeText(entry, 120);
        return value || null;
      }

      if (entry && typeof entry === "object") {
        const label = sanitizeText(
          entry?.label || entry?.name || entry?.key || entry?.title,
          60
        );
        const value = sanitizeText(
          entry?.value || entry?.selected || entry?.option || entry?.label,
          120
        );

        if (!label && !value) return null;
        return { label, value };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 40);
}

function buildSafeCartItems(cartItems) {
  return cartItems.map((item) => ({
    id: sanitizeText(item.id, 120),
    productId: sanitizeText(item.id || item.productId, 120),
    lineId: sanitizeText(item.lineId, 320),
    name: sanitizeText(item.name, 160),
    price: Number(item.price) || 0,
    basePrice: Number(item.basePrice ?? item.price ?? 0) || 0,
    optionPriceTotal: Number(item.optionPriceTotal || 0) || 0,
    qty: Math.max(1, Number(item.qty) || 1),
    image: sanitizeOptionalText(item.image, 500),
    shop: normalizeShop(item.shop),
    selectedOptions: sanitizeSelectedOptions(item.selectedOptions),
    selectedOptionsLabel: sanitizeOptionalText(item.selectedOptionsLabel, 240),
    selectedOptionDetails: sanitizeSelectedOptionDetails(
      item.selectedOptionDetails
    ),
    customizations: sanitizeCustomizations(item.customizations),
    shipsFromAbroad: item.shipsFromAbroad === true,
    abroadDeliveryFee: getItemAbroadDeliveryFee(item),
    inStock: item.inStock !== false,
    stock: getNumericStock(item),
  }));
}

function isOrderSuccessfullyPaid(order) {
  const status = String(order?.status || "")
    .trim()
    .toLowerCase();
  const paymentStatus = String(order?.paymentStatus || "")
    .trim()
    .toLowerCase();

  return (
    order?.paid === true ||
    paymentStatus === "paid" ||
    ["paid", "processing", "shipped", "delivered"].includes(status)
  );
}

function PaymentIcon({ type, disabled = false }) {
  if (type === "cod") {
    return (
      <svg
        className={`payment-btn__icon ${disabled ? "is-disabled" : ""}`}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M3.5 6.75h11.25c1.24 0 2.25 1.01 2.25 2.25v4.25h1.34c.68 0 1.31.32 1.71.87l1.16 1.57c.29.39.45.86.45 1.35v1.21c0 .62-.5 1.12-1.12 1.12h-.76a2.87 2.87 0 0 1-5.56 0H9.78a2.87 2.87 0 0 1-5.56 0H3.5c-.62 0-1.12-.5-1.12-1.12V7.87c0-.62.5-1.12 1.12-1.12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 10.5h2.02c.44 0 .86.21 1.12.57l.86 1.18c.2.27.3.6.3.94V13.25H17V10.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="7"
          cy="18.25"
          r="1.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle
          cx="17"
          cy="18.25"
          r="1.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  return (
    <svg className="payment-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 10.5h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8 15.5h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="payment-lock-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M7.75 10V8.25a4.25 4.25 0 1 1 8.5 0V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5.25"
        y="10"
        width="13.5"
        height="9.5"
        rx="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 13.5v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="cod-info-icon">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 10.2v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7.2" r="1.1" fill="currentColor" />
    </svg>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, clearCart, itemCount } = useCart();
  const { user, loading: authLoading } = useAuth();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const cancelledPayment = searchParams.get("payment") === "cancelled";

  const [method, setMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [delivery, setDelivery] = useState(INITIAL_DELIVERY);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [timeLeft, setTimeLeft] = useState(CHECKOUT_DURATION_SECONDS);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showCODInfo, setShowCODInfo] = useState(false);
  const [checkingOrderHistory, setCheckingOrderHistory] = useState(true);
  const [hasSuccessfulPaidOrder, setHasSuccessfulPaidOrder] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [user, authLoading, navigate, location.pathname]);

  useEffect(() => {
    if (user?.email) {
      setForm((prev) => ({
        ...prev,
        email: prev.email || user.email,
      }));
    }
  }, [user]);

  // ✅ FIX: Reset loading state when user returns from Paystack redirect or tab focus
  useEffect(() => {
    const restoreAfterExternalReturn = () => {
      setLoading(false);
      setLoadingMode("");
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        restoreAfterExternalReturn();
      }
    };

    window.addEventListener("pageshow", restoreAfterExternalReturn);
    window.addEventListener("focus", restoreAfterExternalReturn);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pageshow", restoreAfterExternalReturn);
      window.removeEventListener("focus", restoreAfterExternalReturn);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const checkPreviousOrders = async () => {
      if (authLoading) return;

      if (!user?.uid) {
        if (active) {
          setHasSuccessfulPaidOrder(false);
          setCheckingOrderHistory(false);
        }
        return;
      }

      setCheckingOrderHistory(true);

      try {
        const data = await getMyOrders();
        if (!active) return;

        const rows = Array.isArray(data?.orders) ? data.orders : [];
        setHasSuccessfulPaidOrder(rows.some(isOrderSuccessfullyPaid));
      } catch (error) {
        console.error("Failed to check order history:", error);
        if (!active) return;
        setHasSuccessfulPaidOrder(false);
      } finally {
        if (active) {
          setCheckingOrderHistory(false);
        }
      }
    };

    checkPreviousOrders();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const safeCartItems = useMemo(() => buildSafeCartItems(cartItems), [cartItems]);

  const subtotalUI = useMemo(() => {
    return safeCartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      return sum + price * qty;
    }, 0);
  }, [safeCartItems]);

  const citiesForRegion = useMemo(() => {
    if (!form.region) return [];
    return CITY_MAP[form.region] || DEFAULT_OTHER_CITIES;
  }, [form.region]);

  const mallPickupOptions = useMemo(() => {
    return form.region === "Greater Accra" ? ACCRA_MALL_PICKUP_OPTIONS : [];
  }, [form.region]);

  const selectedMallOption = useMemo(() => {
    return (
      mallPickupOptions.find((option) => option.id === delivery.mallId) || null
    );
  }, [mallPickupOptions, delivery.mallId]);

  const normalizedPhone = useMemo(
    () => normalizeGhanaPhone(form.phone),
    [form.phone]
  );

  const network = useMemo(
    () => detectNetwork(normalizedPhone),
    [normalizedPhone]
  );

  const cartShops = useMemo(() => {
    return Array.from(
      new Set(safeCartItems.map((item) => normalizeShop(item.shop)))
    ).filter(Boolean);
  }, [safeCartItems]);

  const hasShippedFromAbroadItem = useMemo(() => {
    return safeCartItems.some((item) => item?.shipsFromAbroad === true);
  }, [safeCartItems]);

  const unavailableCartItems = useMemo(() => {
    return safeCartItems
      .map((item) => ({
        ...item,
        unavailableReason: getUnavailableReason(item),
      }))
      .filter((item) => item.unavailableReason);
  }, [safeCartItems]);

  const hasUnavailableCartItems = unavailableCartItems.length > 0;
  const needsFirstSuccessfulPaystackOrder =
    !checkingOrderHistory && !hasSuccessfulPaidOrder;

  const codDisabledReason = useMemo(() => {
    if (hasUnavailableCartItems) {
      return "Pay on Delivery is unavailable because your cart contains unavailable items. Remove or update them first.";
    }
    if (hasShippedFromAbroadItem) {
      return "Pay on Delivery is unavailable because your cart contains a shipped from abroad item.";
    }
    if (needsFirstSuccessfulPaystackOrder) {
      return "Pay on Delivery is unavailable until you complete your first successful Paystack payment.";
    }
    return "";
  }, [
    hasUnavailableCartItems,
    hasShippedFromAbroadItem,
    needsFirstSuccessfulPaystackOrder,
  ]);

  const isCODBlocked = !!codDisabledReason;
  const isFinalMinute = timeLeft <= 60 && !sessionExpired;
  const inputsDisabled = loading || sessionExpired;
  const formattedTimeLeft = formatTime(timeLeft);

  const regionalBaseDeliveryFeeUI = useMemo(() => {
    if (!form.region) return 0;
    return FREE_DELIVERY_REGIONS.has(form.region)
      ? 0
      : OUTSIDE_ACCRA_DELIVERY_FEE;
  }, [form.region]);

  const selectedDeliveryMethodFeeUI = useMemo(() => {
    if (!delivery.method) return 0;

    if (delivery.method === DELIVERY_METHODS.HOME_DELIVERY) {
      if (form.region === "Greater Accra") {
        return ACCRA_HOME_DELIVERY_FEE;
      }
      return 0;
    }

    if (delivery.method === DELIVERY_METHODS.MALL_PICKUP) {
      return Number(selectedMallOption?.fee || 0);
    }

    return 0;
  }, [delivery.method, form.region, selectedMallOption]);

  const abroadDeliveryFeeUI = useMemo(() => {
    return safeCartItems.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const fee = getItemAbroadDeliveryFee(item);
      return sum + fee * qty;
    }, 0);
  }, [safeCartItems]);

  const deliveryFeeUI = useMemo(
    () =>
      regionalBaseDeliveryFeeUI +
      selectedDeliveryMethodFeeUI +
      abroadDeliveryFeeUI,
    [regionalBaseDeliveryFeeUI, selectedDeliveryMethodFeeUI, abroadDeliveryFeeUI]
  );

  const totalUI = useMemo(
    () => subtotalUI + deliveryFeeUI,
    [subtotalUI, deliveryFeeUI]
  );

  const selectedMethodMeta = useMemo(() => {
    if (!method) return null;

    if (method === "cod") {
      return {
        heading: "Review your payment choice",
        title: "Pay on Delivery selected",
        note: isCODBlocked
          ? codDisabledReason
          : "You will place the order now and pay when your order arrives.",
        badge: isCODBlocked ? "Unavailable right now" : "Cash on delivery",
        secureNote: "",
      };
    }

    return {
      heading: "Review your payment choice",
      title: "Paystack selected",
      note: "You will be redirected securely to Paystack to complete payment for this order.",
      badge: "Secure online checkout",
      secureNote: "Secured by Paystack",
    };
  }, [method, isCODBlocked, codDisabledReason]);

  const selectedDeliverySummary = useMemo(() => {
    if (!delivery.method) return null;

    if (delivery.method === DELIVERY_METHODS.HOME_DELIVERY) {
      return {
        title: "Home Delivery",
        note:
          form.region === "Greater Accra"
            ? `Home delivery in Greater Accra (+GHS ${ACCRA_HOME_DELIVERY_FEE.toFixed(
                2
              )})`
            : `Outside Accra home delivery (base regional fee applies)`,
      };
    }

    if (delivery.method === DELIVERY_METHODS.MALL_PICKUP && selectedMallOption) {
      return {
        title: selectedMallOption.label,
        note: `${selectedMallOption.area}${
          selectedMallOption.fee > 0
            ? ` (+GHS ${selectedMallOption.fee.toFixed(2)})`
            : " (Free pickup)"
        }`,
      };
    }

    return null;
  }, [delivery.method, form.region, selectedMallOption]);

  useEffect(() => {
    if (isCODBlocked && method === "cod") {
      setMethod("");
    }
  }, [isCODBlocked, method]);

  useEffect(() => {
    if (form.region !== "Greater Accra") {
      setDelivery((prev) => {
        if (prev.method === DELIVERY_METHODS.MALL_PICKUP || prev.mallId) {
          return {
            method: prev.method === DELIVERY_METHODS.MALL_PICKUP
              ? DELIVERY_METHODS.HOME_DELIVERY
              : prev.method,
            mallId: "",
          };
        }
        return prev;
      });
    }
  }, [form.region]);

  useEffect(() => {
    if (delivery.method !== DELIVERY_METHODS.MALL_PICKUP && delivery.mallId) {
      setDelivery((prev) => ({ ...prev, mallId: "" }));
    }
  }, [delivery.method, delivery.mallId]);

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
      setForm((prev) => ({
        ...prev,
        region: value,
        city: "",
      }));
      setDelivery(INITIAL_DELIVERY);
      return;
    }

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const setDeliveryMethod = (nextMethod) => {
    if (sessionExpired || loading) return;

    setDelivery({
      method: nextMethod,
      mallId: nextMethod === DELIVERY_METHODS.MALL_PICKUP ? delivery.mallId : "",
    });

    setTouched((prev) => ({
      ...prev,
      deliveryMethod: true,
    }));
  };

  const setMallPickup = (mallId) => {
    if (sessionExpired || loading) return;

    setDelivery({
      method: DELIVERY_METHODS.MALL_PICKUP,
      mallId,
    });

    setTouched((prev) => ({
      ...prev,
      deliveryMethod: true,
      mallId: true,
    }));
  };

  const markTouched = (key) => () => {
    setTouched((prev) => ({
      ...prev,
      [key]: true,
    }));
  };

  const validate = (v) => {
    const next = {};

    if (!user && !authLoading) next.auth = "Please login before checkout.";

    if (!v.email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(v.email)) next.email = "Enter a valid email address.";

    if (!v.firstName.trim()) next.firstName = "First name is required.";
    else if (!isValidName(v.firstName)) next.firstName = "Use letters only.";

    if (!v.lastName.trim()) next.lastName = "Last name is required.";
    else if (!isValidName(v.lastName)) next.lastName = "Use letters only.";

    if (!v.address.trim()) next.address = "Address is required.";
    else if (!isValidGhanaAddress(v.address)) {
      next.address = "Enter a valid address.";
    }

    if (!v.region) next.region = "Select a region.";
    if (!v.city) next.city = "Select a city.";

    if (!v.area.trim()) next.area = "Area / locality is required.";
    else if (v.area.trim().length < 2) next.area = "Area is too short.";

    if (!v.phone.trim()) next.phone = "Phone is required.";
    else if (!normalizedPhone) next.phone = "Use 0XXXXXXXXX or +233XXXXXXXXX.";
    else if (!network) {
      next.phone = "Phone must be MTN, Telecel, or AirtelTigo.";
    }

    if (!safeCartItems.length) {
      next.cart = "Your cart is empty.";
    } else if (hasUnavailableCartItems) {
      next.cart =
        "Some items in your cart are out of stock or exceed available stock. Update your cart before checkout.";
    }

    if (!delivery.method) {
      next.deliveryMethod = "Please select a delivery option.";
    }
    if (
      delivery.method === DELIVERY_METHODS.MALL_PICKUP &&
      !delivery.mallId
    ) {
      next.mallId = "Please select a pickup mall.";
    }

    if (!method) {
      next.paymentMethod = "Please select a payment method.";
    }

    return next;
  };

  useEffect(() => {
    setErrors(validate(form));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    authLoading,
    form.email,
    form.firstName,
    form.lastName,
    form.phone,
    form.address,
    form.region,
    form.city,
    form.area,
    safeCartItems,
    hasUnavailableCartItems,
    normalizedPhone,
    network,
    method,
    delivery.method,
    delivery.mallId,
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
      deliveryMethod: true,
      mallId: true,
      paymentMethod: true,
    });

    return Object.values(next)[0] || null;
  };

  const restartCheckout = () => {
    setForm({
      ...INITIAL_FORM,
      email: user?.email || "",
    });
    setDelivery(INITIAL_DELIVERY);
    setTouched({});
    setErrors({});
    setMethod("");
    setLoading(false);
    setLoadingMode("");
    setSessionExpired(false);
    setTimeLeft(CHECKOUT_DURATION_SECONDS);
    setShowCODInfo(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const dismissCancelledNotice = () => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete("payment");
    navigate(
      {
        pathname: location.pathname,
        search: nextParams.toString() ? `?${nextParams.toString()}` : "",
      },
      { replace: true }
    );
  };

  const buildDeliveryPayload = () => {
    const mallLabel = selectedMallOption?.label || "";
    const mallArea = selectedMallOption?.area || "";

    const label =
      delivery.method === DELIVERY_METHODS.HOME_DELIVERY
        ? "Home Delivery"
        : delivery.method === DELIVERY_METHODS.MALL_PICKUP
        ? mallLabel || "Mall Pickup"
        : "";

    return {
      method: delivery.method,
      label,
      fee: deliveryFeeUI,
      breakdown: {
        regionalBaseFee: regionalBaseDeliveryFeeUI,
        methodFee: selectedDeliveryMethodFeeUI,
        abroadFee: abroadDeliveryFeeUI,
      },
      mallPickup:
        delivery.method === DELIVERY_METHODS.MALL_PICKUP
          ? {
              id: delivery.mallId,
              label: mallLabel,
              area: mallArea,
              fee: Number(selectedMallOption?.fee || 0),
            }
          : null,
      homeDelivery:
        delivery.method === DELIVERY_METHODS.HOME_DELIVERY
          ? {
              label: "Home Delivery",
              fee: form.region === "Greater Accra" ? ACCRA_HOME_DELIVERY_FEE : 0,
            }
          : null,
    };
  };

  const buildOrderPayload = (paymentMethod) => {
    const items = safeCartItems.map((item) => ({
      id: item.id || "",
      productId: item.productId || item.id || "",
      name: item.name || "",
      price: Number(item.price) || 0,
      basePrice: Number(item.basePrice ?? item.price ?? 0) || 0,
      optionPriceTotal: Number(item.optionPriceTotal || 0) || 0,
      qty: Number(item.qty) || 1,
      image: item.image || "",
      shop: normalizeShop(item.shop),
      selectedOptions: item.selectedOptions || {},
      selectedOptionsLabel: item.selectedOptionsLabel || "",
      selectedOptionDetails: Array.isArray(item.selectedOptionDetails)
        ? item.selectedOptionDetails
        : [],
      customizations: Array.isArray(item.customizations)
        ? item.customizations
        : [],
      shipsFromAbroad: item.shipsFromAbroad === true,
      abroadDeliveryFee: getItemAbroadDeliveryFee(item),
      inStock: item.inStock !== false,
      stock: getNumericStock(item),
    }));

    const shops = Array.from(new Set(items.map((item) => item.shop))).filter(
      Boolean
    );

    return {
      customer: {
        email: sanitizeText(form.email, 160).toLowerCase(),
        firstName: sanitizeText(form.firstName, 80),
        lastName: sanitizeText(form.lastName, 80),
        phone: normalizedPhone,
        address: sanitizeText(form.address, 300),
        region: sanitizeText(form.region, 80),
        city: sanitizeText(form.city, 80),
        area: sanitizeText(form.area, 120),
        notes: sanitizeOptionalText(form.notes, 500),
        country: "Ghana",
        network,
        userId: user?.uid || "",
      },
      delivery: buildDeliveryPayload(),
      items,
      shops,
      primaryShop: shops[0] || "main",
      pricing: {
        subtotal: subtotalUI,
        deliveryFee: deliveryFeeUI,
        total: totalUI,
        currency: "GHS",
      },
      paymentMethod,
      paymentStatus: "pending",
      status: paymentMethod === "cod" ? "pending" : "pending_payment",
      source: "web",
    };
  };

  const placeCOD = async () => {
    if (
      loading ||
      sessionExpired ||
      isCODBlocked ||
      checkingOrderHistory ||
      hasUnavailableCartItems
    ) {
      return;
    }

    const err = validateRequired();
    if (err) return;

    setLoadingMode("cod");
    setLoading(true);

    try {
      const payload = buildOrderPayload("cod");
      const result = await createCodOrder(payload);
      const createdOrderId = result?.order?.id || result?.id || "";
      clearCart();

      navigate(
        `/order-success?status=success${
          createdOrderId ? `&orderId=${encodeURIComponent(createdOrderId)}` : ""
        }`,
        { replace: true }
      );
    } catch (e) {
      console.error("COD order failed:", e);
      alert(
        e?.message
          ? `Failed to place order: ${e.message}`
          : "Failed to place order. Try again."
      );
      setLoading(false);
      setLoadingMode("");
    }
  };

  // ✅ FIXED: payWithPaystack now shows the loader immediately on click,
  // runs validation, and only resets loading if validation fails.
  // The loader stays visible while Paystack redirect is in progress.
  const payWithPaystack = async () => {
    // Guard: block if already loading, session expired, or cart has issues
    if (
      loading ||
      sessionExpired ||
      checkingOrderHistory ||
      hasUnavailableCartItems
    ) {
      return;
    }

    // ✅ Show loader immediately so the user gets instant feedback
    setLoadingMode("paystack");
    setLoading(true);

    // ✅ Mark all fields as touched so validation errors surface on screen
    setTouched({
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
      region: true,
      city: true,
      area: true,
      deliveryMethod: true,
      mallId: true,
      paymentMethod: true,
    });

    // ✅ Run full validation — if anything fails, hide loader and stop
    const err = validateRequired();
    if (err) {
      setLoading(false);
      setLoadingMode("");
      return;
    }

    // ✅ All good — proceed to Paystack. Loader stays on until redirect happens.
    try {
      await startPaystackCheckout({
        email: sanitizeText(form.email, 160).toLowerCase(),
        cartItems: safeCartItems.map((item) => ({
          ...item,
          qty: Number(item.qty) || 1,
          price: Number(item.price) || 0,
          basePrice: Number(item.basePrice ?? item.price ?? 0) || 0,
          optionPriceTotal: Number(item.optionPriceTotal || 0) || 0,
        })),
        delivery: buildDeliveryPayload(),
        pricing: {
          subtotal: subtotalUI,
          deliveryFee: deliveryFeeUI,
          total: totalUI,
          currency: "GHS",
        },
        customer: {
          firstName: sanitizeText(form.firstName, 80),
          lastName: sanitizeText(form.lastName, 80),
          address: sanitizeText(form.address, 300),
          region: sanitizeText(form.region, 80),
          city: sanitizeText(form.city, 80),
          area: sanitizeText(form.area, 120),
          phone: normalizedPhone,
        },
      });
    } catch (e) {
      // ✅ Only reset loader if Paystack init itself throws — not on redirect
      console.error("Paystack init failed:", e);
      setLoading(false);
      setLoadingMode("");
    }
  };

  const handleMethodChange = (e) => {
    const value = e.target.value;

    setTouched((prev) => ({
      ...prev,
      paymentMethod: true,
    }));

    if (!value) {
      setMethod("");
      setShowCODInfo(false);
      return;
    }

    if (value === "cod" && isCODBlocked) {
      setMethod("");
      setShowCODInfo(true);
      return;
    }

    setMethod(value);
    setShowCODInfo(false);
  };

  return (
    <div className="checkout">
      <div className="checkout-container">
        {cancelledPayment ? (
          <div className="checkout-cancel-notice" role="status" aria-live="polite">
            <div className="checkout-cancel-notice__content">
              <strong>Payment cancelled.</strong>
              <span>
                Your order was not completed. You can review your details and try
                again whenever you are ready.
              </span>
            </div>
            <button
              type="button"
              className="checkout-cancel-notice__close"
              onClick={dismissCancelledNotice}
              aria-label="Dismiss payment cancelled notice"
            >
              ×
            </button>
          </div>
        ) : null}

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
                  Your checkout session has expired. Please restart checkout to
                  continue.
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

        {!safeCartItems.length ? (
          <div className="checkout-empty">
            <div className="checkout-empty-card">
              <h2>Your cart is empty</h2>
              <p>Add products to your cart before proceeding to checkout.</p>
              <div className="checkout-empty-actions">
                <Link to="/shop" className="checkout-link-btn">
                  Go to shop
                </Link>
                <Link
                  to="/"
                  className="checkout-link-btn checkout-link-btn--ghost"
                >
                  Back home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="checkout-grid">
            <div className="checkout-form">
              {!!errors.auth && (
                <div className="field-error" style={{ marginBottom: 14 }}>
                  {errors.auth}
                </div>
              )}

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
              {showError("email") ? (
                <div className="field-error">{errors.email}</div>
              ) : null}

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
              {showError("address") ? (
                <div className="field-error">{errors.address}</div>
              ) : null}

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
                  {showError("region") ? (
                    <div className="field-error">{errors.region}</div>
                    ) : null}
                </div>

                <div>
                  <select
                    value={form.city}
                    onBlur={markTouched("city")}
                    onChange={setField("city")}
                    disabled={inputsDisabled || !form.region}
                  >
                    <option value="">
                      {form.region ? "Select city" : "Select region first"}
                    </option>
                    {citiesForRegion.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {showError("city") ? (
                    <div className="field-error">{errors.city}</div>
                  ) : null}
                </div>
              </div>

              <input
                placeholder="Area / Locality (e.g., East Legon)"
                value={form.area}
                onBlur={markTouched("area")}
                onChange={setField("area")}
                disabled={inputsDisabled}
              />
              {showError("area") ? (
                <div className="field-error">{errors.area}</div>
              ) : null}

              <input
                placeholder="Phone (0XXXXXXXXX or +233XXXXXXXXX)"
                value={form.phone}
                onBlur={markTouched("phone")}
                onChange={setField("phone")}
                disabled={inputsDisabled}
              />
              {showError("phone") ? (
                <div className="field-error">{errors.phone}</div>
              ) : null}

              {normalizedPhone && network ? (
                <div className="field-hint">
                  Network detected: <b>{network}</b> ({normalizedPhone})
                </div>
              ) : null}

              <textarea
                placeholder="Delivery notes (optional)"
                value={form.notes}
                onChange={setField("notes")}
                disabled={inputsDisabled}
              />

              <h3>Delivery options</h3>

              <div className="delivery-methods">
                <button
                  type="button"
                  className={`delivery-method-card ${
                    delivery.method === DELIVERY_METHODS.MALL_PICKUP ? "is-active" : ""
                  }`}
                  onClick={() => setDeliveryMethod(DELIVERY_METHODS.MALL_PICKUP)}
                  disabled={inputsDisabled || form.region !== "Greater Accra"}
                >
                  <strong>Mall Pickup</strong>
                  <span>
                    {form.region === "Greater Accra"
                      ? "Pick up from a selected mall in Accra."
                      : "Available only in Greater Accra."}
                  </span>
                </button>

                <button
                  type="button"
                  className={`delivery-method-card ${
                    delivery.method === DELIVERY_METHODS.HOME_DELIVERY ? "is-active" : ""
                  }`}
                  onClick={() => setDeliveryMethod(DELIVERY_METHODS.HOME_DELIVERY)}
                  disabled={inputsDisabled}
                >
                  <strong>Home Delivery</strong>
                  <span>
                    {form.region === "Greater Accra"
                      ? `Delivered to your address in Accra (+GHS ${ACCRA_HOME_DELIVERY_FEE.toFixed(
                          2
                        )})`
                      : "Delivered to your address. Regional delivery fee applies."}
                  </span>
                </button>
              </div>

              {showError("deliveryMethod") ? (
                <div className="field-error">{errors.deliveryMethod}</div>
              ) : null}

              {delivery.method === DELIVERY_METHODS.MALL_PICKUP ? (
                <div className="delivery-mall-options">
                  <label className="delivery-section-label">
                    Select pickup mall
                  </label>

                  <div className="delivery-mall-grid">
                    {mallPickupOptions.map((mall) => (
                      <button
                        key={mall.id}
                        type="button"
                        className={`delivery-mall-card ${
                          delivery.mallId === mall.id ? "is-active" : ""
                        }`}
                        onClick={() => setMallPickup(mall.id)}
                        disabled={inputsDisabled}
                      >
                        <strong>{mall.label}</strong>
                        <span>{mall.area}</span>
                        <small>
                          {mall.fee > 0
                            ? `Pickup fee: GHS ${mall.fee.toFixed(2)}`
                            : "Free pickup"}
                        </small>
                      </button>
                    ))}
                  </div>

                  {showError("mallId") ? (
                    <div className="field-error">{errors.mallId}</div>
                  ) : null}
                </div>
              ) : null}

              {selectedDeliverySummary ? (
                <div className="payment-selection-review payment-selection-review--delivery">
                  <div className="payment-selection-review__top">
                    <span className="payment-selection-review__eyebrow">
                      Delivery selected
                    </span>
                    <span className="payment-selection-review__badge">
                      GHS {selectedDeliveryMethodFeeUI.toFixed(2)}
                    </span>
                  </div>

                  <strong className="payment-selection-review__title">
                    {selectedDeliverySummary.title}
                  </strong>

                  <p className="payment-selection-review__text">
                    {selectedDeliverySummary.note}
                  </p>
                </div>
              ) : null}

              <h3>Payment method</h3>

              <div className="payment-dropdown-wrap">
                <label
                  className="payment-dropdown-label"
                  htmlFor="payment-method"
                >
                  Choose how you want to pay
                </label>

                <div className="payment-dropdown-shell">
                  <select
                    id="payment-method"
                    className="payment-dropdown"
                    value={method}
                    onChange={handleMethodChange}
                    onBlur={markTouched("paymentMethod")}
                    disabled={inputsDisabled || checkingOrderHistory}
                  >
                    <option value="">Select payment method</option>
                    <option value="paystack">Pay with Paystack</option>
                    <option value="cod">
                      Pay on Delivery{isCODBlocked ? " (Unavailable)" : ""}
                    </option>
                  </select>
                  <span className="payment-dropdown-arrow" aria-hidden="true">
                    ▾
                  </span>
                </div>
              </div>

              {showError("paymentMethod") ? (
                <div className="field-error">{errors.paymentMethod}</div>
              ) : null}

              {checkingOrderHistory ? (
                <div className="payment-note">
                  Checking your checkout eligibility…
                </div>
              ) : null}

              {selectedMethodMeta ? (
                <div
                  className={[
                    "payment-selection-review",
                    method === "paystack"
                      ? "payment-selection-review--paystack"
                      : "payment-selection-review--cod",
                  ]
                    .join(" ")
                    .trim()}
                >
                  <div className="payment-selection-review__top">
                    <span className="payment-selection-review__eyebrow">
                      {selectedMethodMeta.heading}
                    </span>
                    <span className="payment-selection-review__badge">
                      {selectedMethodMeta.badge}
                    </span>
                  </div>

                  <strong className="payment-selection-review__title">
                    {selectedMethodMeta.title}
                  </strong>

                  <p className="payment-selection-review__text">
                    {selectedMethodMeta.note}
                  </p>

                  {selectedMethodMeta.secureNote ? (
                    <div className="payment-selection-review__secure">
                      <LockIcon />
                      <span>{selectedMethodMeta.secureNote}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showCODInfo || (method === "cod" && isCODBlocked) ? (
                <div className="payment-info-panel">
                  <div className="payment-info-panel__icon">
                    <InfoIcon />
                  </div>
                  <div className="payment-info-panel__content">
                    <strong>Pay on Delivery notice</strong>
                    <p>
                      {codDisabledReason ||
                        "Pay on Delivery is available once your cart and account qualify for it."}
                    </p>
                  </div>
                </div>
              ) : null}

              {method ? (
                <div className="checkout-actions checkout-actions--enhanced">
                  {method === "paystack" ? (
                    <button
                      className={[
                        "primary-btn",
                        "payment-btn",
                        "payment-btn--paystack",
                        "is-selected",
                      ]
                        .join(" ")
                        .trim()}
                      onClick={payWithPaystack}
                      disabled={
                        inputsDisabled ||
                        !!errors.cart ||
                        !user ||
                        authLoading ||
                        checkingOrderHistory ||
                        hasUnavailableCartItems
                      }
                      type="button"
                    >
                      <span className="payment-btn__inner">
                        <PaymentIcon type="paystack" />
                        <span className="payment-btn__text">
                          <span className="payment-btn__title">
                            Pay with Paystack
                          </span>
                          <span className="payment-btn__sub">
                            {hasUnavailableCartItems
                              ? "Resolve unavailable cart items first"
                              : "Secured by Paystack"}
                          </span>
                        </span>
                        <LockIcon />
                      </span>
                    </button>
                  ) : (
                    <button
                      className={[
                        "primary-btn",
                        "payment-btn",
                        "payment-btn--cod",
                        "is-selected",
                        isCODBlocked ? "is-disabled" : "",
                      ]
                        .join(" ")
                        .trim()}
                      onClick={placeCOD}
                      disabled={
                        inputsDisabled ||
                        !!errors.cart ||
                        !user ||
                        authLoading ||
                        checkingOrderHistory ||
                        isCODBlocked ||
                        hasUnavailableCartItems
                      }
                      type="button"
                    >
                      <span className="payment-btn__inner">
                        <PaymentIcon type="cod" disabled={isCODBlocked} />
                        <span className="payment-btn__text">
                          <span className="payment-btn__title">
                            Pay on Delivery
                          </span>
                          <span className="payment-btn__sub">
                            {isCODBlocked
                              ? "Currently unavailable"
                              : "Confirm order and pay on arrival"}
                          </span>
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <div className="checkout-summary">
              <div className="checkout-summary-head">
                <h3>Order Summary</h3>
                <span className="checkout-summary-count">
                  {itemCount} item{itemCount > 1 ? "s" : ""}
                </span>
              </div>

              {hasUnavailableCartItems ? (
                <div className="field-error" style={{ marginBottom: 14 }}>
                  Some cart items are unavailable. Remove them or reduce quantity
                  before checkout.
                </div>
              ) : null}

              {safeCartItems.map((item, index) => {
                const unavailableReason = getUnavailableReason(item);
                const itemAbroadFee = getItemAbroadDeliveryFee(item);

                return (
                  <div
                    key={item.lineId || `${item.id}-${index}`}
                    className="summary-item"
                  >
                    <div className="summary-item-left">
                      <div className="summary-item-thumb">
                        {item.image ? (
                          <img src={item.image} alt={item.name || "Product"} />
                        ) : (
                          <div className="summary-item-thumb--empty">
                            No image
                          </div>
                        )}
                      </div>

                      <div>
                        <p>{item.name}</p>
                        {item.selectedOptionsLabel ? (
                          <small className="summary-item-options">
                            {item.selectedOptionsLabel}
                          </small>
                        ) : null}
                        {item.shipsFromAbroad ? (
                          <small className="summary-item-options summary-item-options--abroad">
                            Ships from abroad
                            {itemAbroadFee > 0
                              ? ` • Fee: GHS ${itemAbroadFee.toFixed(2)} each`
                              : ""}
                          </small>
                        ) : null}
                        {unavailableReason ? (
                          <small className="summary-item-options summary-item-options--abroad">
                            {unavailableReason}
                          </small>
                        ) : null}
                        <small>x{item.qty}</small>
                      </div>
                    </div>

                    <p>GHS {(Number(item.price) * Number(item.qty)).toFixed(2)}</p>
                  </div>
                );
              })}

              <div className="summary-line">
                <span>Subtotal</span>
                <span>GHS {subtotalUI.toFixed(2)}</span>
              </div>

              <div className="summary-line">
                <span>
                  Regional base delivery
                  {form.region ? (
                    <small className="summary-line-sub">
                      {FREE_DELIVERY_REGIONS.has(form.region)
                        ? "Greater Accra base delivery"
                        : "Outside Accra base delivery (+50)"}
                    </small>
                  ) : (
                    <small className="summary-line-sub">
                      Select region to calculate
                    </small>
                  )}
                </span>
                <span>GHS {regionalBaseDeliveryFeeUI.toFixed(2)}</span>
              </div>

              <div className="summary-line">
                <span>
                  Delivery option
                  <small className="summary-line-sub">
                    {selectedDeliverySummary
                      ? selectedDeliverySummary.title
                      : "Select delivery option"}
                  </small>
                </span>
                <span>GHS {selectedDeliveryMethodFeeUI.toFixed(2)}</span>
              </div>

              <div className="summary-line">
                <span>
                  Abroad delivery
                  <small className="summary-line-sub">
                    {abroadDeliveryFeeUI > 0
                      ? "Charged from shipped abroad items"
                      : "No abroad delivery fee"}
                  </small>
                </span>
                <span>GHS {abroadDeliveryFeeUI.toFixed(2)}</span>
              </div>

              <div className="summary-line">
                <span>
                  Total delivery
                  <small className="summary-line-sub">
                    Base + selected option + abroad delivery
                  </small>
                </span>
                <span>GHS {deliveryFeeUI.toFixed(2)}</span>
              </div>

              <div className="summary-line">
                <span>
                  Shops
                  <small className="summary-line-sub">
                    {cartShops.length ? cartShops.join(", ") : "main"}
                  </small>
                </span>
                <span>{cartShops.length || 1}</span>
              </div>

              <div className="summary-total">
                <span>Total</span>
                <strong>GHS {totalUI.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoaderOverlay
          label={
            loadingMode === "paystack"
              ? "Redirecting to Paystack"
              : "Placing your order"
          }
          subtext={
            loadingMode === "paystack"
              ? "Please wait while we secure your payment..."
              : "Please wait while we confirm your order..."
          }
        />
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { startPaystackCheckout } from "../lib/checkout";
import { createCodOrder, getMyOrders } from "../services/api";
import "./Checkout.css";

/* ── constants ── */
const GH_REGIONS = [
  "Greater Accra","Ashanti","Western","Central","Eastern",
  "Northern","Upper East","Upper West","Volta","Brong-Ahafo",
  "Oti","Ahafo","Bono East","North East","Savannah","Western North",
];
const CITY_MAP = {
  "Greater Accra": ["Accra Central","East Legon","Madina","Adenta","Dodowa","Tema","Teshie","Nungua","Spintex","Kasoa","Dansoman","Achimota","Lapaz","Haatso","Dome","Taifa","Abokobi","Ashaiman","Osu","Cantonments","Airport Residential","Dzorwulu","Tesano","Abelemkpe","Kokomlemle"],
  "Ashanti":     ["Kumasi","Obuasi","Mampong","Ejisu","Juaben","Asante Mampong"],
  "Western":     ["Takoradi","Sekondi","Tarkwa","Axim","Bogoso","Prestea"],
  "Central":     ["Cape Coast","Winneba","Mankessim","Saltpond","Elmina"],
  "Eastern":     ["Koforidua","Akosombo","Nkawkaw","Suhum","Oda","Nsawam"],
  "Volta":       ["Ho","Aflao","Keta","Hohoe","Sogakope","Kpando"],
  "Northern":    ["Tamale","Yendi","Savelugu","Gushegu","Tolon"],
  "Upper East":  ["Bolgatanga","Bawku","Navrongo","Paga","Zebilla"],
  "Upper West":  ["Wa","Lawra","Tumu","Jirapa","Nandom"],
  "Brong-Ahafo": ["Sunyani","Techiman","Kintampo","Wenchi","Berekum"],
  "Oti":         ["Dambai","Jasikan","Kadjebi","Nkwanta"],
  "Ahafo":       ["Goaso","Kukuom","Acherensua","Hwidiem"],
  "Bono East":   ["Techiman","Atebubu","Kintampo North","Nkoranza"],
  "North East":  ["Nalerigu","Walewale","Gambaga","Bunkpurugu"],
  "Savannah":    ["Damongo","Bole","Sawla","Salaga"],
  "Western North":["Sefwi Wiawso","Bibiani","Juaboso","Bodi"],
};
const DEFAULT_OTHER_CITIES = ["Town Centre","Other"];
const CHECKOUT_DURATION_SECONDS = 10 * 60;
const SELLER_DIRECT_ID = "seller_direct";

/* ── Courier delivery providers ── */
const DELIVERY_PROVIDERS = [
  {
    id:        "cheetah",
    name:      "Cheetah Express",
    tagline:   "Reliable nationwide delivery",
    accra:     { fee: 25, eta: "1–2 days" },
    other:     { fee: 45, eta: "3–5 days" },
    nationwide: true,
    accrOnly:  false,
  },
  {
    id:        "glovo",
    name:      "Glovo",
    tagline:   "Fast on-demand delivery",
    accra:     { fee: 30, eta: "Same day · 2–4 hrs" },
    other:     null,
    nationwide: false,
    accrOnly:  true,
  },
  {
    id:        "kwikdelivery",
    name:      "KwikDelivery",
    tagline:   "Affordable nationwide delivery",
    accra:     { fee: 20, eta: "1–2 days" },
    other:     { fee: 35, eta: "3–5 days" },
    nationwide: true,
    accrOnly:  false,
  },
  {
    id:        "dhl",
    name:      "DHL eCommerce",
    tagline:   "Premium tracked delivery",
    accra:     { fee: 55, eta: "Next day" },
    other:     { fee: 75, eta: "2–3 days" },
    nationwide: true,
    accrOnly:  false,
  },
];

function getProviderFee(provider, region) {
  if (!provider) return 0;
  if (region === "Greater Accra") return provider.accra?.fee ?? 0;
  return provider.other?.fee ?? 0;
}
function getProviderEta(provider, region) {
  if (!provider) return "";
  if (region === "Greater Accra") return provider.accra?.eta ?? "";
  return provider.other?.eta ?? "";
}

const INITIAL_FORM     = { email:"", firstName:"", lastName:"", phone:"", address:"", region:"", city:"", area:"", notes:"" };
const INITIAL_DELIVERY = { method:"" };

/* ── helpers (unchanged from doc 5) ── */
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim()); }
function isValidName(value) { const s = String(value || "").trim(); if (s.length < 2) return false; return /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(s); }
function isValidGhanaAddress(value) { const s = String(value || "").trim(); if (s.length < 6) return false; if (!/[A-Za-z]/.test(s)) return false; return /^[A-Za-z0-9\s,./#-]+$/.test(s); }
function normalizeGhanaPhone(raw) {
  const s = String(raw || "").trim().replace(/\s+/g, "").replace(/-/g, "");
  if (/^\+233\d{9}$/.test(s)) return "0" + s.slice(4);
  if (/^233\d{9}$/.test(s))   return "0" + s.slice(3);
  if (/^0\d{9}$/.test(s))     return s;
  return null;
}
const PREFIX_TO_NETWORK = [
  { prefix:"024", network:"MTN" },{ prefix:"025", network:"MTN" },{ prefix:"053", network:"MTN" },
  { prefix:"054", network:"MTN" },{ prefix:"055", network:"MTN" },{ prefix:"059", network:"MTN" },
  { prefix:"020", network:"Telecel" },{ prefix:"050", network:"Telecel" },
  { prefix:"026", network:"AirtelTigo" },{ prefix:"056", network:"AirtelTigo" },
  { prefix:"027", network:"AirtelTigo" },{ prefix:"057", network:"AirtelTigo" },
];
function detectNetwork(local10) { if (!local10) return null; const p = local10.slice(0,3); return PREFIX_TO_NETWORK.find(x => x.prefix === p)?.network || null; }
function formatTime(seconds) { const m = Math.floor(seconds/60), s = seconds%60; return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; }
function normalizeShop(value) { return String(value || "main").trim().toLowerCase() || "main"; }
function getNumericStock(item) { const p = Number(item?.stock); return Number.isFinite(p) ? p : null; }
function isItemOutOfStock(item) { if (!item) return true; if (item.inStock === false) return true; const s = getNumericStock(item); if (s !== null && s <= 0) return true; return false; }
function hasQuantityIssue(item) { const s = getNumericStock(item); const q = Number(item?.qty) || 0; if (s === null) return false; return q > s; }
function getUnavailableReason(item) { if (isItemOutOfStock(item)) return "Out of stock"; if (hasQuantityIssue(item)) return `Only ${getNumericStock(item)} left in stock`; return ""; }
function getItemAbroadDeliveryFee(item) { if (!item?.shipsFromAbroad) return 0; const p = Number(item?.abroadDeliveryFee); return Number.isFinite(p) && p > 0 ? p : 0; }
function sanitizeText(value, max=200) { return String(value||"").trim().slice(0,max); }
function sanitizeOptionalText(value, max=200) { return sanitizeText(value,max); }
function sanitizeSelectedOptions(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const out = {};
  Object.entries(source).forEach(([rawKey,rawValue]) => {
    const key = sanitizeText(rawKey,60); if (!key) return;
    if (Array.isArray(rawValue)) { const cv = rawValue.map(e=>sanitizeText(e,80)).filter(Boolean).slice(0,20); if (cv.length) out[key]=cv; return; }
    if (rawValue && typeof rawValue==="object") { const n=sanitizeText(rawValue?.value,80)||sanitizeText(rawValue?.label,80)||sanitizeText(rawValue?.name,80)||sanitizeText(rawValue?.title,80); if (n) out[key]=n; return; }
    const clean=sanitizeText(rawValue,80); if (clean) out[key]=clean;
  });
  return out;
}
function sanitizeSelectedOptionDetails(source) {
  if (!Array.isArray(source)) return [];
  return source.map(entry=>{
    const groupName=sanitizeText(entry?.groupName||entry?.group||entry?.name||entry?.key,60);
    const label=sanitizeText(entry?.label||entry?.value||entry?.title,80);
    const priceBump=Number(entry?.priceBump);
    const safePriceBump=Number.isFinite(priceBump)&&priceBump>0?priceBump:0;
    if (!groupName&&!label) return null;
    return { groupName, label, priceBump:safePriceBump };
  }).filter(Boolean).slice(0,40);
}
function sanitizeCustomizations(source) {
  if (!Array.isArray(source)) return [];
  return source.map(entry=>{
    if (typeof entry==="string") { const v=sanitizeText(entry,120); return v||null; }
    if (entry&&typeof entry==="object") {
      const label=sanitizeText(entry?.label||entry?.name||entry?.key||entry?.title,60);
      const value=sanitizeText(entry?.value||entry?.selected||entry?.option||entry?.label,120);
      if (!label&&!value) return null; return {label,value};
    }
    return null;
  }).filter(Boolean).slice(0,40);
}
function buildSafeCartItems(cartItems) {
  return cartItems.map(item=>({
    id:sanitizeText(item.id,120), productId:sanitizeText(item.id||item.productId,120),
    lineId:sanitizeText(item.lineId,320), name:sanitizeText(item.name,160),
    price:Number(item.price)||0, basePrice:Number(item.basePrice??item.price??0)||0,
    optionPriceTotal:Number(item.optionPriceTotal||0)||0,
    qty:Math.max(1,Number(item.qty)||1), image:sanitizeOptionalText(item.image,500),
    shop:normalizeShop(item.shop), selectedOptions:sanitizeSelectedOptions(item.selectedOptions),
    selectedOptionsLabel:sanitizeOptionalText(item.selectedOptionsLabel,240),
    selectedOptionDetails:sanitizeSelectedOptionDetails(item.selectedOptionDetails),
    customizations:sanitizeCustomizations(item.customizations),
    shipsFromAbroad:item.shipsFromAbroad===true, abroadDeliveryFee:getItemAbroadDeliveryFee(item),
    inStock:item.inStock!==false, stock:getNumericStock(item),
    sellerDeliveryMethod: sanitizeText(item.sellerDeliveryMethod || "", 20),
  }));
}
function isOrderSuccessfullyPaid(order) {
  const s=String(order?.status||"").trim().toLowerCase();
  const ps=String(order?.paymentStatus||"").trim().toLowerCase();
  return order?.paid===true||ps==="paid"||["paid","processing","shipped","delivered"].includes(s);
}

/* ── icons ── */
function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="2"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9"/><path d="M12 10.2v5" strokeLinecap="round"/><circle cx="12" cy="7.2" r="1.1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function ShieldIcon({ size=13 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

/* ── Courier badge pill ── */
function CourierBadge({ id }) {
  const map = {
    cheetah:      { label:"CHX", bg:"#111",    fg:"#fff"    },
    glovo:        { label:"GVO", bg:"#00A082", fg:"#fff"    },
    kwikdelivery: { label:"KWK", bg:"#046EF2", fg:"#fff"    },
    dhl:          { label:"DHL", bg:"#FFCC00", fg:"#D40511" },
  };
  const b = map[id] || { label:"DEL", bg:"#6B7280", fg:"#fff" };
  return (
    <div style={{
      width:38, height:22, borderRadius:5, background:b.bg, color:b.fg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:9, fontWeight:900, letterSpacing:"0.06em", flexShrink:0,
    }}>{b.label}</div>
  );
}

/* ── Anti-Scam Safety Banner ── */
function SafetyBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="co-safety-banner" role="alert">
      <div className="co-safety-banner__icon"><ShieldIcon size={20} /></div>
      <div className="co-safety-banner__body">
        <strong>Always pay through Beme Market — never pay sellers directly</strong>
        <p>
          Your purchase is protected only when you complete payment through this checkout.
          Sending money directly to a seller via MoMo, bank transfer, or WhatsApp means
          {" "}<strong>Beme Market cannot issue a refund</strong> — no exceptions.
          Stay protected: pay here only.
        </p>
      </div>
      <button type="button" className="co-safety-banner__close" onClick={() => setDismissed(true)} aria-label="Dismiss safety notice">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */
export default function Checkout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { cartItems, clearCart, itemCount } = useCart();
  const { user, loading: authLoading } = useAuth();

  const searchParams   = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const cancelledPayment = searchParams.get("payment") === "cancelled";

  /* ── state ── */
  const [method,                 setMethod]                 = useState("");
  const [loading,                setLoading]                = useState(false);
  const [loadingMode,            setLoadingMode]            = useState("");
  const [form,                   setForm]                   = useState(INITIAL_FORM);
  const [delivery,               setDelivery]               = useState(INITIAL_DELIVERY);
  const [touched,                setTouched]                = useState({});
  const [errors,                 setErrors]                 = useState({});
  const [timeLeft,               setTimeLeft]               = useState(CHECKOUT_DURATION_SECONDS);
  const [sessionExpired,         setSessionExpired]         = useState(false);
  const [showCODInfo,            setShowCODInfo]            = useState(false);
  const [checkingOrderHistory,   setCheckingOrderHistory]   = useState(true);
  const [hasSuccessfulPaidOrder, setHasSuccessfulPaidOrder] = useState(false);
  const [paystackError,          setPaystackError]          = useState("");
  /* momo ui */
  const [showPaymentLoader,      setShowPaymentLoader]      = useState(false);
  const [paymentLoaderMethod,    setPaymentLoaderMethod]    = useState("");
  const [showMomoScreen,         setShowMomoScreen]         = useState(null);

  const feedbackTimerRef = useRef(null);

  /* ── effects (all unchanged from doc 5) ── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/login", { replace: true, state: { from: location.pathname } });
  }, [user, authLoading, navigate, location.pathname]);

  useEffect(() => {
    if (user?.email) setForm(prev => ({ ...prev, email: prev.email || user.email }));
  }, [user]);

  useEffect(() => {
    const restore = () => { setLoading(false); setLoadingMode(""); };
    const handleVis = () => { if (document.visibilityState === "visible") restore(); };
    window.addEventListener("pageshow", restore);
    window.addEventListener("focus", restore);
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("focus", restore);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (authLoading) return;
      if (!user?.uid) { if (active) { setHasSuccessfulPaidOrder(false); setCheckingOrderHistory(false); } return; }
      setCheckingOrderHistory(true);
      try {
        const data = await getMyOrders();
        if (!active) return;
        const rows = Array.isArray(data?.orders) ? data.orders : [];
        setHasSuccessfulPaidOrder(rows.some(isOrderSuccessfullyPaid));
      } catch (e) {
        console.error("Failed to check order history:", e);
        if (!active) return;
        setHasSuccessfulPaidOrder(false);
      } finally {
        if (active) setCheckingOrderHistory(false);
      }
    };
    check();
    return () => { active = false; };
  }, [user, authLoading]);

  /* ── derived ── */
  const safeCartItems     = useMemo(() => buildSafeCartItems(cartItems), [cartItems]);
  const subtotalUI        = useMemo(() => safeCartItems.reduce((s, i) => s + (Number(i.price)||0)*(Number(i.qty)||0), 0), [safeCartItems]);
  const citiesForRegion   = useMemo(() => { if (!form.region) return []; return CITY_MAP[form.region] || DEFAULT_OTHER_CITIES; }, [form.region]);
  const normalizedPhone   = useMemo(() => normalizeGhanaPhone(form.phone), [form.phone]);
  const network           = useMemo(() => detectNetwork(normalizedPhone), [normalizedPhone]);
  const cartShops         = useMemo(() => Array.from(new Set(safeCartItems.map(i => normalizeShop(i.shop)))).filter(Boolean), [safeCartItems]);
  const hasShippedFromAbroadItem = useMemo(() => safeCartItems.some(i => i?.shipsFromAbroad === true), [safeCartItems]);
  const unavailableCartItems     = useMemo(() => safeCartItems.map(i => ({ ...i, unavailableReason: getUnavailableReason(i) })).filter(i => i.unavailableReason), [safeCartItems]);
  const hasUnavailableCartItems  = unavailableCartItems.length > 0;
  const needsFirstSuccessfulPaystackOrder = !checkingOrderHistory && !hasSuccessfulPaidOrder;

  /* Seller delivery plan flags */
  const hasAnySellerDirectOnly = useMemo(() =>
    safeCartItems.some(i => i.sellerDeliveryMethod === "self" || (!i.sellerDeliveryMethod && i.shop !== "main" && i.shop !== "admin")),
  [safeCartItems]);

  const codDisabledReason = useMemo(() => {
    if (hasUnavailableCartItems)           return "Pay on Delivery is unavailable because your cart contains unavailable items.";
    if (hasShippedFromAbroadItem)          return "Pay on Delivery is unavailable because your cart contains a shipped from abroad item.";
    if (needsFirstSuccessfulPaystackOrder) return "Pay on Delivery is unavailable until you complete your first successful Paystack payment.";
    return "";
  }, [hasUnavailableCartItems, hasShippedFromAbroadItem, needsFirstSuccessfulPaystackOrder]);

  const isCODBlocked   = !!codDisabledReason;
  const isFinalMinute  = timeLeft <= 60 && !sessionExpired;
  const inputsDisabled = loading || sessionExpired;
  const formattedTimeLeft = formatTime(timeLeft);

  /* Delivery fee */
  const selectedProvider = useMemo(() =>
    DELIVERY_PROVIDERS.find(p => p.id === delivery.method) || null,
  [delivery.method]);

  const courierDeliveryFeeUI = useMemo(() => {
    if (!selectedProvider) return 0;
    return getProviderFee(selectedProvider, form.region);
  }, [selectedProvider, form.region]);

  const abroadDeliveryFeeUI = useMemo(() =>
    safeCartItems.reduce((s, i) => s + getItemAbroadDeliveryFee(i)*(Number(i.qty)||0), 0),
  [safeCartItems]);

  const deliveryFeeUI = useMemo(() => courierDeliveryFeeUI + abroadDeliveryFeeUI, [courierDeliveryFeeUI, abroadDeliveryFeeUI]);
  const totalUI       = useMemo(() => subtotalUI + deliveryFeeUI, [subtotalUI, deliveryFeeUI]);

  const selectedDeliverySummary = useMemo(() => {
    if (!delivery.method) return null;
    if (delivery.method === SELLER_DIRECT_ID) return { title: "Arrange with Seller", note: "Contact seller to agree on delivery", isBeme: false };
    if (!selectedProvider) return null;
    const fee = getProviderFee(selectedProvider, form.region);
    const eta = getProviderEta(selectedProvider, form.region);
    return { title: selectedProvider.name, note: form.region ? `${eta} · GHS ${fee.toFixed(2)}` : "Select region to see fee", isBeme: true };
  }, [delivery.method, selectedProvider, form.region]);

  /* ── side-effects ── */
  useEffect(() => { if (isCODBlocked && method === "cod") setMethod(""); }, [isCODBlocked, method]);

  /* Reset Glovo if region changes to non-Accra */
  useEffect(() => {
    if (form.region && form.region !== "Greater Accra" && delivery.method === "glovo") {
      setDelivery(INITIAL_DELIVERY);
    }
  }, [form.region, delivery.method]);

  useEffect(() => {
    if (sessionExpired) return;
    const timer = window.setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { window.clearInterval(timer); setSessionExpired(true); return 0; } return prev - 1; });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionExpired]);

  /* ── handlers ── */
  const setField = (key) => (e) => {
    if (sessionExpired) return;
    const value = e.target.value;
    if (key === "region") { setForm(prev => ({ ...prev, region: value, city: "" })); setDelivery(INITIAL_DELIVERY); return; }
    setForm(prev => ({ ...prev, [key]: value }));
  };
  const setDeliveryMethod = (next) => { if (sessionExpired || loading) return; setDelivery({ method: next }); setTouched(p => ({ ...p, deliveryMethod: true })); };
  const markTouched = (key) => () => setTouched(p => ({ ...p, [key]: true }));

  const validate = (v) => {
    const next = {};
    if (!user && !authLoading) next.auth = "Please login before checkout.";
    if (!v.email.trim()) next.email = "Email is required."; else if (!isValidEmail(v.email)) next.email = "Enter a valid email address.";
    if (!v.firstName.trim()) next.firstName = "First name is required."; else if (!isValidName(v.firstName)) next.firstName = "Use letters only.";
    if (!v.lastName.trim()) next.lastName = "Last name is required."; else if (!isValidName(v.lastName)) next.lastName = "Use letters only.";
    if (!v.address.trim()) next.address = "Address is required."; else if (!isValidGhanaAddress(v.address)) next.address = "Enter a valid address.";
    if (!v.region) next.region = "Select a region.";
    if (!v.city) next.city = "Select a city.";
    if (!v.area.trim()) next.area = "Area / locality is required."; else if (v.area.trim().length < 2) next.area = "Area is too short.";
    if (!v.phone.trim()) next.phone = "Phone is required."; else if (!normalizedPhone) next.phone = "Use 0XXXXXXXXX or +233XXXXXXXXX."; else if (!network) next.phone = "Phone must be MTN, Telecel, or AirtelTigo.";
    if (!safeCartItems.length) next.cart = "Your cart is empty."; else if (hasUnavailableCartItems) next.cart = "Some items are out of stock. Update your cart.";
    if (!delivery.method) next.deliveryMethod = "Please select a delivery option.";
    if (!method) next.paymentMethod = "Please select a payment method.";
    return next;
  };

  useEffect(() => {
    setErrors(validate(form));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, form.email, form.firstName, form.lastName, form.phone, form.address, form.region, form.city, form.area, safeCartItems, hasUnavailableCartItems, normalizedPhone, network, method, delivery.method]);

  const showError = (key) => touched[key] && errors[key];

  const validateRequired = () => {
    if (sessionExpired) { alert("Checkout session expired. Please restart checkout."); return "Checkout session expired."; }
    const next = validate(form);
    setErrors(next);
    setTouched({ email: true, firstName: true, lastName: true, phone: true, address: true, region: true, city: true, area: true, deliveryMethod: true, paymentMethod: true });
    return Object.values(next)[0] || null;
  };

  const restartCheckout = () => {
    setForm({ ...INITIAL_FORM, email: user?.email || "" });
    setDelivery(INITIAL_DELIVERY); setTouched({}); setErrors({}); setMethod(""); setLoading(false); setLoadingMode(""); setSessionExpired(false); setTimeLeft(CHECKOUT_DURATION_SECONDS); setShowCODInfo(false); setShowMomoScreen(null); setShowPaymentLoader(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const dismissCancelledNotice = () => {
    const next = new URLSearchParams(location.search);
    next.delete("payment");
    navigate({ pathname: location.pathname, search: next.toString() ? `?${next.toString()}` : "" }, { replace: true });
  };

  const buildDeliveryPayload = () => {
    const isSellerDirect = delivery.method === SELLER_DIRECT_ID;
    const provider = selectedProvider;
    return {
      method:   delivery.method,
      provider: provider?.name || (isSellerDirect ? "Seller Arranged" : ""),
      label:    provider ? `${provider.name} Delivery` : (isSellerDirect ? "Seller Arranged Delivery" : ""),
      fee:      deliveryFeeUI,
      isBeme:   !isSellerDirect,
      region:   form.region,
      eta:      provider ? getProviderEta(provider, form.region) : "",
      breakdown: {
        courierFee:     courierDeliveryFeeUI,
        abroadFee:      abroadDeliveryFeeUI,
        sellerArranged: isSellerDirect,
      },
    };
  };

  const buildOrderPayload = (paymentMethod) => {
    const items = safeCartItems.map(item => ({
      id: item.id||"", productId: item.productId||item.id||"", name: item.name||"",
      price: Number(item.price)||0, basePrice: Number(item.basePrice??item.price??0)||0,
      optionPriceTotal: Number(item.optionPriceTotal||0)||0, qty: Number(item.qty)||1,
      image: item.image||"", shop: normalizeShop(item.shop),
      selectedOptions: item.selectedOptions||{}, selectedOptionsLabel: item.selectedOptionsLabel||"",
      selectedOptionDetails: Array.isArray(item.selectedOptionDetails) ? item.selectedOptionDetails : [],
      customizations: Array.isArray(item.customizations) ? item.customizations : [],
      shipsFromAbroad: item.shipsFromAbroad===true, abroadDeliveryFee: getItemAbroadDeliveryFee(item),
      inStock: item.inStock!==false, stock: getNumericStock(item),
    }));
    const shops = Array.from(new Set(items.map(i => i.shop))).filter(Boolean);
    return {
      customer: { email: sanitizeText(form.email,160).toLowerCase(), firstName: sanitizeText(form.firstName,80), lastName: sanitizeText(form.lastName,80), phone: normalizedPhone, address: sanitizeText(form.address,300), region: sanitizeText(form.region,80), city: sanitizeText(form.city,80), area: sanitizeText(form.area,120), notes: sanitizeOptionalText(form.notes,500), country: "Ghana", network, userId: user?.uid||"" },
      delivery: buildDeliveryPayload(), items, shops, primaryShop: shops[0]||"main",
      pricing: { subtotal: subtotalUI, deliveryFee: deliveryFeeUI, total: totalUI, currency: "GHS" },
      paymentMethod, paymentStatus: "pending", status: paymentMethod === "cod" ? "pending" : "pending_payment", source: "web",
    };
  };

  const placeCOD = async () => {
    if (loading || sessionExpired || isCODBlocked || checkingOrderHistory || hasUnavailableCartItems) return;
    const err = validateRequired(); if (err) return;
    setLoadingMode("cod"); setLoading(true);
    try {
      const payload = buildOrderPayload("cod");
      const result  = await createCodOrder(payload);
      const createdOrderId = result?.order?.id || result?.id || "";
      clearCart();
      navigate(`/order-success?status=success${createdOrderId ? `&orderId=${encodeURIComponent(createdOrderId)}` : ""}`, { replace: true });
    } catch (e) {
      console.error("COD order failed:", e);
      alert(e?.message ? `Failed to place order: ${e.message}` : "Failed to place order. Try again.");
      setLoading(false); setLoadingMode("");
    }
  };

  const payWithPaystack = async () => {
    setPaystackError("");
    if (loading || sessionExpired || checkingOrderHistory || hasUnavailableCartItems || !user) return;
    setLoadingMode("paystack"); setLoading(true);
    setTouched({ email: true, firstName: true, lastName: true, phone: true, address: true, region: true, city: true, area: true, deliveryMethod: true, paymentMethod: true });
    const currentErrors = validate(form);
    const firstError = Object.values(currentErrors)[0];
    if (firstError) { setPaystackError(firstError); setLoading(false); setLoadingMode(""); return; }

    // ✅ FIX: Get a fresh Firebase ID token directly from the user object in
    // the component — where we know for certain the user is authenticated.
    // This bypasses the getAuthHeaders() path in api.js which was failing.
    // Also handles Render cold-starts: the 55 s timeout in api.js now gives
    // the service enough time to wake up before the request is aborted.
    let authToken;
    try {
      authToken = await user.getIdToken(true);
    } catch (tokenErr) {
      console.error("❌ Token fetch failed (attempt 1):", tokenErr);
      try {
        authToken = await user.getIdToken(false);
      } catch (retryErr) {
        console.error("❌ Token fetch failed (attempt 2):", retryErr);
        setPaystackError("Authentication failed. Please refresh the page and try again.");
        setLoading(false); setLoadingMode(""); return;
      }
    }

    try {
      await startPaystackCheckout({
        email: sanitizeText(form.email, 160).toLowerCase(),
        cartItems: safeCartItems.map(item => ({ ...item, qty: Number(item.qty)||1, price: Number(item.price)||0, basePrice: Number(item.basePrice??item.price??0)||0, optionPriceTotal: Number(item.optionPriceTotal||0)||0 })),
        delivery: buildDeliveryPayload(),
        pricing: { subtotal: subtotalUI, deliveryFee: deliveryFeeUI, total: totalUI, currency: "GHS" },
        customer: { userId: user?.uid||"", firstName: sanitizeText(form.firstName,80), lastName: sanitizeText(form.lastName,80), phone: normalizedPhone||"", network: network||"", address: sanitizeText(form.address,300), region: sanitizeText(form.region,80), city: sanitizeText(form.city,80), area: sanitizeText(form.area,120), notes: sanitizeOptionalText(form.notes,500), country: "Ghana" },
        authToken, // pre-fetched token — paystackInit uses requestWithToken() directly
      });
      setLoading(false); setLoadingMode("");
    } catch (e) {
      setPaystackError(e?.message || "Payment failed. Please try again.");
      setLoading(false); setLoadingMode("");
    }
  };

  const handleMomoCheckout = (type) => {
    const err = validateRequired();
    if (err) return;
    setPaymentLoaderMethod(type === "mtn" ? "MTN Mobile Money" : "Telecel Cash");
    setShowPaymentLoader(true);
    setTimeout(() => {
      setShowPaymentLoader(false);
      setShowMomoScreen(type);
    }, 2200);
  };

  const handleCheckout = () => {
    if (method === "paystack") payWithPaystack();
    else if (method === "mtn")     handleMomoCheckout("mtn");
    else if (method === "telecel") handleMomoCheckout("telecel");
    else if (method === "cod")     placeCOD();
  };

  const handleMethodChange = (e) => {
    const value = e.target.value;
    setTouched(p => ({ ...p, paymentMethod: true }));
    if (!value) { setMethod(""); setShowCODInfo(false); return; }
    if (value === "cod" && isCODBlocked) { setMethod(""); setShowCODInfo(true); return; }
    setMethod(value); setShowCODInfo(false);
  };

  /* step logic */
  const currentStep = !delivery.method ? 1 : !method ? 2 : 3;

  const payBtnLabel =
    method === "paystack" ? "Pay with Paystack" :
    method === "mtn"      ? "Pay with MTN MoMo" :
    method === "telecel"  ? "Pay with Telecel Cash" :
    method === "cod"      ? "Place Order — Pay on Delivery" : "";

  const isCheckoutDisabled =
    inputsDisabled || !!errors.cart || !user || authLoading ||
    checkingOrderHistory || hasUnavailableCartItems ||
    (method === "cod" && isCODBlocked);

  /* ─────────────────────── RENDER ─────────────────────── */
  return (
    <div className="co-page">

      {/* ── Payment Validation Loader ── */}
      {showPaymentLoader && (
        <div className="co-pay-loader">
          <div className="co-pay-loader__inner">
            <div className="co-pay-loader__spinner" />
            <p className="co-pay-loader__title">Validating payment</p>
            <p className="co-pay-loader__sub">via {paymentLoaderMethod}</p>
          </div>
        </div>
      )}

      {/* ── MoMo USSD Screen (unchanged from doc 5) ── */}
      {showMomoScreen && (
        <div className="co-momo-overlay">
          <div className="co-momo-screen">
            <button type="button" className="co-momo-back" onClick={() => setShowMomoScreen(null)}>
              <ChevronLeftIcon /> Back
            </button>
            <div className="co-momo-icon">
              <span /><span /><span />
            </div>
            <h2 className="co-momo-title">We are waiting for you</h2>
            <p className="co-momo-sub">
              Please follow the instructions below. Only leave this page to authorise the payment in another app or window.
            </p>
            <p className="co-momo-time-note">This may take up to 2 minutes.</p>
            <div className="co-momo-card">
              <p>You should receive a prompt on your mobile number to enter your PIN to authorize the payment.</p>
              <p>If you do not receive the prompt within 10 seconds, follow the instructions below:</p>
              <ol>
                {showMomoScreen === "mtn" ? (
                  <>
                    <li>Dial <strong>*170#</strong> to see the main MTN USSD menu</li>
                    <li>If the prompt appears instead, cancel it and dial *170# again</li>
                    <li>Choose <strong>6) My Wallet</strong></li>
                    <li>Choose <strong>3) My Approvals</strong></li>
                    <li>Enter your PIN to proceed</li>
                    <li>Look for the transaction and follow the prompts to authorise it. Make sure the amount is correct</li>
                    <li>You have 5 mins to authorise the transaction so if anything goes wrong, simply dial and try again</li>
                  </>
                ) : (
                  <>
                    <li>Dial <strong>*110#</strong> to see the main Telecel USSD menu</li>
                    <li>If the prompt appears instead, cancel it and dial *110# again</li>
                    <li>Choose <strong>6) My Wallet</strong></li>
                    <li>Choose <strong>5) My Approvals</strong></li>
                    <li>Enter your PIN to proceed</li>
                    <li>Look for the transaction and follow the prompts to authorise it. Make sure the amount is correct</li>
                    <li>You have 5 minutes to authorise the transaction, so if anything goes wrong, simply dial and try again</li>
                  </>
                )}
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="co-wrap">

        {/* ── Anti-Scam Safety Banner ── */}
        <SafetyBanner />

        {/* cancelled notice */}
        {cancelledPayment && (
          <div className="co-notice" role="status" aria-live="polite">
            <div className="co-notice__body">
              <strong>Payment cancelled.</strong>
              <span>Your order was not completed. Review your details and try again.</span>
            </div>
            <button type="button" className="co-notice__close" onClick={dismissCancelledNotice} aria-label="Dismiss">×</button>
          </div>
        )}

        {/* timer */}
        <div className={`co-timer${isFinalMinute ? " co-timer--warn" : ""}${sessionExpired ? " co-timer--expired" : ""}`}>
          <div className="co-timer__left">
            <span className="co-timer__label">Session</span>
            <span className="co-timer__time">{formattedTimeLeft}</span>
          </div>
          <div className="co-timer__right">
            {sessionExpired ? (
              <>
                <p className="co-timer__msg">Session expired. Please restart.</p>
                <button type="button" className="co-timer__btn" onClick={restartCheckout}>Restart</button>
              </>
            ) : (
              <p className="co-timer__msg">
                {isFinalMinute ? "Final minute — complete your order now." : "Complete your order within 10 minutes."}
              </p>
            )}
          </div>
        </div>

        {/* title */}
        <h1 className="co-page-title">Checkout</h1>

        {/* steps */}
        <div className="co-steps">
          {[{ n: 1, label: "Shipping" }, { n: 2, label: "Delivery" }, { n: 3, label: "Payment" }].map((s, i) => (
            <div key={s.n} className={`co-step${currentStep === s.n ? " co-step--active" : ""}${currentStep > s.n ? " co-step--done" : ""}`}>
              <div className="co-step__circle">
                {currentStep > s.n ? <CheckIcon /> : <span>{s.n}</span>}
              </div>
              <span className="co-step__label">{s.label}</span>
              {i < 2 && <div className="co-step__line" />}
            </div>
          ))}
        </div>

        {paystackError && <div className="co-error">{paystackError}</div>}

        {!safeCartItems.length ? (
          <div className="co-empty">
            <div className="co-empty__card">
              <h2>Your cart is empty</h2>
              <p>Add products to your cart before proceeding to checkout.</p>
              <div className="co-empty__actions">
                <Link to="/shop" className="co-link-btn">Go to shop</Link>
                <Link to="/"    className="co-link-btn co-link-btn--ghost">Back home</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="co-grid">

            {/* ── LEFT: Form ── */}
            <div className="co-form">
              {errors.auth && <div className="co-error">{errors.auth}</div>}
              {errors.cart && <div className="co-error">{errors.cart}</div>}

              {/* Contact */}
              <div className="co-section">
                <span className="co-section__eyebrow">Step 01</span>
                <h2 className="co-section__title">Contact</h2>
                <input className="co-input" placeholder="Email address" value={form.email} onBlur={markTouched("email")} onChange={setField("email")} disabled={inputsDisabled} />
                {showError("email") && <div className="co-field-error">{errors.email}</div>}
              </div>

              {/* Shipping */}
              <div className="co-section">
                <span className="co-section__eyebrow">Step 01</span>
                <h2 className="co-section__title">Shipping address</h2>
                <select className="co-input" value="Ghana" disabled><option>Ghana</option></select>
                <div className="co-row2">
                  <div>
                    <input className="co-input" placeholder="First name" value={form.firstName} onBlur={markTouched("firstName")} onChange={setField("firstName")} disabled={inputsDisabled} />
                    {showError("firstName") && <div className="co-field-error">{errors.firstName}</div>}
                  </div>
                  <div>
                    <input className="co-input" placeholder="Last name" value={form.lastName} onBlur={markTouched("lastName")} onChange={setField("lastName")} disabled={inputsDisabled} />
                    {showError("lastName") && <div className="co-field-error">{errors.lastName}</div>}
                  </div>
                </div>
                <input className="co-input" placeholder="Address (House No., Street, Landmark)" value={form.address} onBlur={markTouched("address")} onChange={setField("address")} disabled={inputsDisabled} />
                {showError("address") && <div className="co-field-error">{errors.address}</div>}
                <div className="co-row2">
                  <div>
                    <select className="co-input" value={form.region} onBlur={markTouched("region")} onChange={setField("region")} disabled={inputsDisabled}>
                      <option value="">Select region</option>
                      {GH_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {showError("region") && <div className="co-field-error">{errors.region}</div>}
                  </div>
                  <div>
                    <select className="co-input" value={form.city} onBlur={markTouched("city")} onChange={setField("city")} disabled={inputsDisabled || !form.region}>
                      <option value="">{form.region ? "Select city" : "Region first"}</option>
                      {citiesForRegion.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {showError("city") && <div className="co-field-error">{errors.city}</div>}
                  </div>
                </div>
                <input className="co-input" placeholder="Area / Locality (e.g., East Legon)" value={form.area} onBlur={markTouched("area")} onChange={setField("area")} disabled={inputsDisabled} />
                {showError("area") && <div className="co-field-error">{errors.area}</div>}
                <input className="co-input" placeholder="Phone (0XXXXXXXXX or +233XXXXXXXXX)" value={form.phone} onBlur={markTouched("phone")} onChange={setField("phone")} disabled={inputsDisabled} />
                {showError("phone") && <div className="co-field-error">{errors.phone}</div>}
                {normalizedPhone && network && (
                  <div className="co-network-hint">
                    <CheckIcon /> Network: <strong>{network}</strong>&nbsp;({normalizedPhone})
                  </div>
                )}
                <textarea className="co-input co-textarea" placeholder="Delivery notes (optional)" value={form.notes} onChange={setField("notes")} disabled={inputsDisabled} />
              </div>

              {/* ── Delivery ── */}
              <div className="co-section">
                <span className="co-section__eyebrow">Step 02</span>
                <h2 className="co-section__title">Delivery method</h2>

                <p className="co-del-intro">
                  Delivered via our courier partners. Select your region above to see live fees and times.
                  {!form.region && <span className="co-del-intro__note"> ← Do this first.</span>}
                </p>

                {/* 4 courier cards — 2×2 grid */}
                <div className="co-del-grid co-del-grid--couriers">
                  {DELIVERY_PROVIDERS.map(p => {
                    const accraOnly    = p.accrOnly === true;
                    const unavailable  = accraOnly && form.region && form.region !== "Greater Accra";
                    const fee          = form.region ? getProviderFee(p, form.region) : null;
                    const eta          = form.region ? getProviderEta(p, form.region) : null;
                    const isActive     = delivery.method === p.id;
                    return (
                      <button key={p.id} type="button"
                        className={`co-del-card co-del-card--courier${isActive ? " co-del-card--active" : ""}${unavailable ? " co-del-card--unavail" : ""}`}
                        onClick={() => !unavailable && setDeliveryMethod(p.id)}
                        disabled={inputsDisabled || unavailable}
                        title={unavailable ? `${p.name} only delivers within Greater Accra` : ""}>
                        <div className="co-del-card__head">
                          <CourierBadge id={p.id} />
                          <span className="co-del-card__name">{p.name}</span>
                          {isActive && <span className="co-del-card__check"><CheckIcon /></span>}
                        </div>
                        <span className="co-del-card__tag">{p.tagline}</span>
                        <div className="co-del-card__foot">
                          {unavailable ? (
                            <span className="co-del-card__only">Accra only</span>
                          ) : fee !== null ? (
                            <>
                              <strong className="co-del-card__fee">GHS {fee.toFixed(2)}</strong>
                              <span className="co-del-card__eta">{eta}</span>
                            </>
                          ) : (
                            <span className="co-del-card__eta">Select region for fee</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Seller-direct option (only shown when relevant) */}
                {hasAnySellerDirectOnly && (
                  <>
                    <div className="co-del-or"><span>or</span></div>

                    <div className="co-seller-warn">
                      <div className="co-seller-warn__icon"><AlertIcon /></div>
                      <div className="co-seller-warn__text">
                        <strong>Seller-arranged delivery</strong>
                        <p>
                          One or more sellers in your cart manage their own delivery (Basic / Starter plan).
                          Choose this option only if you plan to contact the seller directly via WhatsApp or Beme chat
                          to agree on a delivery fee and schedule.
                          <strong> Beme Market does not cover or refund seller-arranged deliveries.</strong>
                        </p>
                      </div>
                    </div>

                    <button type="button"
                      className={`co-del-card co-del-card--seller${delivery.method === SELLER_DIRECT_ID ? " co-del-card--active" : ""}`}
                      onClick={() => setDeliveryMethod(SELLER_DIRECT_ID)}
                      disabled={inputsDisabled}>
                      <div className="co-del-card__head">
                        <div className="co-del-card__truck"><TruckIcon /></div>
                        <span className="co-del-card__name">Arrange with Seller</span>
                        {delivery.method === SELLER_DIRECT_ID && <span className="co-del-card__check"><CheckIcon /></span>}
                      </div>
                      <span className="co-del-card__tag">Contact seller to agree on terms</span>
                      <div className="co-del-card__foot">
                        <strong className="co-del-card__fee co-del-card__fee--free">Free*</strong>
                        <span className="co-del-card__eta">Seller sets fee &amp; schedule</span>
                      </div>
                    </button>
                  </>
                )}

                {showError("deliveryMethod") && <div className="co-field-error">{errors.deliveryMethod}</div>}

                {selectedDeliverySummary && (
                  <div className="co-review-pill">
                    <span className="co-review-pill__eye">Delivery selected</span>
                    <strong className="co-review-pill__title">{selectedDeliverySummary.title}</strong>
                    <p className="co-review-pill__note">{selectedDeliverySummary.note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Payment + Summary ── */}
            <div className="co-right">

              {/* Payment */}
              <div className="co-section">
                <span className="co-section__eyebrow">Step 03</span>
                <h2 className="co-section__title">Payment</h2>

                <div className="co-pay-methods">
                  {/* Paystack */}
                  <label className={`co-pay-card${method === "paystack" ? " co-pay-card--active" : ""}`}>
                    <input type="radio" name="payMethod" value="paystack" checked={method === "paystack"} onChange={handleMethodChange} disabled={inputsDisabled || checkingOrderHistory} className="co-pay-radio" />
                    <img src="/Paystack logo.JPG" alt="Paystack" className="co-pay-logo" onError={e => { e.currentTarget.style.display = "none"; }} />
                    <div className="co-pay-info">
                      <span className="co-pay-name">Pay with Paystack</span>
                      <span className="co-pay-desc">Card, bank transfer & more</span>
                    </div>
                    <div className="co-pay-bullet" aria-hidden="true" />
                  </label>

                  {/* MTN */}
                  <label className={`co-pay-card${method === "mtn" ? " co-pay-card--active" : ""}`}>
                    <input type="radio" name="payMethod" value="mtn" checked={method === "mtn"} onChange={handleMethodChange} disabled={inputsDisabled} className="co-pay-radio" />
                    <img src="/MTN logo.JPG" alt="MTN" className="co-pay-logo" onError={e => { e.currentTarget.style.display = "none"; }} />
                    <div className="co-pay-info">
                      <span className="co-pay-name">MTN Mobile Money</span>
                      <span className="co-pay-desc">Pay with MTN MoMo</span>
                    </div>
                    <div className="co-pay-bullet" aria-hidden="true" />
                  </label>

                  {/* Telecel */}
                  <label className={`co-pay-card${method === "telecel" ? " co-pay-card--active" : ""}`}>
                    <input type="radio" name="payMethod" value="telecel" checked={method === "telecel"} onChange={handleMethodChange} disabled={inputsDisabled} className="co-pay-radio" />
                    <img src="/Telecel logo.JPG" alt="Telecel" className="co-pay-logo" onError={e => { e.currentTarget.style.display = "none"; }} />
                    <div className="co-pay-info">
                      <span className="co-pay-name">Telecel Cash</span>
                      <span className="co-pay-desc">Pay with Telecel Cash</span>
                    </div>
                    <div className="co-pay-bullet" aria-hidden="true" />
                  </label>

                  {/* COD */}
                  <label className={`co-pay-card co-pay-card--cod${method === "cod" ? " co-pay-card--active" : ""}${isCODBlocked ? " co-pay-card--blocked" : ""}`}>
                    <input type="radio" name="payMethod" value="cod" checked={method === "cod"} onChange={handleMethodChange} disabled={inputsDisabled || isCODBlocked} className="co-pay-radio" />
                    <div className="co-pay-icon-wrap"><TruckIcon /></div>
                    <div className="co-pay-info">
                      <span className="co-pay-name">Pay on Delivery{isCODBlocked ? " (Unavailable)" : ""}</span>
                      {isCODBlocked
                        ? <span className="co-pay-desc co-pay-desc--warn">Not available for your order</span>
                        : <span className="co-pay-desc">Pay when your order arrives</span>
                      }
                    </div>
                    <div className="co-pay-bullet" aria-hidden="true" />
                  </label>
                </div>

                {showError("paymentMethod") && <div className="co-field-error">{errors.paymentMethod}</div>}
                {checkingOrderHistory && <p className="co-hint">Checking eligibility…</p>}

                {(showCODInfo || (method === "cod" && isCODBlocked)) && (
                  <div className="co-info-panel">
                    <div className="co-info-panel__icon"><InfoIcon /></div>
                    <div>
                      <strong>Pay on Delivery notice</strong>
                      <p>{codDisabledReason || "Pay on Delivery is available once your cart and account qualify."}</p>
                    </div>
                  </div>
                )}

                {method && (
                  <div className="co-cta-stack">
                    <button type="button" className="co-btn co-btn--primary" onClick={handleCheckout} disabled={isCheckoutDisabled}>
                      <span className="co-btn__label">{payBtnLabel}</span>
                      <span className="co-btn__amount">GHS {totalUI.toFixed(2)}</span>
                    </button>
                    <div className="co-secure">
                      <ShieldIcon /> Secured · All payments encrypted via Beme Market
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="co-summary">
                <div className="co-summary__head">
                  <h3 className="co-summary__title">Order Summary</h3>
                  <span className="co-summary__count">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                </div>

                {hasUnavailableCartItems && (
                  <div className="co-error" style={{ marginBottom: 14 }}>Some items are unavailable. Remove or reduce quantity.</div>
                )}

                {safeCartItems.map((item, index) => {
                  const reason    = getUnavailableReason(item);
                  const abroadFee = getItemAbroadDeliveryFee(item);
                  return (
                    <div key={item.lineId || `${item.id}-${index}`} className="co-sum-item">
                      <div className="co-sum-item__thumb">
                        {item.image
                          ? <img src={item.image} alt={item.name || "Product"} />
                          : <div className="co-sum-item__thumb-empty">No image</div>
                        }
                      </div>
                      <div className="co-sum-item__info">
                        <p className="co-sum-item__name">{item.name}</p>
                        {item.selectedOptionsLabel && <span className="co-sum-item__opts">{item.selectedOptionsLabel}</span>}
                        {item.shipsFromAbroad && <span className="co-sum-item__opts co-sum-item__opts--abroad">Ships from abroad{abroadFee > 0 ? ` · Fee: GHS ${abroadFee.toFixed(2)} each` : ""}</span>}
                        {reason && <span className="co-sum-item__opts co-sum-item__opts--err">{reason}</span>}
                        <span className="co-sum-item__qty">Qty: {item.qty}</span>
                      </div>
                      <span className="co-sum-item__price">GHS {(Number(item.price) * Number(item.qty)).toFixed(2)}</span>
                    </div>
                  );
                })}

                <div className="co-sum-divider" />
                <div className="co-sum-line"><span>Subtotal</span><span>GHS {subtotalUI.toFixed(2)}</span></div>
                <div className="co-sum-line">
                  <span>Delivery<small>{selectedDeliverySummary ? selectedDeliverySummary.title : "Select a courier above"}</small></span>
                  <span>GHS {courierDeliveryFeeUI.toFixed(2)}</span>
                </div>
                {abroadDeliveryFeeUI > 0 && (
                  <div className="co-sum-line">
                    <span>Abroad delivery fee<small>Shipped abroad items</small></span>
                    <span>GHS {abroadDeliveryFeeUI.toFixed(2)}</span>
                  </div>
                )}
                <div className="co-sum-total">
                  <span>Total</span>
                  <strong>GHS {totalUI.toFixed(2)}</strong>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <LoaderOverlay
        show={loading}
        label={loadingMode === "paystack" ? "Redirecting to Paystack" : "Placing your order"}
        subtext={loadingMode === "paystack" ? "Please wait while we secure your payment..." : "Please wait while we confirm your order..."}
      />
    </div>
  );
}
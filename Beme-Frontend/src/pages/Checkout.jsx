import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { startPaystackCheckout } from "../lib/checkout";
import { createCodOrder, getMyOrders } from "../services/api";
import "./Checkout.css";

/* ── constants (all unchanged) ── */
const FREE_DELIVERY_REGIONS = new Set(["Greater Accra"]);
const GH_REGIONS = ["Greater Accra"];
const CITY_MAP = {
  "Greater Accra": ["Accra Central","East Legon","Madina","Adenta","Dodowa","Tema","Teshie","Nungua","Spintex","Kasoa","Dansoman","Achimota","Lapaz","Haatso","Dome","Taifa","Abokobi","Ashaiman","Osu","Cantonments","Airport Residential","Dzorwulu","Tesano","Abelemkpe","Kokomlemle"],
};
const DEFAULT_OTHER_CITIES = ["Other"];
const CHECKOUT_DURATION_SECONDS = 10 * 60;
const OUTSIDE_ACCRA_DELIVERY_FEE = 50;
const DELIVERY_METHODS = { MALL_PICKUP: "mall_pickup", HOME_DELIVERY: "home_delivery" };
const ACCRA_MALL_PICKUP_OPTIONS = [
  { id: "accra-mall",      label: "Accra Mall Pickup",       area: "Tetteh Quarshie / Spintex", fee: 0  },
  { id: "achimota-mall",   label: "Achimota Mall Pickup",    area: "Achimota",                  fee: 5  },
  { id: "marina-mall",     label: "Marina Mall Pickup",      area: "Airport",                   fee: 10 },
  { id: "west-hills-mall", label: "West Hills Mall Pickup",  area: "Weija",                     fee: 15 },
];
const ACCRA_HOME_DELIVERY_FEE = 150;
const INITIAL_FORM = { email:"", firstName:"", lastName:"", phone:"", address:"", region:"", city:"", area:"", notes:"" };
const INITIAL_DELIVERY = { method:"", mallId:"" };

/* ── helpers (all unchanged) ── */
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
  }));
}
function isOrderSuccessfullyPaid(order) {
  const s=String(order?.status||"").trim().toLowerCase();
  const ps=String(order?.paymentStatus||"").trim().toLowerCase();
  return order?.paid===true||ps==="paid"||["paid","processing","shipped","delivered"].includes(s);
}

/* ── icons ── */
function LockIcon() {
  return <svg viewBox="0 0 24 24" className="co-lock-icon" aria-hidden="true"><path d="M7.75 10V8.25a4.25 4.25 0 1 1 8.5 0V10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="5.25" y="10" width="13.5" height="9.5" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M12 13.5v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function CardIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function TruckIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 6.75h11.25c1.24 0 2.25 1.01 2.25 2.25v4.25h1.34c.68 0 1.31.32 1.71.87l1.16 1.57c.29.39.45.86.45 1.35v1.21c0 .62-.5 1.12-1.12 1.12h-.76a2.87 2.87 0 0 1-5.56 0H9.78a2.87 2.87 0 0 1-5.56 0H3.5c-.62 0-1.12-.5-1.12-1.12V7.87c0-.62.5-1.12 1.12-1.12Z"/></svg>;
}
function InfoIcon() {
  return <svg viewBox="0 0 24 24" className="co-info-icon" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M12 10.2v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="7.2" r="1.1" fill="currentColor"/></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>;
}
function ShieldIcon() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}

export default function Checkout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { cartItems, clearCart, itemCount } = useCart();
  const { user, loading: authLoading } = useAuth();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const cancelledPayment = searchParams.get("payment") === "cancelled";

  /* ── all state (unchanged) ── */
  const [method,                  setMethod]                  = useState("");
  const [loading,                 setLoading]                 = useState(false);
  const [loadingMode,             setLoadingMode]             = useState("");
  const [form,                    setForm]                    = useState(INITIAL_FORM);
  const [delivery,                setDelivery]                = useState(INITIAL_DELIVERY);
  const [touched,                 setTouched]                 = useState({});
  const [errors,                  setErrors]                  = useState({});
  const [timeLeft,                setTimeLeft]                = useState(CHECKOUT_DURATION_SECONDS);
  const [sessionExpired,          setSessionExpired]          = useState(false);
  const [showCODInfo,             setShowCODInfo]             = useState(false);
  const [checkingOrderHistory,    setCheckingOrderHistory]    = useState(true);
  const [hasSuccessfulPaidOrder,  setHasSuccessfulPaidOrder]  = useState(false);
  const [paystackError,           setPaystackError]           = useState("");

  const feedbackTimerRef = useRef(null);

  /* ── all effects (unchanged) ── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/login", { replace:true, state:{ from:location.pathname } });
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

  /* ── derived (unchanged) ── */
  const safeCartItems = useMemo(() => buildSafeCartItems(cartItems), [cartItems]);
  const subtotalUI = useMemo(() => safeCartItems.reduce((s,i) => s + (Number(i.price)||0)*(Number(i.qty)||0), 0), [safeCartItems]);
  const citiesForRegion = useMemo(() => { if (!form.region) return []; return CITY_MAP[form.region] || DEFAULT_OTHER_CITIES; }, [form.region]);
  const mallPickupOptions = useMemo(() => form.region === "Greater Accra" ? ACCRA_MALL_PICKUP_OPTIONS : [], [form.region]);
  const selectedMallOption = useMemo(() => mallPickupOptions.find(o => o.id === delivery.mallId) || null, [mallPickupOptions, delivery.mallId]);
  const normalizedPhone = useMemo(() => normalizeGhanaPhone(form.phone), [form.phone]);
  const network = useMemo(() => detectNetwork(normalizedPhone), [normalizedPhone]);
  const cartShops = useMemo(() => Array.from(new Set(safeCartItems.map(i => normalizeShop(i.shop)))).filter(Boolean), [safeCartItems]);
  const hasShippedFromAbroadItem = useMemo(() => safeCartItems.some(i => i?.shipsFromAbroad === true), [safeCartItems]);
  const unavailableCartItems = useMemo(() => safeCartItems.map(i => ({ ...i, unavailableReason:getUnavailableReason(i) })).filter(i => i.unavailableReason), [safeCartItems]);
  const hasUnavailableCartItems = unavailableCartItems.length > 0;
  const needsFirstSuccessfulPaystackOrder = !checkingOrderHistory && !hasSuccessfulPaidOrder;
  const codDisabledReason = useMemo(() => {
    if (hasUnavailableCartItems) return "Pay on Delivery is unavailable because your cart contains unavailable items.";
    if (hasShippedFromAbroadItem) return "Pay on Delivery is unavailable because your cart contains a shipped from abroad item.";
    if (needsFirstSuccessfulPaystackOrder) return "Pay on Delivery is unavailable until you complete your first successful Paystack payment.";
    return "";
  }, [hasUnavailableCartItems, hasShippedFromAbroadItem, needsFirstSuccessfulPaystackOrder]);
  const isCODBlocked = !!codDisabledReason;
  const isFinalMinute = timeLeft <= 60 && !sessionExpired;
  const inputsDisabled = loading || sessionExpired;
  const formattedTimeLeft = formatTime(timeLeft);
  const regionalBaseDeliveryFeeUI = useMemo(() => { if (!form.region) return 0; return FREE_DELIVERY_REGIONS.has(form.region) ? 0 : OUTSIDE_ACCRA_DELIVERY_FEE; }, [form.region]);
  const selectedDeliveryMethodFeeUI = useMemo(() => {
    if (!delivery.method) return 0;
    if (delivery.method === DELIVERY_METHODS.HOME_DELIVERY) return form.region === "Greater Accra" ? ACCRA_HOME_DELIVERY_FEE : 0;
    if (delivery.method === DELIVERY_METHODS.MALL_PICKUP) return Number(selectedMallOption?.fee||0);
    return 0;
  }, [delivery.method, form.region, selectedMallOption]);
  const abroadDeliveryFeeUI = useMemo(() => safeCartItems.reduce((s,i) => s + getItemAbroadDeliveryFee(i)*(Number(i.qty)||0), 0), [safeCartItems]);
  const deliveryFeeUI = useMemo(() => regionalBaseDeliveryFeeUI + selectedDeliveryMethodFeeUI + abroadDeliveryFeeUI, [regionalBaseDeliveryFeeUI, selectedDeliveryMethodFeeUI, abroadDeliveryFeeUI]);
  const totalUI = useMemo(() => subtotalUI + deliveryFeeUI, [subtotalUI, deliveryFeeUI]);

  const selectedDeliverySummary = useMemo(() => {
    if (!delivery.method) return null;
    if (delivery.method === DELIVERY_METHODS.HOME_DELIVERY) return { title:"Home Delivery", note: form.region==="Greater Accra" ? `+GHS ${ACCRA_HOME_DELIVERY_FEE.toFixed(2)}` : "Regional fee applies" };
    if (delivery.method === DELIVERY_METHODS.MALL_PICKUP && selectedMallOption) return { title:selectedMallOption.label, note:`${selectedMallOption.area}${selectedMallOption.fee>0?` (+GHS ${selectedMallOption.fee.toFixed(2)})`:" (Free)"}` };
    return null;
  }, [delivery.method, form.region, selectedMallOption]);

  /* ── effects for side-effects (unchanged) ── */
  useEffect(() => { if (isCODBlocked && method==="cod") setMethod(""); }, [isCODBlocked, method]);
  useEffect(() => {
    if (form.region !== "Greater Accra") {
      setDelivery(prev => {
        if (prev.method===DELIVERY_METHODS.MALL_PICKUP||prev.mallId) return { method:prev.method===DELIVERY_METHODS.MALL_PICKUP?DELIVERY_METHODS.HOME_DELIVERY:prev.method, mallId:"" };
        return prev;
      });
    }
  }, [form.region]);
  useEffect(() => { if (delivery.method!==DELIVERY_METHODS.MALL_PICKUP && delivery.mallId) setDelivery(p=>({...p,mallId:""})); }, [delivery.method, delivery.mallId]);
  useEffect(() => {
    if (sessionExpired) return;
    const timer = window.setInterval(() => {
      setTimeLeft(prev => { if (prev<=1) { window.clearInterval(timer); setSessionExpired(true); return 0; } return prev-1; });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionExpired]);

  /* ── handlers (unchanged) ── */
  const setField = (key) => (e) => {
    if (sessionExpired) return;
    const value = e.target.value;
    if (key==="region") { setForm(prev=>({...prev,region:value,city:""})); setDelivery(INITIAL_DELIVERY); return; }
    setForm(prev=>({...prev,[key]:value}));
  };
  const setDeliveryMethod = (next) => { if (sessionExpired||loading) return; setDelivery({method:next,mallId:next===DELIVERY_METHODS.MALL_PICKUP?delivery.mallId:""}); setTouched(p=>({...p,deliveryMethod:true})); };
  const setMallPickup = (mallId) => { if (sessionExpired||loading) return; setDelivery({method:DELIVERY_METHODS.MALL_PICKUP,mallId}); setTouched(p=>({...p,deliveryMethod:true,mallId:true})); };
  const markTouched = (key) => () => setTouched(p=>({...p,[key]:true}));

  const validate = (v) => {
    const next = {};
    if (!user&&!authLoading) next.auth="Please login before checkout.";
    if (!v.email.trim()) next.email="Email is required."; else if (!isValidEmail(v.email)) next.email="Enter a valid email address.";
    if (!v.firstName.trim()) next.firstName="First name is required."; else if (!isValidName(v.firstName)) next.firstName="Use letters only.";
    if (!v.lastName.trim()) next.lastName="Last name is required."; else if (!isValidName(v.lastName)) next.lastName="Use letters only.";
    if (!v.address.trim()) next.address="Address is required."; else if (!isValidGhanaAddress(v.address)) next.address="Enter a valid address.";
    if (!v.region) next.region="Select a region.";
    if (!v.city) next.city="Select a city.";
    if (!v.area.trim()) next.area="Area / locality is required."; else if (v.area.trim().length<2) next.area="Area is too short.";
    if (!v.phone.trim()) next.phone="Phone is required."; else if (!normalizedPhone) next.phone="Use 0XXXXXXXXX or +233XXXXXXXXX."; else if (!network) next.phone="Phone must be MTN, Telecel, or AirtelTigo.";
    if (!safeCartItems.length) next.cart="Your cart is empty."; else if (hasUnavailableCartItems) next.cart="Some items are out of stock. Update your cart.";
    if (!delivery.method) next.deliveryMethod="Please select a delivery option.";
    if (delivery.method===DELIVERY_METHODS.MALL_PICKUP&&!delivery.mallId) next.mallId="Please select a pickup mall.";
    if (!method) next.paymentMethod="Please select a payment method.";
    return next;
  };

  useEffect(() => {
    setErrors(validate(form));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user,authLoading,form.email,form.firstName,form.lastName,form.phone,form.address,form.region,form.city,form.area,safeCartItems,hasUnavailableCartItems,normalizedPhone,network,method,delivery.method,delivery.mallId]);

  const showError = (key) => touched[key] && errors[key];

  const validateRequired = () => {
    if (sessionExpired) { alert("Checkout session expired. Please restart checkout."); return "Checkout session expired."; }
    const next = validate(form);
    setErrors(next);
    setTouched({ email:true,firstName:true,lastName:true,phone:true,address:true,region:true,city:true,area:true,deliveryMethod:true,mallId:true,paymentMethod:true });
    return Object.values(next)[0] || null;
  };

  const restartCheckout = () => {
    setForm({ ...INITIAL_FORM, email:user?.email||"" });
    setDelivery(INITIAL_DELIVERY); setTouched({}); setErrors({}); setMethod(""); setLoading(false); setLoadingMode(""); setSessionExpired(false); setTimeLeft(CHECKOUT_DURATION_SECONDS); setShowCODInfo(false);
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const dismissCancelledNotice = () => {
    const next = new URLSearchParams(location.search);
    next.delete("payment");
    navigate({ pathname:location.pathname, search:next.toString()?`?${next.toString()}`:"" }, { replace:true });
  };

  const buildDeliveryPayload = () => {
    const mallLabel = selectedMallOption?.label||"";
    const mallArea  = selectedMallOption?.area||"";
    const label = delivery.method===DELIVERY_METHODS.HOME_DELIVERY ? "Home Delivery" : delivery.method===DELIVERY_METHODS.MALL_PICKUP ? mallLabel||"Mall Pickup" : "";
    return {
      method:delivery.method, label, fee:deliveryFeeUI,
      breakdown:{ regionalBaseFee:regionalBaseDeliveryFeeUI, methodFee:selectedDeliveryMethodFeeUI, abroadFee:abroadDeliveryFeeUI },
      mallPickup: delivery.method===DELIVERY_METHODS.MALL_PICKUP ? { id:delivery.mallId, label:mallLabel, area:mallArea, fee:Number(selectedMallOption?.fee||0) } : null,
      homeDelivery: delivery.method===DELIVERY_METHODS.HOME_DELIVERY ? { label:"Home Delivery", fee:form.region==="Greater Accra"?ACCRA_HOME_DELIVERY_FEE:0 } : null,
    };
  };

  const buildOrderPayload = (paymentMethod) => {
    const items = safeCartItems.map(item=>({ id:item.id||"", productId:item.productId||item.id||"", name:item.name||"", price:Number(item.price)||0, basePrice:Number(item.basePrice??item.price??0)||0, optionPriceTotal:Number(item.optionPriceTotal||0)||0, qty:Number(item.qty)||1, image:item.image||"", shop:normalizeShop(item.shop), selectedOptions:item.selectedOptions||{}, selectedOptionsLabel:item.selectedOptionsLabel||"", selectedOptionDetails:Array.isArray(item.selectedOptionDetails)?item.selectedOptionDetails:[], customizations:Array.isArray(item.customizations)?item.customizations:[], shipsFromAbroad:item.shipsFromAbroad===true, abroadDeliveryFee:getItemAbroadDeliveryFee(item), inStock:item.inStock!==false, stock:getNumericStock(item) }));
    const shops = Array.from(new Set(items.map(i=>i.shop))).filter(Boolean);
    return {
      customer:{ email:sanitizeText(form.email,160).toLowerCase(), firstName:sanitizeText(form.firstName,80), lastName:sanitizeText(form.lastName,80), phone:normalizedPhone, address:sanitizeText(form.address,300), region:sanitizeText(form.region,80), city:sanitizeText(form.city,80), area:sanitizeText(form.area,120), notes:sanitizeOptionalText(form.notes,500), country:"Ghana", network, userId:user?.uid||"" },
      delivery:buildDeliveryPayload(), items, shops, primaryShop:shops[0]||"main",
      pricing:{ subtotal:subtotalUI, deliveryFee:deliveryFeeUI, total:totalUI, currency:"GHS" },
      paymentMethod, paymentStatus:"pending", status:paymentMethod==="cod"?"pending":"pending_payment", source:"web",
    };
  };

  const placeCOD = async () => {
    if (loading||sessionExpired||isCODBlocked||checkingOrderHistory||hasUnavailableCartItems) return;
    const err = validateRequired(); if (err) return;
    setLoadingMode("cod"); setLoading(true);
    try {
      const payload = buildOrderPayload("cod");
      const result  = await createCodOrder(payload);
      const createdOrderId = result?.order?.id||result?.id||"";
      clearCart();
      navigate(`/order-success?status=success${createdOrderId?`&orderId=${encodeURIComponent(createdOrderId)}`:""}`, { replace:true });
    } catch (e) {
      console.error("COD order failed:", e);
      alert(e?.message?`Failed to place order: ${e.message}`:"Failed to place order. Try again.");
      setLoading(false); setLoadingMode("");
    }
  };

  const payWithPaystack = async () => {
    setPaystackError("");
    if (loading)               { setPaystackError("DEBUG: Already loading."); return; }
    if (sessionExpired)        { setPaystackError("DEBUG: Session expired."); return; }
    if (checkingOrderHistory)  { setPaystackError("DEBUG: Still checking order history, please wait."); return; }
    if (hasUnavailableCartItems) { setPaystackError("DEBUG: Cart has unavailable items."); return; }
    if (!user)                 { setPaystackError("DEBUG: No user logged in."); return; }
    setLoadingMode("paystack"); setLoading(true);
    setTouched({ email:true,firstName:true,lastName:true,phone:true,address:true,region:true,city:true,area:true,deliveryMethod:true,mallId:true,paymentMethod:true });
    const currentErrors = validate(form);
    const firstError = Object.values(currentErrors)[0];
    if (firstError) { setPaystackError("DEBUG: Validation failed — "+firstError); setLoading(false); setLoadingMode(""); return; }
    try {
      setPaystackError("DEBUG: Calling startPaystackCheckout...");
      await startPaystackCheckout({
        email:sanitizeText(form.email,160).toLowerCase(),
        cartItems:safeCartItems.map(item=>({...item,qty:Number(item.qty)||1,price:Number(item.price)||0,basePrice:Number(item.basePrice??item.price??0)||0,optionPriceTotal:Number(item.optionPriceTotal||0)||0})),
        delivery:buildDeliveryPayload(),
        pricing:{ subtotal:subtotalUI, deliveryFee:deliveryFeeUI, total:totalUI, currency:"GHS" },
        customer:{ firstName:sanitizeText(form.firstName,80), lastName:sanitizeText(form.lastName,80), address:sanitizeText(form.address,300), region:sanitizeText(form.region,80), city:sanitizeText(form.city,80), area:sanitizeText(form.area,120), phone:normalizedPhone },
      });
      setPaystackError("DEBUG: startPaystackCheckout returned without redirecting.");
      setLoading(false); setLoadingMode("");
    } catch (e) {
      setPaystackError("DEBUG: startPaystackCheckout threw — "+(e?.message||String(e)));
      setLoading(false); setLoadingMode("");
    }
  };

  const handleMethodChange = (e) => {
    const value = e.target.value;
    setTouched(p=>({...p,paymentMethod:true}));
    if (!value) { setMethod(""); setShowCODInfo(false); return; }
    if (value==="cod"&&isCODBlocked) { setMethod(""); setShowCODInfo(true); return; }
    setMethod(value); setShowCODInfo(false);
  };

  /* ── step indicator logic ── */
  const currentStep = !delivery.method ? 1 : !method ? 2 : 3;

  /* ── render ── */
  return (
    <div className="co-page">
      <div className="co-wrap">

        {/* cancelled notice */}
        {cancelledPayment && (
          <div className="co-notice co-notice--warn" role="status" aria-live="polite">
            <div className="co-notice__body">
              <strong>Payment cancelled.</strong>
              <span>Your order was not completed. Review your details and try again.</span>
            </div>
            <button type="button" className="co-notice__close" onClick={dismissCancelledNotice} aria-label="Dismiss">×</button>
          </div>
        )}

        {/* timer */}
        <div className={`co-timer${isFinalMinute?" co-timer--warn":""}${sessionExpired?" co-timer--expired":""}`}>
          <div className="co-timer__left">
            <span className="co-timer__eye">Session</span>
            <span className="co-timer__time">{formattedTimeLeft}</span>
          </div>
          <div className="co-timer__right">
            {sessionExpired ? (
              <>
                <p className="co-timer__msg">Session expired. Please restart checkout.</p>
                <button type="button" className="co-timer__btn" onClick={restartCheckout}>Restart</button>
              </>
            ) : (
              <p className="co-timer__msg">{isFinalMinute?"Final minute — complete your order now.":"Complete your order within 10 minutes."}</p>
            )}
          </div>
        </div>

        {/* page title */}
        <h1 className="co-page-title">Checkout</h1>

        {/* step indicator */}
        <div className="co-steps">
          {[{n:1,label:"Shipping"},{n:2,label:"Delivery"},{n:3,label:"Payment"}].map((s,i) => (
            <div key={s.n} className={`co-step${currentStep===s.n?" co-step--active":""}${currentStep>s.n?" co-step--done":""}`}>
              <div className="co-step__circle">
                {currentStep>s.n ? <CheckIcon /> : <span>{s.n}</span>}
              </div>
              <span className="co-step__label">{s.label}</span>
              {i < 2 && <div className="co-step__line" />}
            </div>
          ))}
        </div>

        {paystackError && (
          <div className="co-debug-error">{paystackError}</div>
        )}

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

            {/* ── FORM COLUMN ── */}
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
                    <select className="co-input" value={form.city} onBlur={markTouched("city")} onChange={setField("city")} disabled={inputsDisabled||!form.region}>
                      <option value="">{form.region?"Select city":"Region first"}</option>
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
                    <CheckIcon /> Network: <strong>{network}</strong> ({normalizedPhone})
                  </div>
                )}

                <textarea className="co-input co-textarea" placeholder="Delivery notes (optional)" value={form.notes} onChange={setField("notes")} disabled={inputsDisabled} />
              </div>

              {/* Delivery */}
              <div className="co-section">
                <span className="co-section__eyebrow">Step 02</span>
                <h2 className="co-section__title">Delivery</h2>

                <div className="co-del-grid">
                  <button type="button"
                    className={`co-del-card${delivery.method===DELIVERY_METHODS.MALL_PICKUP?" co-del-card--active":""}`}
                    onClick={() => setDeliveryMethod(DELIVERY_METHODS.MALL_PICKUP)}
                    disabled={inputsDisabled||form.region!=="Greater Accra"}>
                    <strong>Mall Pickup</strong>
                    <span>{form.region==="Greater Accra"?"Pick up from a mall in Accra.":"Available only in Greater Accra."}</span>
                  </button>
                  <button type="button"
                    className={`co-del-card${delivery.method===DELIVERY_METHODS.HOME_DELIVERY?" co-del-card--active":""}`}
                    onClick={() => setDeliveryMethod(DELIVERY_METHODS.HOME_DELIVERY)}
                    disabled={inputsDisabled}>
                    <strong>Home Delivery</strong>
                    <span>{form.region==="Greater Accra"?`Delivered to your address (+GHS ${ACCRA_HOME_DELIVERY_FEE.toFixed(2)})`:"Delivered to your address. Regional fee applies."}</span>
                  </button>
                </div>
                {showError("deliveryMethod") && <div className="co-field-error">{errors.deliveryMethod}</div>}

                {delivery.method===DELIVERY_METHODS.MALL_PICKUP && (
                  <div className="co-mall-wrap">
                    <span className="co-mall-label">Select pickup mall</span>
                    <div className="co-mall-grid">
                      {mallPickupOptions.map(mall => (
                        <button key={mall.id} type="button"
                          className={`co-del-card${delivery.mallId===mall.id?" co-del-card--active":""}`}
                          onClick={() => setMallPickup(mall.id)}
                          disabled={inputsDisabled}>
                          <strong>{mall.label}</strong>
                          <span>{mall.area}</span>
                          <small>{mall.fee>0?`Fee: GHS ${mall.fee.toFixed(2)}`:"Free pickup"}</small>
                        </button>
                      ))}
                    </div>
                    {showError("mallId") && <div className="co-field-error">{errors.mallId}</div>}
                  </div>
                )}

                {selectedDeliverySummary && (
                  <div className="co-review-pill co-review-pill--delivery">
                    <span className="co-review-pill__eye">Delivery selected</span>
                    <strong className="co-review-pill__title">{selectedDeliverySummary.title}</strong>
                    <p className="co-review-pill__note">{selectedDeliverySummary.note}</p>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="co-section">
                <span className="co-section__eyebrow">Step 03</span>
                <h2 className="co-section__title">Payment</h2>

                <label className="co-label">Choose how you want to pay</label>
                <div className="co-select-wrap">
                  <select className="co-input co-select" value={method} onChange={handleMethodChange} onBlur={markTouched("paymentMethod")} disabled={inputsDisabled||checkingOrderHistory}>
                    <option value="">Select payment method</option>
                    <option value="paystack">Checkout with Paystack</option>
                    <option value="cod">Pay on Delivery{isCODBlocked?" (Unavailable)":""}</option>
                  </select>
                  <span className="co-select-arrow" aria-hidden="true">▾</span>
                </div>
                {showError("paymentMethod") && <div className="co-field-error">{errors.paymentMethod}</div>}
                {checkingOrderHistory && <p className="co-hint">Checking checkout eligibility…</p>}

                {method && (
                  <div className={`co-review-pill${method==="paystack"?" co-review-pill--paystack":" co-review-pill--cod"}`}>
                    <div className="co-review-pill__icon">
                      {method==="paystack" ? <CardIcon /> : <TruckIcon />}
                    </div>
                    <div>
                      <strong className="co-review-pill__title">{method==="paystack"?"Paystack selected":"Pay on Delivery selected"}</strong>
                      <p className="co-review-pill__note">{method==="paystack"?"You will be redirected securely to Paystack to complete payment.":isCODBlocked?codDisabledReason:"You will place the order now and pay when your order arrives."}</p>
                    </div>
                  </div>
                )}

                {(showCODInfo||(method==="cod"&&isCODBlocked)) && (
                  <div className="co-info-panel">
                    <div className="co-info-panel__icon"><InfoIcon /></div>
                    <div>
                      <strong>Pay on Delivery notice</strong>
                      <p>{codDisabledReason||"Pay on Delivery is available once your cart and account qualify."}</p>
                    </div>
                  </div>
                )}

                {method && (
                  <div className="co-cta-stack">
                    {method==="paystack" ? (
                      <button type="button" className="co-btn co-btn--primary"
                        onClick={payWithPaystack}
                        disabled={inputsDisabled||!!errors.cart||!user||authLoading||checkingOrderHistory||hasUnavailableCartItems}>
                        <div className="co-btn__left">
                          <div className="co-btn__icon co-btn__icon--inv"><CardIcon /></div>
                          <div className="co-btn__label">
                            <span className="co-btn__title">Checkout</span>
                            <span className="co-btn__sub">via Paystack</span>
                          </div>
                        </div>
                        <span className="co-btn__amount">GHS {totalUI.toFixed(2)}</span>
                      </button>
                    ) : (
                      <button type="button" className={`co-btn co-btn--outline${isCODBlocked?" co-btn--disabled":""}`}
                        onClick={placeCOD}
                        disabled={inputsDisabled||!!errors.cart||!user||authLoading||checkingOrderHistory||isCODBlocked||hasUnavailableCartItems}>
                        <div className="co-btn__left">
                          <div className="co-btn__icon co-btn__icon--norm"><TruckIcon /></div>
                          <div className="co-btn__label">
                            <span className="co-btn__title">Pay on Delivery</span>
                            <span className="co-btn__sub">{isCODBlocked?"Currently unavailable":"Pay when it arrives"}</span>
                          </div>
                        </div>
                        <span className="co-btn__amount">GHS {totalUI.toFixed(2)}</span>
                      </button>
                    )}

                    <div className="co-secure">
                      <ShieldIcon />
                      Secured by Paystack · All payments encrypted
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── SUMMARY COLUMN ── */}
            <div className="co-summary">
              <div className="co-summary__head">
                <h3 className="co-summary__title">Summary</h3>
                <span className="co-summary__count">{itemCount} item{itemCount!==1?"s":""}</span>
              </div>

              {hasUnavailableCartItems && <div className="co-error" style={{marginBottom:14}}>Some items are unavailable. Remove or reduce quantity.</div>}

              {safeCartItems.map((item,index) => {
                const reason = getUnavailableReason(item);
                const abroadFee = getItemAbroadDeliveryFee(item);
                return (
                  <div key={item.lineId||`${item.id}-${index}`} className="co-sum-item">
                    <div className="co-sum-item__thumb">
                      {item.image ? <img src={item.image} alt={item.name||"Product"} /> : <div className="co-sum-item__thumb-empty">No image</div>}
                    </div>
                    <div className="co-sum-item__info">
                      <p className="co-sum-item__name">{item.name}</p>
                      {item.selectedOptionsLabel && <span className="co-sum-item__opts">{item.selectedOptionsLabel}</span>}
                      {item.shipsFromAbroad && <span className="co-sum-item__opts co-sum-item__opts--abroad">Ships from abroad{abroadFee>0?` · Fee: GHS ${abroadFee.toFixed(2)} each`:""}</span>}
                      {reason && <span className="co-sum-item__opts co-sum-item__opts--err">{reason}</span>}
                      <span className="co-sum-item__qty">x{item.qty}</span>
                    </div>
                    <span className="co-sum-item__price">GHS {(Number(item.price)*Number(item.qty)).toFixed(2)}</span>
                  </div>
                );
              })}

              <div className="co-sum-divider" />
              <div className="co-sum-line"><span>Subtotal</span><span>GHS {subtotalUI.toFixed(2)}</span></div>
              <div className="co-sum-line">
                <span>Regional delivery<small>{form.region?(FREE_DELIVERY_REGIONS.has(form.region)?"Greater Accra base":"Outside Accra (+50)"):"Select region"}</small></span>
                <span>GHS {regionalBaseDeliveryFeeUI.toFixed(2)}</span>
              </div>
              <div className="co-sum-line">
                <span>Delivery option<small>{selectedDeliverySummary?selectedDeliverySummary.title:"Select delivery"}</small></span>
                <span>GHS {selectedDeliveryMethodFeeUI.toFixed(2)}</span>
              </div>
              <div className="co-sum-line">
                <span>Abroad delivery<small>{abroadDeliveryFeeUI>0?"Shipped abroad items":"No abroad fee"}</small></span>
                <span>GHS {abroadDeliveryFeeUI.toFixed(2)}</span>
              </div>
              <div className="co-sum-line">
                <span>Shops<small>{cartShops.length?cartShops.join(", "):"main"}</small></span>
                <span>{cartShops.length||1}</span>
              </div>
              <div className="co-sum-total">
                <span>Total</span>
                <strong>GHS {totalUI.toFixed(2)}</strong>
              </div>
            </div>

          </div>
        )}
      </div>

      <LoaderOverlay
        show={loading}
        label={loadingMode==="paystack"?"Redirecting to Paystack":"Placing your order"}
        subtext={loadingMode==="paystack"?"Please wait while we secure your payment...":"Please wait while we confirm your order..."}
      />
    </div>
  );
}

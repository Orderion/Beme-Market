/**
 * Checkout.jsx
 * src/pages/Checkout.jsx
 *
 * CHANGES vs original:
 * 1. Removed MTN Mobile Money + Telecel Cash payment options
 * 2. Fixed buildDeliveryPayload() — sends normalized 'type' field server expects
 * 3. Reads seller shops/{storeId}/delivery doc to show correct delivery options
 * 4. Added discount code input with Firestore validation
 * 5. Increased AbortController timeout to 55s to handle Render cold-starts
 * 6. Delivery section now respects seller's configured method (self/beme/both)
 *
 * BEME DELIVERY BUILD — CHANGES:
 * 7. "Pay on Delivery" relabeled to "Pay at Door" — cash COD is removed entirely.
 *    Pay at Door is a Paystack payment, just collected when the courier arrives
 *    instead of at checkout. It is only available when Beme courier delivery
 *    is selected — self/seller-arranged delivery never shows this option, since
 *    the whole safety model depends on Beme controlling the payment moment.
 * 8. Self-delivery-only sellers (and Basic/Starter plan sellers, who are
 *    already locked out of Beme courier in DashboardDelivery.jsx) now only
 *    offer Paystack at checkout for their orders — there is no cash fallback.
 * 9. New always-show info panel explains the Pay at Door flow the moment it's
 *    selected, and tells the customer explicitly that they'll complete payment
 *    from their Orders page when the courier arrives.
 * 10. Pay at Door order creation now calls the new backend endpoint
 *     POST /api/paystack/pay-at-door/create (creates an unpaid order) instead
 *     of the old cash-COD route. Paystack-at-checkout flow (payWithPaystack)
 *     is unchanged.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { startPaystackCheckout } from "../lib/checkout";
import { validateDiscountCode, incrementDiscountCodeUsage } from "../services/marketingService";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./Checkout.css";

/* ── constants ── */
const GH_REGIONS = [
  "Greater Accra","Ashanti","Western","Central","Eastern",
  "Northern","Upper East","Upper West","Volta","Brong-Ahafo",
  "Oti","Ahafo","Bono East","North East","Savannah","Western North",
];
const CITY_MAP = {
  "Greater Accra": ["Accra Central","East Legon","Madina","Adenta","Dodowa","Tema","Teshie","Nungua","Spintex","Kasoa","Dansoman","Achimota","Lapaz","Haatso","Dome","Taifa","Abokobi","Ashaiman","Osu","Cantonments","Airport Residential","Dzorwulu","Tesano","Abelemkpe","Kokomlemle"],
  "Ashanti":       ["Kumasi","Obuasi","Mampong","Ejisu","Juaben","Asante Mampong"],
  "Western":       ["Takoradi","Sekondi","Tarkwa","Axim","Bogoso","Prestea"],
  "Central":       ["Cape Coast","Winneba","Mankessim","Saltpond","Elmina"],
  "Eastern":       ["Koforidua","Akosombo","Nkawkaw","Suhum","Oda","Nsawam"],
  "Volta":         ["Ho","Aflao","Keta","Hohoe","Sogakope","Kpando"],
  "Northern":      ["Tamale","Yendi","Savelugu","Gushegu","Tolon"],
  "Upper East":    ["Bolgatanga","Bawku","Navrongo","Paga","Zebilla"],
  "Upper West":    ["Wa","Lawra","Tumu","Jirapa","Nandom"],
  "Brong-Ahafo":   ["Sunyani","Techiman","Kintampo","Wenchi","Berekum"],
  "Oti":           ["Dambai","Jasikan","Kadjebi","Nkwanta"],
  "Ahafo":         ["Goaso","Kukuom","Acherensua","Hwidiem"],
  "Bono East":     ["Techiman","Atebubu","Kintampo North","Nkoranza"],
  "North East":    ["Nalerigu","Walewale","Gambaga","Bunkpurugu"],
  "Savannah":      ["Damongo","Bole","Sawla","Salaga"],
  "Western North": ["Sefwi Wiawso","Bibiani","Juaboso","Bodi"],
};
const DEFAULT_OTHER_CITIES = ["Town Centre","Other"];
const SELLER_DIRECT_ID = "seller_direct";

/* Courier providers — shown when seller has beme/both delivery */
const DELIVERY_PROVIDERS = [
  { id:"cheetah",      name:"Cheetah Express",    tagline:"Reliable nationwide delivery",  accra:{fee:25,eta:"1–2 days"},    other:{fee:45,eta:"3–5 days"},    nationwide:true  },
  { id:"glovo",        name:"Glovo",               tagline:"Fast on-demand delivery",       accra:{fee:30,eta:"Same day"},    other:null,                        nationwide:false },
  { id:"kwikdelivery", name:"KwikDelivery",        tagline:"Affordable nationwide delivery",accra:{fee:20,eta:"1–2 days"},    other:{fee:35,eta:"3–5 days"},    nationwide:true  },
  { id:"dhl",          name:"DHL eCommerce",       tagline:"Premium tracked delivery",      accra:{fee:55,eta:"Next day"},    other:{fee:75,eta:"2–3 days"},    nationwide:true  },
];

function getProviderFee(p, region) { if (!p) return 0; return region==="Greater Accra" ? (p.accra?.fee??0) : (p.other?.fee??0); }
function getProviderEta(p, region) { if (!p) return ""; return region==="Greater Accra" ? (p.accra?.eta??"") : (p.other?.eta??""); }

const INITIAL_FORM = { email:"", firstName:"", lastName:"", phone:"", address:"", region:"", city:"", area:"", notes:"" };

/* ── helpers ── */
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e||"").trim()); }
function isValidName(v) { const s=String(v||"").trim(); return s.length>=2 && /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(s); }
function isValidGhanaAddress(v) { const s=String(v||"").trim(); return s.length>=6 && /[A-Za-z]/.test(s) && /^[A-Za-z0-9\s,./#-]+$/.test(s); }
function normalizeGhanaPhone(raw) {
  const s=String(raw||"").trim().replace(/\s+/g,"").replace(/-/g,"");
  if (/^\+233\d{9}$/.test(s)) return "0"+s.slice(4);
  if (/^233\d{9}$/.test(s))   return "0"+s.slice(3);
  if (/^0\d{9}$/.test(s))     return s;
  return null;
}
const PREFIX_TO_NETWORK=[
  {prefix:"024",network:"MTN"},{prefix:"025",network:"MTN"},{prefix:"053",network:"MTN"},
  {prefix:"054",network:"MTN"},{prefix:"055",network:"MTN"},{prefix:"059",network:"MTN"},
  {prefix:"020",network:"Telecel"},{prefix:"050",network:"Telecel"},
  {prefix:"026",network:"AirtelTigo"},{prefix:"056",network:"AirtelTigo"},
  {prefix:"027",network:"AirtelTigo"},{prefix:"057",network:"AirtelTigo"},
];
function detectNetwork(l) { if(!l)return null; return PREFIX_TO_NETWORK.find(x=>x.prefix===l.slice(0,3))?.network||null; }
function normalizeShop(v) { return String(v||"main").trim().toLowerCase()||"main"; }
function getNumericStock(i) { const p=Number(i?.stock); return Number.isFinite(p)?p:null; }
function isItemOutOfStock(i) { if(!i)return true; if(i.inStock===false)return true; const s=getNumericStock(i); return s!==null&&s<=0; }
function hasQuantityIssue(i) { const s=getNumericStock(i); const q=Number(i?.qty)||0; if(s===null)return false; return q>s; }
function getUnavailableReason(i) { if(isItemOutOfStock(i))return "Out of stock"; if(hasQuantityIssue(i))return `Only ${getNumericStock(i)} left`; return ""; }
function getItemAbroadFee(i) { if(!i?.shipsFromAbroad)return 0; const p=Number(i?.abroadDeliveryFee); return Number.isFinite(p)&&p>0?p:0; }
function sanitizeText(v,max=200){return String(v||"").trim().slice(0,max);}
function sanitizeOptional(v,max=200){return sanitizeText(v,max);}
function sanitizeOptions(src){
  if(!src||typeof src!=="object"||Array.isArray(src))return{};
  const out={};
  Object.entries(src).forEach(([k,v])=>{
    const key=sanitizeText(k,60);if(!key)return;
    if(Array.isArray(v)){const cv=v.map(e=>sanitizeText(e,80)).filter(Boolean).slice(0,20);if(cv.length)out[key]=cv;return;}
    if(v&&typeof v==="object"){const n=sanitizeText(v?.value,80)||sanitizeText(v?.label,80)||sanitizeText(v?.name,80);if(n)out[key]=n;return;}
    const clean=sanitizeText(v,80);if(clean)out[key]=clean;
  });
  return out;
}
function sanitizeOptionDetails(src){
  if(!Array.isArray(src))return[];
  return src.map(e=>{
    const g=sanitizeText(e?.groupName||e?.group||e?.name||e?.key,60);
    const l=sanitizeText(e?.label||e?.value||e?.title,80);
    const p=Number(e?.priceBump);
    if(!g&&!l)return null;
    return{groupName:g,label:l,priceBump:Number.isFinite(p)&&p>0?p:0};
  }).filter(Boolean).slice(0,40);
}
function buildSafeCartItems(items){
  return items.map(i=>({
    id:sanitizeText(i.id,120),productId:sanitizeText(i.id||i.productId,120),
    lineId:sanitizeText(i.lineId,320),name:sanitizeText(i.name,160),
    price:Number(i.price)||0,basePrice:Number(i.basePrice??i.price??0)||0,
    optionPriceTotal:Number(i.optionPriceTotal||0)||0,
    qty:Math.max(1,Number(i.qty)||1),image:sanitizeOptional(i.image,500),
    shop:normalizeShop(i.shop),selectedOptions:sanitizeOptions(i.selectedOptions),
    selectedOptionsLabel:sanitizeOptional(i.selectedOptionsLabel,240),
    selectedOptionDetails:sanitizeOptionDetails(i.selectedOptionDetails),
    customizations:Array.isArray(i.customizations)?i.customizations:[],
    shipsFromAbroad:i.shipsFromAbroad===true,abroadDeliveryFee:getItemAbroadFee(i),
    inStock:i.inStock!==false,stock:getNumericStock(i),
    storeId:sanitizeText(i.storeId||i.shopId||i.sellerId||"",80),
    sellerDeliveryMethod:sanitizeText(i.sellerDeliveryMethod||"",20),
    paymentType:sanitizeText(i.paymentType||"both",20),
  }));
}
function isOrderPaid(o){
  const s=String(o?.status||"").toLowerCase();
  const ps=String(o?.paymentStatus||"").toLowerCase();
  return o?.paid===true||ps==="paid"||["paid","processing","shipped","delivered"].includes(s);
}

/* ── icons ── */
function TruckIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>; }
function InfoIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 10.2v5" strokeLinecap="round"/><circle cx="12" cy="7.2" r="1.1" fill="currentColor" stroke="none"/></svg>; }
function CheckIcon() { return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function ShieldIcon({size=13}) { return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function ChevronLeftIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>; }
function AlertIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/></svg>; }
function TagIcon() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function ClockIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>; }

function CourierBadge({id}) {
  const map={cheetah:{label:"CHX",bg:"#111",fg:"#fff"},glovo:{label:"GVO",bg:"#00A082",fg:"#fff"},kwikdelivery:{label:"KWK",bg:"#046EF2",fg:"#fff"},dhl:{label:"DHL",bg:"#FFCC00",fg:"#D40511"}};
  const b=map[id]||{label:"DEL",bg:"#6B7280",fg:"#fff"};
  return <div style={{width:38,height:22,borderRadius:5,background:b.bg,color:b.fg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,letterSpacing:"0.06em",flexShrink:0}}>{b.label}</div>;
}

function SafetyBanner() {
  return (
    <div className="co-safety-banner" role="alert">
      <div className="co-safety-banner__icon"><ShieldIcon size={20}/></div>
      <div className="co-safety-banner__body">
        <strong>Always pay through Beme Market — never pay sellers directly</strong>
        <p>Your purchase is protected only when you pay through this checkout. Sending money directly to a seller means Beme Market cannot issue a refund.</p>
      </div>
    </div>
  );
}

function RefundGuaranteeBanner() {
  return (
    <div className="co-refund-banner" role="note">
      <div className="co-refund-banner__icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
        </svg>
      </div>
      <div className="co-refund-banner__body">
        <strong>Beme Buyer Protection — 2-Month Guarantee</strong>
        <p>If your order has not arrived within <strong>2 months</strong> of your purchase date, Beme Market will refund your full payment.</p>
      </div>
    </div>
  );
}

/* ── Discount code input widget ── */
function DiscountCodeInput({ storeId, subtotal, onApply, onRemove, applied }) {
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleApply = async () => {
    if (!code.trim()) return;
    if (!storeId)     { setError("No seller store found for this cart."); return; }
    setLoading(true); setError("");
    try {
      const result = await validateDiscountCode(storeId, code.trim());
      if (result.minOrderAmount && subtotal < result.minOrderAmount) {
        setError(`Minimum order GHS ${result.minOrderAmount.toFixed(2)} required for this code.`);
        return;
      }
      onApply({ ...result, code: code.trim().toUpperCase() });
      setCode("");
    } catch (e) {
      setError(e.message || "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  if (applied) {
    return (
      <div className="co-discount-applied">
        <TagIcon />
        <div className="co-discount-applied__info">
          <span className="co-discount-applied__code">{applied.code}</span>
          <span className="co-discount-applied__desc">
            {applied.discountType === "pct" ? `${applied.discountValue}% off` : `GHS ${applied.discountValue} off`}
          </span>
        </div>
        <button type="button" className="co-discount-applied__remove" onClick={onRemove}>Remove</button>
      </div>
    );
  }

  return (
    <div className="co-discount-row">
      <input
        className="co-input co-discount-input"
        placeholder="Discount code"
        value={code}
        onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
        onKeyDown={e => e.key === "Enter" && handleApply()}
        disabled={loading}
        maxLength={30}
      />
      <button type="button" className="co-discount-btn" onClick={handleApply} disabled={loading || !code.trim()}>
        {loading ? "…" : "Apply"}
      </button>
      {error && <div className="co-discount-error">{error}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, clearCart, itemCount } = useCart();
  const { user, loading: authLoading } = useAuth();

  const searchParams     = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const cancelledPayment = searchParams.get("payment") === "cancelled";

  /* ── state ── */
  const [method,                 setMethod]                 = useState("");
  const [loading,                setLoading]                = useState(false);
  const [loadingMode,            setLoadingMode]            = useState("");
  const [form,                   setForm]                   = useState(INITIAL_FORM);
  const [delivery,               setDelivery]               = useState({ method:"" });
  const [touched,                setTouched]                = useState({});
  const [errors,                 setErrors]                 = useState({});
  const [showCODInfo,            setShowCODInfo]            = useState(false);
  const [paystackError,          setPaystackError]          = useState("");
  const [discountApplied,        setDiscountApplied]        = useState(null); // { code, discountType, discountValue, codeId }
  const [sellerDelivery,         setSellerDelivery]         = useState(null); // loaded from shops/{storeId}/delivery
  const [sellerPaymentTypes,     setSellerPaymentTypes]     = useState([]); // [] = no restriction, ["paystack"] = paystack only, ["cod"] = cod only

  /* ── auth redirect ── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/login", { replace:true, state:{ from:location.pathname } });
  }, [user, authLoading, navigate, location.pathname]);

  useEffect(() => {
    if (user?.email) setForm(prev => ({ ...prev, email: prev.email || user.email }));
  }, [user]);

  /* Restore loading state on tab return */
  useEffect(() => {
    const restore = () => { setLoading(false); setLoadingMode(""); };
    const handleVis = () => { if (document.visibilityState==="visible") restore(); };
    window.addEventListener("pageshow", restore);
    window.addEventListener("focus", restore);
    document.addEventListener("visibilitychange", handleVis);
    return () => { window.removeEventListener("pageshow",restore); window.removeEventListener("focus",restore); document.removeEventListener("visibilitychange",handleVis); };
  }, []);

  /* ── Load seller delivery settings ── */
  useEffect(() => {
    const safeItems = buildSafeCartItems(cartItems);
    if (!safeItems.length) return;

    // Find the primary storeId from cart items
    const primaryStoreId = safeItems.find(i => i.storeId)?.storeId ||
      safeItems.find(i => i.shop && i.shop !== "main")?.shop || null;

    if (!primaryStoreId) return;

    getDoc(doc(db, "shops", primaryStoreId))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data().delivery || {};
          setSellerDelivery({
            method:       d.method || "self",           // self | beme | both
            selfFee:      d.selfDelivery?.fee ?? null,
            selfFeeType:  d.selfDelivery?.feeType || "flat",
            bemeTier:     d.bemeDelivery?.tier || "standard",
            bemeEnrolled: d.bemeDelivery?.enrolled || false,
          });
        }
      })
      .catch(() => {}); // Silently fail — show all options as fallback
  }, [cartItems]);

  /* ── derived ── */
  const safeCartItems         = useMemo(() => buildSafeCartItems(cartItems), [cartItems]);
  const subtotalUI            = useMemo(() => safeCartItems.reduce((s,i)=>s+(Number(i.price)||0)*(Number(i.qty)||0),0), [safeCartItems]);
  const citiesForRegion       = useMemo(() => form.region ? (CITY_MAP[form.region]||DEFAULT_OTHER_CITIES) : [], [form.region]);
  const normalizedPhone       = useMemo(() => normalizeGhanaPhone(form.phone), [form.phone]);
  const network               = useMemo(() => detectNetwork(normalizedPhone), [normalizedPhone]);
  const hasAbroadItem         = useMemo(() => safeCartItems.some(i=>i?.shipsFromAbroad===true), [safeCartItems]);
  const unavailableItems      = useMemo(() => safeCartItems.map(i=>({...i,unavailableReason:getUnavailableReason(i)})).filter(i=>i.unavailableReason), [safeCartItems]);
  const hasUnavailable        = unavailableItems.length > 0;

  /* Primary storeId for discount code validation */
  const primaryStoreId = useMemo(() => {
    return safeCartItems.find(i=>i.storeId)?.storeId ||
           safeCartItems.find(i=>i.shop&&i.shop!=="main")?.shop || null;
  }, [safeCartItems]);

  /* Show courier cards only when seller has beme or both delivery */
  const sellerAllowsCourier = useMemo(() => {
    if (!sellerDelivery) return true; // default: show all
    return sellerDelivery.method === "beme" || sellerDelivery.method === "both";
  }, [sellerDelivery]);

  /* Show self-delivery option */
  const sellerAllowsSelf = useMemo(() => {
    if (!sellerDelivery) return true;
    return sellerDelivery.method === "self" || sellerDelivery.method === "both";
  }, [sellerDelivery]);

  /* Courier locked if seller doesn't support it */
  const courierLocked = !sellerAllowsCourier;

  /* Is the customer's currently SELECTED delivery method Beme courier?
     (A real courier id from DELIVERY_PROVIDERS — not seller_direct.) */
  const isCourierDeliverySelected = useMemo(
    () => DELIVERY_PROVIDERS.some(p => p.id === delivery.method),
    [delivery.method]
  );

  /* ── BEME DELIVERY: Pay at Door eligibility ──
     Pay at Door (the relabeled former "Pay on Delivery") only makes sense
     when Beme courier is the selected delivery method — the entire safety
     model depends on Beme controlling the payment moment. Self/seller-direct
     delivery never offers it; those orders are Paystack-at-checkout only. */
  const codDisabledReason = useMemo(() => {
    if (hasUnavailable)              return "Pay at Door unavailable — cart contains unavailable items.";
    if (hasAbroadItem)               return "Pay at Door unavailable — cart contains items shipped from abroad.";
    if (delivery.method && !isCourierDeliverySelected)
      return "Pay at Door is only available with Beme courier delivery. Select a courier option above, or pay with Paystack.";
    return "";
  }, [hasUnavailable, hasAbroadItem, delivery.method, isCourierDeliverySelected]);

  const isCODBlocked   = !!codDisabledReason;

  // Seller-level payment restrictions
  const sellerBlocksPaystack = sellerPaymentTypes.length > 0 &&
    !sellerPaymentTypes.includes("paystack") &&
    !sellerPaymentTypes.includes("both");

  // sellerBlocksCOD: only block if seller explicitly set paystack-only
  const sellerBlocksCOD = sellerPaymentTypes.length > 0 &&
    !sellerPaymentTypes.includes("cod") &&
    !sellerPaymentTypes.includes("both") &&
    !sellerPaymentTypes.includes("paystack_and_cod") &&
    // ["paystack","cod"] together = both allowed
    !(sellerPaymentTypes.includes("paystack") && sellerPaymentTypes.includes("cod"));

  const sellerPaymentNote = sellerPaymentTypes.length > 0 && !sellerPaymentTypes.includes("both")
    ? sellerPaymentTypes.includes("paystack")
      ? "This seller only accepts Paystack payments (card, bank transfer)."
      : sellerPaymentTypes.includes("cod")
        ? "This seller only accepts Pay at Door."
        : ""
    : "";
  const inputsDisabled = loading;

  /* Delivery fee */
  const selectedProvider = useMemo(() => DELIVERY_PROVIDERS.find(p=>p.id===delivery.method)||null, [delivery.method]);

  const courierFeeUI = useMemo(() => {
    if (!selectedProvider) return 0;
    return getProviderFee(selectedProvider, form.region);
  }, [selectedProvider, form.region]);

  const abroadFeeUI = useMemo(() => safeCartItems.reduce((s,i)=>s+getItemAbroadFee(i)*(Number(i.qty)||0),0), [safeCartItems]);

  /* Self-delivery fee from seller settings */
  const selfFeeUI = useMemo(() => {
    if (delivery.method !== SELLER_DIRECT_ID) return 0;
    if (!sellerDelivery) return 0;
    if (sellerDelivery.selfFeeType === "free") return 0;
    if (sellerDelivery.selfFeeType === "flat" && sellerDelivery.selfFee !== null) return sellerDelivery.selfFee;
    return 0; // negotiable
  }, [delivery.method, sellerDelivery]);

  const deliveryFeeUI = useMemo(() => {
    if (delivery.method === SELLER_DIRECT_ID) return selfFeeUI + abroadFeeUI;
    return courierFeeUI + abroadFeeUI;
  }, [delivery.method, selfFeeUI, courierFeeUI, abroadFeeUI]);

  /* Discount amount */
  const discountAmountUI = useMemo(() => {
    if (!discountApplied) return 0;
    if (discountApplied.discountType === "pct") return Math.min(subtotalUI, subtotalUI * (discountApplied.discountValue / 100));
    return Math.min(subtotalUI, discountApplied.discountValue);
  }, [discountApplied, subtotalUI]);

  const totalUI = useMemo(() => Math.max(0, subtotalUI + deliveryFeeUI - discountAmountUI), [subtotalUI, deliveryFeeUI, discountAmountUI]);

  const selectedDeliverySummary = useMemo(() => {
    if (!delivery.method) return null;
    if (delivery.method === SELLER_DIRECT_ID) {
      const feeLabel = !sellerDelivery ? "Seller sets fee"
        : sellerDelivery.selfFeeType === "free" ? "Free"
        : sellerDelivery.selfFeeType === "flat" && sellerDelivery.selfFee !== null ? `GHS ${sellerDelivery.selfFee.toFixed(2)}`
        : "Negotiate with seller";
      return { title:"Arrange with Seller", note:`${feeLabel} · Contact seller for schedule`, isBeme:false };
    }
    if (!selectedProvider) return null;
    const fee = getProviderFee(selectedProvider, form.region);
    const eta = getProviderEta(selectedProvider, form.region);
    return { title:selectedProvider.name, note:form.region?`${eta} · GHS ${fee.toFixed(2)}`:"Select region to see fee", isBeme:true };
  }, [delivery.method, selectedProvider, form.region, sellerDelivery]);

  /* ── side-effects ── */
  useEffect(() => { if(isCODBlocked&&method==="cod")setMethod(""); }, [isCODBlocked,method]);
  useEffect(() => { if(sellerBlocksPaystack&&method==="paystack")setMethod(""); }, [sellerBlocksPaystack,method]);
  useEffect(() => { if(sellerBlocksCOD&&method==="cod")setMethod(""); }, [sellerBlocksCOD,method]);
  useEffect(() => { if(form.region&&form.region!=="Greater Accra"&&delivery.method==="glovo")setDelivery({method:""}); }, [form.region,delivery.method]);
  useEffect(() => {
    const isCourier = DELIVERY_PROVIDERS.some(p=>p.id===delivery.method);
    if (courierLocked && isCourier) setDelivery({method:SELLER_DIRECT_ID});
  }, [courierLocked, delivery.method]);

  /* ── handlers ── */
  const setField = (key) => (e) => {
    const val = e.target.value;
    if (key==="region") { setForm(p=>({...p,region:val,city:""})); setDelivery({method:""}); return; }
    setForm(p=>({...p,[key]:val}));
  };
  const setDeliveryMethod = (next) => { if(loading)return; setDelivery({method:next}); setTouched(p=>({...p,deliveryMethod:true})); };
  const markTouched = (key) => () => setTouched(p=>({...p,[key]:true}));

  const validate = (v) => {
    const n={};
    if(!user&&!authLoading)n.auth="Please login before checkout.";
    if(!v.email.trim())n.email="Email is required."; else if(!isValidEmail(v.email))n.email="Enter a valid email.";
    if(!v.firstName.trim())n.firstName="First name is required."; else if(!isValidName(v.firstName))n.firstName="Use letters only.";
    if(!v.lastName.trim())n.lastName="Last name is required."; else if(!isValidName(v.lastName))n.lastName="Use letters only.";
    if(!v.address.trim())n.address="Address is required."; else if(!isValidGhanaAddress(v.address))n.address="Enter a valid address.";
    if(!v.region)n.region="Select a region.";
    if(!v.city)n.city="Select a city.";
    if(!v.area.trim())n.area="Area / locality is required."; else if(v.area.trim().length<2)n.area="Area is too short.";
    if(!v.phone.trim())n.phone="Phone is required."; else if(!normalizedPhone)n.phone="Use 0XXXXXXXXX or +233XXXXXXXXX."; else if(!network)n.phone="Phone must be MTN, Telecel, or AirtelTigo.";
    if(!safeCartItems.length)n.cart="Your cart is empty."; else if(hasUnavailable)n.cart="Some items are unavailable.";
    if(!delivery.method)n.deliveryMethod="Please select a delivery option.";
    if(!method)n.paymentMethod="Please select a payment method.";
    return n;
  };

  useEffect(()=>{ setErrors(validate(form)); }, [user,authLoading,form.email,form.firstName,form.lastName,form.phone,form.address,form.region,form.city,form.area,safeCartItems,hasUnavailable,normalizedPhone,network,method,delivery.method]);

  const showError = (key) => touched[key] && errors[key];

  const validateRequired = () => {
    const next=validate(form);
    setErrors(next);
    setTouched({email:true,firstName:true,lastName:true,phone:true,address:true,region:true,city:true,area:true,deliveryMethod:true,paymentMethod:true});
    return Object.values(next)[0]||null;
  };

  const dismissCancelled = () => {
    const next=new URLSearchParams(location.search);
    next.delete("payment");
    navigate({pathname:location.pathname,search:next.toString()?`?${next.toString()}`:""},{ replace:true });
  };

  /* ── Build delivery payload with normalized type the server expects ── */
  const buildDeliveryPayload = () => {
    const isSellerDirect =
      delivery.method === SELLER_DIRECT_ID || delivery.method === "seller_direct";
    const provider = selectedProvider;

    // Map to what backend accepts:
    //   courier → "home_delivery"
    //   seller arranges → "self_delivery"
    let backendMethod;
    if (isSellerDirect) {
      backendMethod = "self_delivery";
    } else if (provider) {
      backendMethod = "home_delivery";
    } else {
      backendMethod = "self_delivery";
    }

    return {
      method:   backendMethod,          // ← backend validates this
      provider: provider?.name || (isSellerDirect ? "Seller" : ""),
      label:    provider
        ? `${provider.name} Delivery`
        : isSellerDirect ? "Seller Arranged Delivery" : "Seller Delivery",
      fee:      deliveryFeeUI,
      isBeme:   !isSellerDirect,
      region:   form.region,
      eta:      provider ? getProviderEta(provider, form.region) : "",
      breakdown: {
        courierFee:     courierFeeUI,
        abroadFee:      abroadFeeUI,
        sellerArranged: isSellerDirect,
      },
    };
  };

  const buildOrderPayload = (paymentMethod) => {
    const shopOwnerId = cartItems.find(i => i.sellerId)?.sellerId || null;
    const items = safeCartItems.map(item=>({
      id:item.id||"",productId:item.productId||item.id||"",name:item.name||"",
      price:Number(item.price)||0,basePrice:Number(item.basePrice??item.price??0)||0,
      optionPriceTotal:Number(item.optionPriceTotal||0)||0,qty:Number(item.qty)||1,
      image:item.image||"",shop:normalizeShop(item.storeId||item.shop),
      storeId:item.storeId||item.shopId||item.sellerId||"",
      shopId:item.shopId||item.storeId||"",
      selectedOptions:item.selectedOptions||{},selectedOptionsLabel:item.selectedOptionsLabel||"",
      selectedOptionDetails:Array.isArray(item.selectedOptionDetails)?item.selectedOptionDetails:[],
      customizations:Array.isArray(item.customizations)?item.customizations:[],
      shipsFromAbroad:item.shipsFromAbroad===true,abroadDeliveryFee:getItemAbroadFee(item),
      inStock:item.inStock!==false,stock:getNumericStock(item),
    }));
    const shops=Array.from(new Set(items.map(i=>i.shop))).filter(Boolean);
    return {
      customer:{
        email:sanitizeText(form.email,160).toLowerCase(),firstName:sanitizeText(form.firstName,80),
        lastName:sanitizeText(form.lastName,80),phone:normalizedPhone,address:sanitizeText(form.address,300),
        region:sanitizeText(form.region,80),city:sanitizeText(form.city,80),area:sanitizeText(form.area,120),
        notes:sanitizeOptional(form.notes,500),country:"Ghana",network,userId:user?.uid||"",
      },
      delivery:buildDeliveryPayload(),
      items,shops,primaryShop:shops[0]||"main",
      pricing:{
        subtotal:subtotalUI,deliveryFee:deliveryFeeUI,
        discount:discountAmountUI,
        discountCode:discountApplied?.code||null,
        discountCodeId:discountApplied?.codeId||null,
        total:totalUI,currency:"GHS",
      },
      paymentMethod,paymentStatus:"pending",
      status:paymentMethod==="cod"?"pending":"pending_payment",source:"web",shopOwnerId,
    };
  };

  /* ── BEME DELIVERY: Pay at Door order creation ──
     Replaces the old cash-COD route. Calls the new backend endpoint that
     creates an unpaid order — no Paystack popup at checkout time. The
     customer will see a "Pay Now" button on their Orders page once the
     courier has picked up the package. */
  const placePayAtDoor = async () => {
    if (loading || isCODBlocked || hasUnavailable) return;
    const err = validateRequired(); if (err) return;
    setLoadingMode("cod"); setLoading(true);
    try {
      const authToken = await user.getIdToken(true).catch(() => user.getIdToken(false));
      const apiBase = String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");
      const payload = buildOrderPayload("pay_at_door");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000); // Render cold-start tolerance

      const res = await fetch(`${apiBase}/api/paystack/pay-at-door/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          email: payload.customer.email,
          items: payload.items,
          customer: payload.customer,
          delivery: { method: payload.delivery.method, provider: payload.delivery.provider, fee: payload.delivery.fee },
          pricing: payload.pricing,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Failed to place order.");
      }

      const orderId = result?.orderId || "";
      if (discountApplied?.codeId) incrementDiscountCodeUsage(discountApplied.codeId).catch(()=>{});
      clearCart();
      navigate(`/order-success?status=success&payAtDoor=1${orderId?`&orderId=${encodeURIComponent(orderId)}`:""}`,{replace:true});
    } catch (e) {
      alert(e?.message ? `Failed to place order: ${e.message}` : "Failed to place order. Try again.");
      setLoading(false); setLoadingMode("");
    }
  };

  const payWithPaystack = async () => {
    setPaystackError("");
    if(loading||hasUnavailable||!user)return;
    setLoadingMode("paystack"); setLoading(true);
    setTouched({email:true,firstName:true,lastName:true,phone:true,address:true,region:true,city:true,area:true,deliveryMethod:true,paymentMethod:true});
    const currentErrors=validate(form);
    const firstError=Object.values(currentErrors)[0];
    if(firstError){setPaystackError(firstError);setLoading(false);setLoadingMode("");return;}

    let authToken;
    try {
      authToken=await user.getIdToken(true);
    } catch {
      try { authToken=await user.getIdToken(false); }
      catch { setPaystackError("Authentication failed. Refresh and try again."); setLoading(false); setLoadingMode(""); return; }
    }

    if (discountApplied?.codeId) incrementDiscountCodeUsage(discountApplied.codeId).catch(()=>{});
    try {
      await startPaystackCheckout({
        email:sanitizeText(form.email,160).toLowerCase(),
        cartItems:safeCartItems.map(i=>({...i,qty:Number(i.qty)||1,price:Number(i.price)||0})),
        delivery:buildDeliveryPayload(),
        pricing:{subtotal:subtotalUI,deliveryFee:deliveryFeeUI,discount:discountAmountUI,total:totalUI,currency:"GHS"},
        customer:{
          userId:user?.uid||"",firstName:sanitizeText(form.firstName,80),lastName:sanitizeText(form.lastName,80),
          phone:normalizedPhone||"",network:network||"",address:sanitizeText(form.address,300),
          region:sanitizeText(form.region,80),city:sanitizeText(form.city,80),area:sanitizeText(form.area,120),
          notes:sanitizeOptional(form.notes,500),country:"Ghana",
        },
        authToken,
      });
      setLoading(false); setLoadingMode("");
    } catch(e) {
      setPaystackError(e?.message||"Payment failed. Please try again.");
      setLoading(false); setLoadingMode("");
    }
  };

  const handleCheckout = () => {
    if(method==="paystack") payWithPaystack();
    else if(method==="cod") placePayAtDoor();
  };

  const handleMethodChange = (e) => {
    const val=e.target.value;
    setTouched(p=>({...p,paymentMethod:true}));
    if(!val){setMethod("");setShowCODInfo(false);return;}
    if(val==="cod"&&isCODBlocked){setMethod("");setShowCODInfo(true);return;}
    setMethod(val);setShowCODInfo(false);
  };

  const currentStep = !delivery.method?1:!method?2:3;

  const payBtnLabel =
    method==="paystack"?"Pay with Paystack":
    method==="cod"?"Place Order — Pay at Door":"";

  const isCheckoutDisabled = inputsDisabled||!!errors.cart||!user||authLoading||hasUnavailable||(method==="cod"&&isCODBlocked);

  /* ─────────── RENDER ─────────── */
  return (
    <div className="co-page">
      <div className="co-wrap">
        {cancelledPayment && (
          <div className="co-notice" role="status">
            <div className="co-notice__body"><strong>Payment cancelled.</strong><span>Your order was not completed.</span></div>
            <button type="button" className="co-notice__close" onClick={dismissCancelled}>×</button>
          </div>
        )}

        <h1 className="co-page-title">Checkout</h1>

        <div className="co-steps">
          {[{n:1,label:"Shipping"},{n:2,label:"Delivery"},{n:3,label:"Payment"}].map((s,i)=>(
            <div key={s.n} className={`co-step${currentStep===s.n?" co-step--active":""}${currentStep>s.n?" co-step--done":""}`}>
              <div className="co-step__circle">{currentStep>s.n?<CheckIcon/>:<span>{s.n}</span>}</div>
              <span className="co-step__label">{s.label}</span>
              {i<2&&<div className="co-step__line"/>}
            </div>
          ))}
        </div>

        {paystackError&&<div className="co-error">{paystackError}</div>}

        {!safeCartItems.length ? (
          <div className="co-empty">
            <div className="co-empty__card">
              <h2>Your cart is empty</h2>
              <p>Add products to your cart before checkout.</p>
              <div className="co-empty__actions">
                <Link to="/shop" className="co-link-btn">Go to shop</Link>
                <Link to="/" className="co-link-btn co-link-btn--ghost">Back home</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="co-grid">

            {/* ── LEFT: Form ── */}
            <div className="co-form">
              {errors.auth&&<div className="co-error">{errors.auth}</div>}
              {errors.cart&&<div className="co-error">{errors.cart}</div>}

              {/* Contact */}
              <div className="co-section">
                <span className="co-section__eyebrow">Step 01</span>
                <h2 className="co-section__title">Contact</h2>
                <input className="co-input" placeholder="Email address" value={form.email} onBlur={markTouched("email")} onChange={setField("email")} disabled={inputsDisabled}/>
                {showError("email")&&<div className="co-field-error">{errors.email}</div>}
              </div>

              {/* Shipping */}
              <div className="co-section">
                <span className="co-section__eyebrow">Step 01</span>
                <h2 className="co-section__title">Shipping address</h2>
                <select className="co-input" value="Ghana" disabled><option>Ghana</option></select>
                <div className="co-row2">
                  <div>
                    <input className="co-input" placeholder="First name" value={form.firstName} onBlur={markTouched("firstName")} onChange={setField("firstName")} disabled={inputsDisabled}/>
                    {showError("firstName")&&<div className="co-field-error">{errors.firstName}</div>}
                  </div>
                  <div>
                    <input className="co-input" placeholder="Last name" value={form.lastName} onBlur={markTouched("lastName")} onChange={setField("lastName")} disabled={inputsDisabled}/>
                    {showError("lastName")&&<div className="co-field-error">{errors.lastName}</div>}
                  </div>
                </div>
                <input className="co-input" placeholder="Address (House No., Street, Landmark)" value={form.address} onBlur={markTouched("address")} onChange={setField("address")} disabled={inputsDisabled}/>
                {showError("address")&&<div className="co-field-error">{errors.address}</div>}
                <div className="co-row2">
                  <div>
                    <select className="co-input" value={form.region} onBlur={markTouched("region")} onChange={setField("region")} disabled={inputsDisabled}>
                      <option value="">Select region</option>
                      {GH_REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                    {showError("region")&&<div className="co-field-error">{errors.region}</div>}
                  </div>
                  <div>
                    <select className="co-input" value={form.city} onBlur={markTouched("city")} onChange={setField("city")} disabled={inputsDisabled||!form.region}>
                      <option value="">{form.region?"Select city":"Region first"}</option>
                      {citiesForRegion.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    {showError("city")&&<div className="co-field-error">{errors.city}</div>}
                  </div>
                </div>
                <input className="co-input" placeholder="Area / Locality (e.g., East Legon)" value={form.area} onBlur={markTouched("area")} onChange={setField("area")} disabled={inputsDisabled}/>
                {showError("area")&&<div className="co-field-error">{errors.area}</div>}
                <input className="co-input" placeholder="Phone (0XXXXXXXXX or +233XXXXXXXXX)" value={form.phone} onBlur={markTouched("phone")} onChange={setField("phone")} disabled={inputsDisabled}/>
                {showError("phone")&&<div className="co-field-error">{errors.phone}</div>}
                {normalizedPhone&&network&&(
                  <div className="co-network-hint"><CheckIcon/> Network: <strong>{network}</strong>&nbsp;({normalizedPhone})</div>
                )}
                <textarea className="co-input co-textarea" placeholder="Delivery notes (optional)" value={form.notes} onChange={setField("notes")} disabled={inputsDisabled}/>
              </div>

              {/* ── Delivery ── */}
              <div className="co-section">
                <span className="co-section__eyebrow">Step 02</span>
                <h2 className="co-section__title">Delivery method</h2>

                {/* Show seller delivery info if loaded */}
                {sellerDelivery && (
                  <div className="co-delivery-seller-info">
                    <InfoIcon/>
                    <span>
                      This seller uses <strong>
                        {sellerDelivery.method === "self" ? "self delivery" :
                         sellerDelivery.method === "beme" ? "Beme courier delivery" :
                         "self delivery or Beme courier"}
                      </strong>.
                    </span>
                  </div>
                )}

                {/* Courier cards — only when seller supports it */}
                {sellerAllowsCourier && (
                  <>
                    <p className="co-del-intro">
                      Delivered via our courier partners.
                      {!form.region&&<span className="co-del-intro__note"> Select your region above to see fees.</span>}
                    </p>
                    <div className="co-del-grid co-del-grid--couriers">
                      {DELIVERY_PROVIDERS.map(p=>{
                        const accraOnly=p.accrOnly===true;
                        const unavail=accraOnly&&form.region&&form.region!=="Greater Accra";
                        const fee=form.region&&!unavail?getProviderFee(p,form.region):null;
                        const eta=form.region&&!unavail?getProviderEta(p,form.region):null;
                        const isActive=delivery.method===p.id;
                        return (
                          <button key={p.id} type="button"
                            className={`co-del-card co-del-card--courier${isActive?" co-del-card--active":""}${unavail?" co-del-card--unavail":""}`}
                            onClick={()=>!unavail&&setDeliveryMethod(p.id)}
                            disabled={inputsDisabled||unavail}>
                            <div className="co-del-card__head">
                              <CourierBadge id={p.id}/>
                              <span className="co-del-card__name">{p.name}</span>
                              {isActive&&<span className="co-del-card__check"><CheckIcon/></span>}
                            </div>
                            <span className="co-del-card__tag">{p.tagline}</span>
                            <div className="co-del-card__foot">
                              {unavail?<span className="co-del-card__only">Accra only</span>
                               :fee!==null?<><strong className="co-del-card__fee">GHS {fee.toFixed(2)}</strong><span className="co-del-card__eta">{eta}</span></>
                               :<span className="co-del-card__eta">Select region for fee</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Seller self-delivery option */}
                {sellerAllowsSelf && (
                  <>
                    {sellerAllowsCourier && <div className="co-del-or"><span>or</span></div>}
                    {sellerAllowsCourier && (
                      <div className="co-seller-warn">
                        <div className="co-seller-warn__icon"><AlertIcon/></div>
                        <div className="co-seller-warn__text">
                          <strong>Seller-arranged delivery</strong>
                          <p>The seller handles this delivery themselves. Contact them via chat to agree on fee and schedule. Beme Market does not cover seller-arranged deliveries.</p>
                        </div>
                      </div>
                    )}
                    <button type="button"
                      className={`co-del-card co-del-card--seller${delivery.method===SELLER_DIRECT_ID?" co-del-card--active":""}`}
                      onClick={()=>setDeliveryMethod(SELLER_DIRECT_ID)}
                      disabled={inputsDisabled}>
                      <div className="co-del-card__head">
                        <div className="co-del-card__truck"><TruckIcon/></div>
                        <span className="co-del-card__name">
                          {sellerDelivery?.selfFeeType === "free" ? "Free Seller Delivery" : "Seller Delivery"}
                        </span>
                        {delivery.method===SELLER_DIRECT_ID&&<span className="co-del-card__check"><CheckIcon/></span>}
                      </div>
                      <span className="co-del-card__tag">
                        {sellerDelivery?.selfFeeType === "negotiable" ? "Contact seller to agree fee & schedule" : "Delivered by the seller"}
                      </span>
                      <div className="co-del-card__foot">
                        {sellerDelivery?.selfFeeType === "free" ? (
                          <strong className="co-del-card__fee co-del-card__fee--free">Free</strong>
                        ) : sellerDelivery?.selfFeeType === "flat" && sellerDelivery?.selfFee !== null ? (
                          <strong className="co-del-card__fee">GHS {sellerDelivery.selfFee.toFixed(2)}</strong>
                        ) : (
                          <span className="co-del-card__eta">Seller sets fee</span>
                        )}
                      </div>
                    </button>
                  </>
                )}

                {/* If neither courier nor self is available, show default seller direct */}
                {!sellerAllowsCourier && !sellerAllowsSelf && (
                  <button type="button"
                    className={`co-del-card co-del-card--seller${delivery.method===SELLER_DIRECT_ID?" co-del-card--active":""}`}
                    onClick={()=>setDeliveryMethod(SELLER_DIRECT_ID)}
                    disabled={inputsDisabled}>
                    <div className="co-del-card__head">
                      <div className="co-del-card__truck"><TruckIcon/></div>
                      <span className="co-del-card__name">Arrange with Seller</span>
                      {delivery.method===SELLER_DIRECT_ID&&<span className="co-del-card__check"><CheckIcon/></span>}
                    </div>
                    <span className="co-del-card__tag">Contact seller for delivery terms</span>
                    <div className="co-del-card__foot"><span className="co-del-card__eta">Seller sets fee &amp; schedule</span></div>
                  </button>
                )}

                {showError("deliveryMethod")&&<div className="co-field-error">{errors.deliveryMethod}</div>}

                {selectedDeliverySummary&&(
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
              <div className="co-section">
                <span className="co-section__eyebrow">Step 03</span>
                <h2 className="co-section__title">Payment</h2>

                <div className="co-pay-methods">
                  {/* Paystack */}
                  <label className={`co-pay-card${method==="paystack"?" co-pay-card--active":""}`}>
                    <input type="radio" name="payMethod" value="paystack" checked={method==="paystack"} onChange={handleMethodChange} disabled={inputsDisabled||sellerBlocksPaystack} className="co-pay-radio"/>
                    <img src="/Paystack logo.JPG" alt="Paystack" className="co-pay-logo" onError={e=>{e.currentTarget.style.display="none";}}/>
                    <div className="co-pay-info">
                      <span className="co-pay-name">Pay with Paystack</span>
                      <span className="co-pay-desc">Card, bank transfer &amp; more</span>
                    </div>
                    <div className="co-pay-bullet"/>
                  </label>

                  {/* Pay at Door — only valid with Beme courier delivery */}
                  <label className={`co-pay-card co-pay-card--cod${method==="cod"?" co-pay-card--active":""}${isCODBlocked?" co-pay-card--blocked":""}`}>
                    <input type="radio" name="payMethod" value="cod" checked={method==="cod"} onChange={handleMethodChange} disabled={inputsDisabled||isCODBlocked||sellerBlocksCOD} className="co-pay-radio"/>
                    <div className="co-pay-icon-wrap"><ClockIcon/></div>
                    <div className="co-pay-info">
                      <span className="co-pay-name">Pay at Door{isCODBlocked?" (Unavailable)":""}</span>
                      {isCODBlocked
                        ?<span className="co-pay-desc co-pay-desc--warn">Not available for your order</span>
                        :<span className="co-pay-desc">Pay via Paystack when the courier arrives</span>}
                    </div>
                    <div className="co-pay-bullet"/>
                  </label>
                </div>

                {sellerPaymentNote && (
                  <div className="co-seller-payment-note">
                    <InfoIcon/> {sellerPaymentNote}
                  </div>
                )}
                {showError("paymentMethod")&&<div className="co-field-error">{errors.paymentMethod}</div>}

                <SafetyBanner/>

                {/* BEME DELIVERY: blocked-reason panel (unchanged condition/logic) */}
                {(showCODInfo||(method==="cod"&&isCODBlocked))&&(
                  <div className="co-info-panel">
                    <div className="co-info-panel__icon"><InfoIcon/></div>
                    <div><strong>Pay at Door notice</strong><p>{codDisabledReason}</p></div>
                  </div>
                )}

                {/* BEME DELIVERY: new always-show explainer panel — shown whenever
                    Pay at Door is selected and available (never just when blocked). */}
                {method==="cod" && !isCODBlocked && (
                  <div className="co-info-panel co-info-panel--paydoor">
                    <div className="co-info-panel__icon"><ClockIcon/></div>
                    <div>
                      <strong>How Pay at Door works</strong>
                      <p>
                        You won't pay anything right now. When the courier arrives with your order,
                        open your <strong>Orders</strong> page on Beme and tap <strong>Pay Now</strong> to
                        complete payment through Paystack — have your card or mobile money ready. The
                        courier hands over your order once payment is confirmed in the app.
                      </p>
                    </div>
                  </div>
                )}

                {method&&(
                  <div className="co-cta-stack">
                    <button type="button" className="co-btn co-btn--primary" onClick={handleCheckout} disabled={isCheckoutDisabled}>
                      <span className="co-btn__label">{payBtnLabel}</span>
                      <span className="co-btn__amount">GHS {totalUI.toFixed(2)}</span>
                    </button>
                    <div className="co-secure"><ShieldIcon/> Secured · All payments encrypted via Beme Market</div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="co-summary">
                <div className="co-summary__head">
                  <h3 className="co-summary__title">Order Summary</h3>
                  <span className="co-summary__count">{itemCount} item{itemCount!==1?"s":""}</span>
                </div>

                {hasUnavailable&&<div className="co-error" style={{marginBottom:14}}>Some items are unavailable. Update your cart.</div>}

                {safeCartItems.map((item,idx)=>{
                  const reason=getUnavailableReason(item);
                  const abroadFee=getItemAbroadFee(item);
                  return(
                    <div key={item.lineId||`${item.id}-${idx}`} className="co-sum-item">
                      <div className="co-sum-item__thumb">
                        {item.image?<img src={item.image} alt={item.name||"Product"}/>:<div className="co-sum-item__thumb-empty">No image</div>}
                      </div>
                      <div className="co-sum-item__info">
                        <p className="co-sum-item__name">{item.name}</p>
                        {item.selectedOptionsLabel&&<span className="co-sum-item__opts">{item.selectedOptionsLabel}</span>}
                        {item.shipsFromAbroad&&<span className="co-sum-item__opts co-sum-item__opts--abroad">Ships from abroad{abroadFee>0?` · Fee: GHS ${abroadFee.toFixed(2)} each`:""}</span>}
                        {reason&&<span className="co-sum-item__opts co-sum-item__opts--err">{reason}</span>}
                        <span className="co-sum-item__qty">Qty: {item.qty}</span>
                      </div>
                      <span className="co-sum-item__price">GHS {(Number(item.price)*Number(item.qty)).toFixed(2)}</span>
                    </div>
                  );
                })}

                <div className="co-sum-divider"/>

                {/* Discount code */}
                <div className="co-discount-section">
                  <DiscountCodeInput
                    storeId={primaryStoreId}
                    subtotal={subtotalUI}
                    onApply={setDiscountApplied}
                    onRemove={()=>setDiscountApplied(null)}
                    applied={discountApplied}
                  />
                </div>

                <div className="co-sum-divider"/>
                <div className="co-sum-line"><span>Subtotal</span><span>GHS {subtotalUI.toFixed(2)}</span></div>
                <div className="co-sum-line">
                  <span>Delivery<small>{selectedDeliverySummary?selectedDeliverySummary.title:"Select delivery above"}</small></span>
                  <span>GHS {deliveryFeeUI.toFixed(2)}</span>
                </div>
                {abroadFeeUI>0&&(
                  <div className="co-sum-line">
                    <span>Abroad delivery fee<small>Shipped abroad items</small></span>
                    <span>GHS {abroadFeeUI.toFixed(2)}</span>
                  </div>
                )}
                {discountAmountUI>0&&(
                  <div className="co-sum-line co-sum-line--discount">
                    <span>Discount <small>{discountApplied?.code}</small></span>
                    <span>-GHS {discountAmountUI.toFixed(2)}</span>
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
        label={loadingMode==="paystack"?"Redirecting to Paystack":"Placing your order"}
        subtext={loadingMode==="paystack"?"Please wait while we secure your payment...":"Please wait while we confirm your order..."}
      />
    </div>
  );
}
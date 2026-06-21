import express from "express";
import crypto from "crypto";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";
import { sendOrderPaidEmails } from "../services/email.js";
import {
  createInitialPaidState,
  createInitialPaystackPendingState,
} from "../modules/dropship/orderStates.js";
import {
  buildReviewPricing,
  summarizeReviewFlags,
  summarizeStockState,
} from "../modules/dropship/orderCalculations.js";

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_URL  = process.env.BACKEND_URL;

if (!PAYSTACK_SECRET_KEY) throw new Error("Missing PAYSTACK_SECRET_KEY in backend env");
if (!FRONTEND_URL)        throw new Error("Missing FRONTEND_URL in backend env");
if (!BACKEND_URL)         throw new Error("Missing BACKEND_URL in backend env");

const SHOP_OWNER_FLOW_ENABLED = false;
const ORDER_SOURCE   = "web";
const MAX_ITEM_QTY   = 20;
const MAX_CART_ITEMS = 100;

const DELIVERY_METHODS = {
  HOME_DELIVERY: "home_delivery",
  SELF_DELIVERY: "self_delivery",
  SELLER_DIRECT: "seller_direct",
};

const COURIER_FEES = {
  "Greater Accra": 25, "Ashanti": 35, "Western": 45, "Central": 45,
  "Eastern": 45,  "Northern": 55, "Upper East": 55, "Upper West": 55,
  "Volta": 50, "Brong-Ahafo": 50, "Oti": 55, "Ahafo": 50,
  "Bono East": 50, "North East": 55, "Savannah": 55, "Western North": 50,
};

/* ══════════════════════════════════════
   BEME DELIVERY — Pay at Door constants
   See deliveryRoutes.js for the matching
   admin-side dispatch state machine.
══════════════════════════════════════ */
const DELIVERY_STATUS = {
  PENDING_DISPATCH: "pending_dispatch",
  DISPATCHED:       "dispatched",
  PICKED_UP:        "picked_up",
  IN_TRANSIT:       "in_transit",
  DELIVERED:        "delivered",
  FAILED:           "failed",
};
const PAY_AT_DOOR_STATUS = {
  AWAITING_PAYMENT: "awaiting_payment",
  PAID:             "paid",
  FAILED:           "failed",
};
// Pay-at-Door's "Pay Now" button is only valid once the courier has
// actually picked up / is en route — never before, never after delivered.
const PAY_AT_DOOR_ELIGIBLE_STATUSES = [DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.IN_TRANSIT];

async function safeFetch(...args) {
  if (typeof fetch !== "undefined") return fetch(...args);
  const mod = await import("node-fetch");
  return mod.default(...args);
}

function safeTrim(v)            { return String(v ?? "").trim(); }
function toNumber(v, fb = 0)    { const n = Number(v); return Number.isFinite(n) ? n : fb; }
function normalizeEmail(v)      { return safeTrim(v).toLowerCase(); }
function normalizePhone(v)      { return safeTrim(v).replace(/[^\d+]/g, "").slice(0, 30); }
function sanitizeText(v, max=200)         { return safeTrim(v).slice(0, max); }
function sanitizeOptionalText(v, max=200) { return safeTrim(v).slice(0, max) || ""; }
function normalizeSupplierType(v) { return safeTrim(v).toLowerCase().slice(0, 80); }

function normalizeShopKey(value) {
  return String(value || "").trim().toLowerCase()
    .replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function isAllowedShop(value) { return normalizeShopKey(value).length > 0; }

function computeRegionalBaseDeliveryFee(region) {
  return COURIER_FEES[sanitizeText(region, 80)] ?? 40;
}

function getNumericStock(item) {
  const p = Number(item?.stock);
  return Number.isFinite(p) ? p : null;
}

function isOutOfStock(item) {
  if (!item) return true;
  if (item.inStock === false) return true;
  const stock = getNumericStock(item);
  if (stock !== null && stock <= 0) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────
// BATCH C: Server-side discount code validation
// Never accepts a discount amount from the client.
// Always looks up the code in Firestore and computes the amount here.
// ─────────────────────────────────────────────────────────────
async function validateDiscountCode({ code, codeId, storeId, subtotal }) {
  const cleanCode   = safeTrim(code).toUpperCase();
  const cleanCodeId = safeTrim(codeId);
  const cleanStore  = safeTrim(storeId);

  if (!cleanCode || !cleanCodeId) {
    return { discount: 0, discountCode: null, discountCodeId: null };
  }

  let snap;
  try {
    snap = await adminDb.collection("discountCodes").doc(cleanCodeId).get();
  } catch (e) {
    console.error("[discount] Firestore lookup failed:", e.message);
    return { discount: 0, discountCode: null, discountCodeId: null };
  }

  if (!snap.exists) throw new Error("Discount code not found.");

  const data = snap.data();

  if (data.active !== true)
    throw new Error("This discount code is no longer active.");

  if ((data.code || "").toUpperCase() !== cleanCode)
    throw new Error("Discount code is invalid.");

  if (cleanStore && data.storeId && data.storeId !== cleanStore)
    throw new Error("This discount code is not valid for this store.");

  if (data.maxUses != null && data.usedCount >= data.maxUses)
    throw new Error("This discount code has reached its usage limit.");

  if (data.expiresAt) {
    const expiry = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (expiry < new Date()) throw new Error("This discount code has expired.");
  }

  if (data.minOrderAmount != null && subtotal < data.minOrderAmount)
    throw new Error(`This discount code requires a minimum order of GHS ${Number(data.minOrderAmount).toFixed(2)}.`);

  let discount = 0;
  if (data.type === "pct")   discount = Math.min(subtotal, (subtotal * Number(data.value)) / 100);
  if (data.type === "fixed") discount = Math.min(subtotal, Number(data.value));
  discount = Math.max(0, Math.round(discount * 100) / 100);

  return { discount, discountCode: cleanCode, discountCodeId: cleanCodeId };
}

function sanitizeSelectedOptions(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const out = {};
  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = sanitizeText(rawKey, 60);
    if (!key) continue;
    if (Array.isArray(rawValue)) {
      const arr = rawValue.map((p) => sanitizeText(p, 80)).filter(Boolean).slice(0, 20);
      if (arr.length) out[key] = arr;
      continue;
    }
    if (rawValue && typeof rawValue === "object") {
      const nested = sanitizeText(rawValue?.value,80)||sanitizeText(rawValue?.label,80)||
                     sanitizeText(rawValue?.name,80)||sanitizeText(rawValue?.title,80);
      if (nested) out[key] = nested;
      continue;
    }
    const cv = sanitizeText(rawValue, 80);
    if (cv) out[key] = cv;
  }
  return out;
}

function sanitizeSelectedOptionDetails(source) {
  if (!Array.isArray(source)) return [];
  return source.map((opt) => {
    const groupName = sanitizeText(opt?.groupName||opt?.group||opt?.name||opt?.key, 60);
    const label     = sanitizeText(opt?.label||opt?.value||opt?.title, 80);
    const priceBump = toNumber(opt?.priceBump, 0);
    if (!groupName && !label) return null;
    return { groupName, label, priceBump: priceBump >= 0 ? priceBump : 0 };
  }).filter(Boolean).slice(0, 40);
}

function sanitizeCustomizations(source) {
  if (!Array.isArray(source)) return [];
  return source.map((entry) => {
    if (typeof entry === "string") { const v = sanitizeText(entry, 120); return v || null; }
    if (entry && typeof entry === "object") {
      const label = sanitizeText(entry?.label||entry?.name||entry?.key||entry?.title, 60);
      const value = sanitizeText(entry?.value||entry?.selected||entry?.option||entry?.label, 120);
      if (!label && !value) return null;
      return { label, value };
    }
    return null;
  }).filter(Boolean).slice(0, 40);
}

function sanitizeDeliveryInput(source) {
  return {
    method:   sanitizeText(source?.method, 40).toLowerCase(),
    provider: sanitizeText(source?.provider, 80),
    fee:      Math.max(0, toNumber(source?.fee, 0)),
  };
}

function computeAbroadDeliveryFee(lineItems = []) {
  return lineItems.reduce((sum, item) => {
    return sum + Math.max(0, toNumber(item?.abroadDeliveryFee, 0)) * Math.max(1, toNumber(item?.qty, 1));
  }, 0);
}

function computeTrustedDelivery({ delivery, customerRegion, lineItems }) {
  const region       = sanitizeText(customerRegion, 80);
  const cleanDelivery = sanitizeDeliveryInput(delivery);
  const abroadFee    = computeAbroadDeliveryFee(lineItems);

  if (!cleanDelivery.method) throw new Error("A delivery option is required.");

  const VALID = [DELIVERY_METHODS.HOME_DELIVERY, DELIVERY_METHODS.SELF_DELIVERY, DELIVERY_METHODS.SELLER_DIRECT];
  if (!VALID.includes(cleanDelivery.method)) throw new Error("Invalid delivery option selected.");

  let methodFee = 0;
  let label = "";

  if (cleanDelivery.method === DELIVERY_METHODS.HOME_DELIVERY) {
    const regionalFee = computeRegionalBaseDeliveryFee(region);
    methodFee = cleanDelivery.fee > 0 ? cleanDelivery.fee : regionalFee;
    label = cleanDelivery.provider ? `${cleanDelivery.provider} Delivery` : "Courier Delivery";
  } else {
    methodFee = cleanDelivery.fee > 0 ? cleanDelivery.fee : 0;
    label = "Seller Delivery";
  }

  const totalFee = methodFee + abroadFee;
  return {
    method: cleanDelivery.method, label, fee: totalFee,
    breakdown: { methodFee, abroadFee },
    provider: cleanDelivery.provider || "", region,
    homeDelivery:   cleanDelivery.method === DELIVERY_METHODS.HOME_DELIVERY  ? { label, fee: methodFee } : null,
    sellerDelivery: cleanDelivery.method !== DELIVERY_METHODS.HOME_DELIVERY  ? { label, fee: methodFee } : null,
  };
}

/**
 * Builds the trusted delivery sub-object for a Beme-courier order,
 * tagging it with isBemeDelivery/status/paymentTiming so the admin
 * dispatch queue (deliveryRoutes.js) and the customer/seller UI can
 * read it consistently. Only used for the two Beme-courier payment
 * combinations (Paystack-at-checkout-with-courier and Pay-at-Door) —
 * self/seller-direct delivery never sets isBemeDelivery.
 */
function computeTrustedBemeDelivery({ delivery, customerRegion, lineItems, paymentTiming }) {
  const base = computeTrustedDelivery({ delivery, customerRegion, lineItems });
  const isBeme = base.method === DELIVERY_METHODS.HOME_DELIVERY;

  return {
    ...base,
    isBemeDelivery: isBeme,
    status: isBeme ? DELIVERY_STATUS.PENDING_DISPATCH : null,
    paymentTiming: isBeme ? paymentTiming : null,
    payAtDoorStatus: isBeme && paymentTiming === "pay_at_door" ? PAY_AT_DOOR_STATUS.AWAITING_PAYMENT : null,
    payAtDoorReference: null,
    courierProvider: null, trackingNumber: null, estimatedPickup: null, zone: null,
    courierCost: null, margin: null,
    dispatchedAt: null, dispatchedBy: null, pickedUpAt: null,
    deliveredAt: null, deliveredBy: null, confirmBy: null,
    failedAt: null, failReason: null, payoutLocked: isBeme,
    notes: "",
  };
}

async function requireAuthUser(req) {
  const authHeader = String(req.headers.authorization || "");
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) { const e = new Error("Missing authorization token."); e.statusCode = 401; throw e; }
  const decoded = await firebaseAdmin.auth().verifyIdToken(match[1], true);
  if (!decoded?.uid) { const e = new Error("Invalid authorization token."); e.statusCode = 401; throw e; }
  return decoded;
}

function buildOrderFingerprint({ email, customer, items, userId, delivery }) {
  const basis = {
    userId:    sanitizeText(userId, 128),
    email:     normalizeEmail(email),
    firstName: sanitizeText(customer?.firstName, 80),
    lastName:  sanitizeText(customer?.lastName, 80),
    phone:     normalizePhone(customer?.phone),
    address:   sanitizeText(customer?.address, 300),
    region:    sanitizeText(customer?.region, 80),
    city:      sanitizeText(customer?.city, 80),
    delivery: {
      method:   sanitizeText(delivery?.method, 40).toLowerCase(),
      provider: sanitizeText(delivery?.provider, 80),
    },
    items: normalizeIncomingItems(items).map((item) => ({
      id: item.id, qty: item.qty, price: item.price,
      selectedOptions: item.selectedOptions, selectedOptionsLabel: item.selectedOptionsLabel,
      selectedOptionDetails: item.selectedOptionDetails,
      supplierId: item.supplierId, supplierProductId: item.supplierProductId,
      supplierSku: item.supplierSku, supplierVariantId: item.supplierVariantId,
      supplierApiType: item.supplierApiType,
    })),
  };
  return crypto.createHash("sha256").update(JSON.stringify(basis)).digest("hex");
}

function assertCheckoutCustomer(customer, email) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("A valid email is required.");
  if (!sanitizeText(customer?.firstName, 80))    throw new Error("First name is required.");
  if (!sanitizeText(customer?.lastName, 80))     throw new Error("Last name is required.");
  const phone = normalizePhone(customer?.phone);
  if (!phone || phone.length < 7)                throw new Error("A valid phone number is required.");
  if (!sanitizeText(customer?.address, 300))     throw new Error("Delivery address is required.");
  if (!sanitizeText(customer?.region, 80))       throw new Error("Region is required.");
  if (!sanitizeText(customer?.city, 80))         throw new Error("City is required.");
}

function normalizeIncomingItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const id = safeTrim(item?.id || item?.productId);
    return {
      id, productId: id,
      name:  sanitizeText(item?.name, 160),
      image: sanitizeOptionalText(item?.image, 500),
      qty:   Math.max(1, Math.min(MAX_ITEM_QTY, toNumber(item?.qty, 1))),
      price: toNumber(item?.price, 0),
      basePrice: toNumber(item?.basePrice, 0),
      optionPriceTotal: toNumber(item?.optionPriceTotal, 0),
      stock:  getNumericStock(item),
      inStock: item?.inStock !== false,
      shop:    normalizeShopKey(item?.shop || "main"),
      homeSlot: sanitizeOptionalText(item?.homeSlot, 60),
      selectedOptions:      sanitizeSelectedOptions(item?.selectedOptions),
      selectedOptionsLabel: sanitizeOptionalText(item?.selectedOptionsLabel, 240),
      selectedOptionDetails: sanitizeSelectedOptionDetails(item?.selectedOptionDetails),
      customizations:       sanitizeCustomizations(item?.customizations),
      shippingSource:       sanitizeOptionalText(item?.shippingSource, 60),
      shipsFromAbroad:      item?.shipsFromAbroad === true,
      abroadDeliveryFee:    Math.max(0, toNumber(item?.abroadDeliveryFee, 0)),
      oldPrice: (item?.oldPrice !== undefined && item?.oldPrice !== null && item?.oldPrice !== "")
        ? Math.max(0, toNumber(item?.oldPrice, 0)) : null,
      supplierId:       sanitizeOptionalText(item?.supplierId, 120),
      supplierProductId: sanitizeOptionalText(item?.supplierProductId, 120),
      supplierSku:      sanitizeOptionalText(item?.supplierSku, 120),
      supplierVariantId: sanitizeOptionalText(item?.supplierVariantId, 120),
      supplierCost:     Math.max(0, toNumber(item?.supplierCost, 0)),
      supplierShippingEstimate: Math.max(0, toNumber(item?.supplierShippingEstimate, 0)),
      shipsFrom:    sanitizeOptionalText(item?.shipsFrom, 120),
      supplierApiType: normalizeSupplierType(item?.supplierApiType),
      syncEnabled:  item?.syncEnabled !== false,
      storeId: String(item?.storeId || item?.shopId || "").trim(),
      shopId:  String(item?.shopId  || item?.storeId || "").trim(),
    };
  }).filter((item) => item.id).slice(0, MAX_CART_ITEMS);
}

async function buildCheckoutFromItems(items) {
  const clean = normalizeIncomingItems(items);
  if (!clean.length) return { subtotal: 0, lineItems: [] };

  const ids = clean.map((x) => x.id).filter(Boolean);
  const productMap = new Map();
  for (let i = 0; i < ids.length; i += 10) {
    const snap = await adminDb.collection("Products")
      .where(firebaseAdmin.firestore.FieldPath.documentId(), "in", ids.slice(i, i + 10)).get();
    snap.forEach((d) => productMap.set(d.id, { id: d.id, ...d.data() }));
  }

  let subtotal = 0;
  const lineItems = [];

  for (const item of clean) {
    const product = productMap.get(item.id);
    if (!product) throw new Error(`Product not found: ${item.id}`);
    if (isOutOfStock(product)) throw new Error(`${product?.name || item?.name || "A product"} is out of stock.`);

    const productStock = getNumericStock(product);
    if (productStock !== null && item.qty > productStock)
      throw new Error(`${product?.name || item?.name || "A product"} only has ${productStock} item${productStock === 1 ? "" : "s"} available.`);

    const finalUnitPrice = toNumber(item.price, NaN);
    if (!Number.isFinite(finalUnitPrice) || finalUnitPrice < 0)
      throw new Error(`Invalid final checkout price for product: ${item.id}`);

    const basePriceCandidate = toNumber(item.basePrice, NaN);
    const baseUnitPrice = Number.isFinite(basePriceCandidate) && basePriceCandidate >= 0
      ? basePriceCandidate : toNumber(product.price, 0);
    const optionPriceTotal = item.optionPriceTotal > 0
      ? item.optionPriceTotal : Math.max(0, finalUnitPrice - baseUnitPrice);

    const shop  = normalizeShopKey(item.shop || product.shop || "main");
    const image = sanitizeOptionalText(item.image || product.image || "", 500);
    const name  = sanitizeText(item.name || product.name || "", 160);
    if (!isAllowedShop(shop)) throw new Error(`Invalid shop for product: ${item.id}`);

    const pm = product?.supplierMapping && typeof product.supplierMapping === "object" ? product.supplierMapping : null;

    subtotal += finalUnitPrice * item.qty;

    lineItems.push({
      id: item.id, productId: item.id, name, price: finalUnitPrice,
      basePrice: baseUnitPrice, optionPriceTotal, qty: item.qty, image, shop,
      selectedOptions:      item.selectedOptions || {},
      selectedOptionsLabel: item.selectedOptionsLabel || "",
      selectedOptionDetails: Array.isArray(item.selectedOptionDetails) ? item.selectedOptionDetails : [],
      customizations:       Array.isArray(item.customizations) ? item.customizations : [],
      shippingSource:       item.shippingSource || "",
      shipsFromAbroad:      item.shipsFromAbroad === true,
      abroadDeliveryFee:    Math.max(0, toNumber(item.abroadDeliveryFee, 0)),
      stock:   productStock,
      inStock: product.inStock !== false,
      supplierId:       sanitizeOptionalText(item.supplierId || pm?.supplierId, 120),
      supplierProductId: sanitizeOptionalText(item.supplierProductId || pm?.supplierProductId, 120),
      supplierSku:      sanitizeOptionalText(item.supplierSku || pm?.supplierSku, 120),
      supplierVariantId: sanitizeOptionalText(item.supplierVariantId || pm?.supplierVariantId, 120),
      supplierCost:     Math.max(0, toNumber(item.supplierCost, pm?.supplierCost ?? 0)),
      supplierShippingEstimate: Math.max(0, toNumber(item.supplierShippingEstimate, pm?.supplierShippingEstimate ?? item.abroadDeliveryFee ?? 0)),
      shipsFrom:       sanitizeOptionalText(item.shipsFrom || pm?.shipsFrom, 120),
      supplierApiType: normalizeSupplierType(item.supplierApiType || pm?.supplierApiType),
      syncEnabled:     item.syncEnabled !== false && pm?.syncEnabled !== false,
    });
  }

  return { subtotal, lineItems };
}

async function findOrderByReference(reference) {
  const q = await adminDb.collection("orders").where("reference", "==", reference).limit(1).get();
  if (q.empty) return null;
  return q.docs[0];
}

async function findExistingRecentPendingOrder({ userId, fingerprint }) {
  if (!userId || !fingerprint) return null;
  const q = await adminDb.collection("orders")
    .where("userId", "==", userId)
    .where("orderFingerprint", "==", fingerprint)
    .where("paymentMethod", "==", "paystack")
    .where("paymentStatus", "==", "pending")
    .limit(1).get().catch(() => null);
  if (!q || q.empty) return null;
  return q.docs[0];
}

async function verifyPaystackReference(reference) {
  const response = await safeFetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.status) throw new Error(data?.message || "Verify failed");
  return data?.data || {};
}

async function finalizeFailedOrder(orderRef, existing, status = "failed", extra = {}) {
  await orderRef.update({
    paid: false, paymentStatus: "failed", status: "payment_failed",
    fulfillmentStatus: "failed",
    supplierPushStatus: existing?.supplierPushStatus || "not_sent",
    verifyLock: false,
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    paystack: { ...(existing?.paystack || {}), verified: true, status: status || "failed", ...extra },
  });
}

/* ══════════════════════════════════════
   CHECKOUT INIT
   (Paystack-at-checkout — used for both
   self-delivery and Beme-courier-prepaid
   orders. Unchanged from before this build
   except delivery now flows through
   computeTrustedBemeDelivery so courier
   orders get tagged isBemeDelivery/status.)
══════════════════════════════════════ */
router.post("/checkout/init", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);

    if (!authUser.email_verified) {
      return res.status(403).json({ error: "Email verification required before checkout." });
    }

    const email    = normalizeEmail(req.body?.email);
    const items    = req.body?.items || [];
    const customer = req.body?.customer || {};
    const delivery = req.body?.delivery || {};
    const pricing  = req.body?.pricing  || {};
    const userId   = authUser.uid;

    assertCheckoutCustomer(customer, email);

    if (authUser.email && normalizeEmail(authUser.email) !== email) {
      return res.status(403).json({ error: "Authenticated email does not match checkout email." });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const region = sanitizeText(customer.region, 80);
    const { subtotal, lineItems } = await buildCheckoutFromItems(items);
    if (!lineItems.length) return res.status(400).json({ error: "Cart items invalid" });

    // Paid-at-checkout Beme-courier orders are "prepaid" timing — the fee is
    // already in Beme's balance before the courier is ever paid.
    const trustedDelivery = computeTrustedBemeDelivery({
      delivery, customerRegion: region, lineItems, paymentTiming: "prepaid",
    });
    const deliveryFee = trustedDelivery.fee;

    const requestedSubtotal = toNumber(pricing?.subtotal, subtotal);
    const safeSubtotal = Math.abs(requestedSubtotal - subtotal) < 0.01 ? requestedSubtotal : subtotal;

    // BATCH C: validate discount server-side — never trust client amount
    const incomingCode   = safeTrim(pricing?.discountCode   || "").toUpperCase() || null;
    const incomingCodeId = safeTrim(pricing?.discountCodeId || "") || null;
    const primaryStoreId = Array.from(
      new Set(lineItems.map((item) => (item.storeId || item.shopId || "").trim()).filter(Boolean))
    )[0] || null;

    let validatedDiscount = 0;
    let validatedCode     = null;
    let validatedCodeId   = null;

    if (incomingCode && incomingCodeId) {
      try {
        const result = await validateDiscountCode({
          code:    incomingCode,
          codeId:  incomingCodeId,
          storeId: primaryStoreId,
          subtotal: safeSubtotal,
        });
        validatedDiscount = result.discount;
        validatedCode     = result.discountCode;
        validatedCodeId   = result.discountCodeId;
      } catch (discountError) {
        return res.status(400).json({ error: discountError.message });
      }
    }

    const total = Math.max(0, safeSubtotal + deliveryFee - validatedDiscount);
    if (total <= 0) return res.status(400).json({ error: "Invalid order total." });

    const amountPesewas = Math.round(total * 100);
    const fingerprint   = buildOrderFingerprint({ email, customer, items, userId, delivery: trustedDelivery });

    const existingPendingOrder = await findExistingRecentPendingOrder({ userId, fingerprint });

    if (existingPendingOrder) {
      const existingData      = existingPendingOrder.data() || {};
      const existingReference = safeTrim(existingData.reference);
      if (existingData?.userId === userId && existingReference &&
          existingData?.paymentMethod === "paystack" &&
          safeTrim(existingData?.paymentStatus) === "pending") {
        try {
          const verifyData     = await verifyPaystackReference(existingReference);
          const paystackStatus = safeTrim(verifyData?.status).toLowerCase();
          if (paystackStatus === "success") {
            return res.json({
              authorization_url: `${FRONTEND_URL}/order-success?reference=${encodeURIComponent(existingReference)}&status=verifying`,
              reference: existingReference, orderId: existingPendingOrder.id,
              reuseExisting: true, alreadyPaid: true,
            });
          }
          await finalizeFailedOrder(existingPendingOrder.ref, existingData, paystackStatus || "stale_pending",
            { amountPesewas: Number(verifyData?.amount || 0), paidAt: verifyData?.paid_at || null, replacedByRetry: true });
        } catch (verifyError) {
          await finalizeFailedOrder(existingPendingOrder.ref, existingData, "stale_pending",
            { replacedByRetry: true, verifyError: String(verifyError?.message || verifyError) });
        }
      }
    }

    const orderRef = adminDb.collection("orders").doc();
    const now      = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    const storeIds = Array.from(new Set(lineItems.map((item) => (item.storeId || item.shopId || "").trim()).filter(Boolean)));
    const shops    = Array.from(new Set([...storeIds, ...lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean)]));

    const rawPricing = {
      currency: "GHS",
      subtotal: safeSubtotal,
      deliveryFee,
      discount:       validatedDiscount,
      discountCode:   validatedDiscount > 0 ? validatedCode   : null,
      discountCodeId: validatedDiscount > 0 ? validatedCodeId : null,
      total,
    };

    const enrichedPricing = buildReviewPricing(rawPricing, lineItems);
    const initialState    = createInitialPaystackPendingState();
    const reviewFlags     = summarizeReviewFlags({
      items: lineItems, pricing: enrichedPricing,
      customer: {
        email,
        firstName: sanitizeText(customer.firstName, 80),
        lastName:  sanitizeText(customer.lastName, 80),
        phone:     normalizePhone(customer.phone),
        network:   sanitizeOptionalText(customer.network, 40),
        country:   "Ghana",
        address:   sanitizeText(customer.address, 300),
        region,
        city:      sanitizeText(customer.city, 80),
        area:      sanitizeOptionalText(customer.area, 120),
        notes:     sanitizeOptionalText(customer.notes, 500),
      },
    });
    const stockCheckSummary = summarizeStockState(lineItems);
    const firstSupplierMappedItem = lineItems.find(
      (item) => item.supplierApiType || item.supplierId || item.supplierProductId || item.supplierSku || item.supplierVariantId
    );

    await orderRef.set({
      status: "pending_payment", paymentMethod: "paystack", paymentStatus: "pending",
      paid: false, emailSent: false, reference: "", source: ORDER_SOURCE,
      userId, orderFingerprint: fingerprint, verifyLock: false,
      pricing: enrichedPricing, delivery: trustedDelivery,
      customer: {
        email,
        firstName: sanitizeText(customer.firstName, 80),
        lastName:  sanitizeText(customer.lastName, 80),
        phone:     normalizePhone(customer.phone),
        network:   sanitizeOptionalText(customer.network, 40),
        country:   "Ghana",
        address:   sanitizeText(customer.address, 300),
        region,
        city:  sanitizeText(customer.city, 80),
        area:  sanitizeOptionalText(customer.area, 120),
        notes: sanitizeOptionalText(customer.notes, 500),
      },
      items: lineItems, shops,
      primaryShop: storeIds[0] || shops[0] || "main",
      storeId:  storeIds[0] || null,
      sellerId: storeIds[0] || null,
      shopOwnerId: req.body?.shopOwnerId || null,
      progressStep: -1, progressStages: [],
      fulfillmentStatus:  initialState.fulfillmentStatus,
      supplierPushStatus: initialState.supplierPushStatus,
      adminReviewed:  initialState.adminReviewed,
      adminApproved:  initialState.adminApproved,
      approvedBy: "", approvedAt: null, rejectedBy: "", rejectedAt: null,
      heldBy: "", heldAt: null, reviewNotes: "",
      supplierId:    firstSupplierMappedItem?.supplierId    || "",
      supplierApiType: firstSupplierMappedItem?.supplierApiType || "",
      supplierOrderId: "", supplierStatus: "", syncAttempts: 0, lastSyncError: "",
      supplierTrackingNumber: "", supplierTrackingUrl: "", supplierPushKey: "",
      supplierPushResponseSummary: null,
      reviewFlags, stockCheckSummary,
      createdAt: now, updatedAt: now,
    });

    const reference = `BM_${orderRef.id}`;

    const initRes = await safeFetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email, amount: amountPesewas, currency: "GHS", reference,
        callback_url: `${BACKEND_URL}/api/paystack/checkout/callback`,
        metadata: {
          type: "order", orderId: orderRef.id, userId, fingerprint,
          deliveryMethod: trustedDelivery.method, deliveryLabel: trustedDelivery.label,
          deliveryFee, deliveryBreakdown: trustedDelivery.breakdown,
          subtotal: safeSubtotal, total,
          itemCount: lineItems.reduce((s, i) => s + i.qty, 0),
          items: lineItems.map((item) => ({
            id: item.id, name: item.name, qty: item.qty, price: item.price,
            basePrice: item.basePrice, optionPriceTotal: item.optionPriceTotal,
            selectedOptions: item.selectedOptions || {},
            selectedOptionsLabel: item.selectedOptionsLabel || "",
            selectedOptionDetails: item.selectedOptionDetails || [],
            supplierId: item.supplierId || "", supplierProductId: item.supplierProductId || "",
            supplierSku: item.supplierSku || "", supplierVariantId: item.supplierVariantId || "",
            supplierApiType: item.supplierApiType || "",
          })),
        },
      }),
    });

    const initData = await initRes.json().catch(() => ({}));

    if (!initRes.ok || !initData?.status || !initData?.data?.authorization_url) {
      await orderRef.update({
        status: "paystack_init_failed", paymentStatus: "failed", fulfillmentStatus: "failed",
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        paystack: { initError: initData },
      });
      return res.status(400).json({ error: initData?.message || "Paystack init failed" });
    }

    await orderRef.update({
      reference,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      paystack: { reference, access_code: initData?.data?.access_code || null, initialized: true },
    });

    return res.json({ authorization_url: initData.data.authorization_url, reference, orderId: orderRef.id });

  } catch (err) {
    console.error("Paystack init error:", err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Server error" });
  }
});

router.post("/shop-owner/init", async (_req, res) => {
  return res.status(403).json({ error: "Shop owner applications are temporarily disabled." });
});

/* ══════════════════════════════════════
   VERIFY ORDER (shared by callback + verify route)
══════════════════════════════════════ */
async function verifyOrderAndUpdate(reference) {
  const orderDoc = await findOrderByReference(reference);
  if (!orderDoc) return { status: "not_found", orderId: null, userId: null };

  const orderRef = orderDoc.ref;
  const existing = orderDoc.data() || {};

  if (existing?.paid === true && existing?.paymentStatus === "paid") {
    return { status: "success", orderId: orderDoc.id, userId: existing?.userId || null };
  }
  if (existing?.verifyLock === true) {
    return {
      status: existing?.paid ? "success" : safeTrim(existing?.paymentStatus || "pending"),
      orderId: orderDoc.id, userId: existing?.userId || null,
    };
  }

  await orderRef.update({ verifyLock: true, updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });

  try {
    const data         = await verifyPaystackReference(reference);
    const status       = safeTrim(data?.status).toLowerCase();
    const amountPesewas = Number(data?.amount || 0);
    const paidAt       = data?.paid_at || null;
    const metadata     = data?.metadata || {};

    const expectedTotal = Math.round(toNumber(existing?.pricing?.total, 0) * 100);
    if (expectedTotal <= 0) throw new Error("Stored order total is invalid.");

    if (metadata?.userId && metadata.userId !== existing?.userId) {
      await finalizeFailedOrder(orderRef, existing, "user_mismatch",
        { metadataUserId: metadata.userId, orderUserId: existing?.userId || null });
      return { status: "user_mismatch", orderId: orderDoc.id, userId: existing?.userId || null };
    }

    if (amountPesewas !== expectedTotal) {
      await finalizeFailedOrder(orderRef, existing, "amount_mismatch",
        { amountPesewas, expectedAmountPesewas: expectedTotal });
      return { status: "amount_mismatch", orderId: orderDoc.id, userId: existing?.userId || null };
    }

    if (metadata?.type && metadata.type !== "order") {
      await finalizeFailedOrder(orderRef, existing, "invalid_metadata_type",
        { amountPesewas, expectedAmountPesewas: expectedTotal });
      return { status: "invalid_metadata_type", orderId: orderDoc.id, userId: existing?.userId || null };
    }

    if (status === "success") {
      const paidState = createInitialPaidState();
      await orderRef.update({
        paid: true, paymentStatus: "paid", status: "paid",
        fulfillmentStatus:  paidState.fulfillmentStatus,
        supplierPushStatus: paidState.supplierPushStatus,
        adminReviewed: paidState.adminReviewed,
        adminApproved: paidState.adminApproved,
        verifyLock: false,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        paystack: { ...(existing?.paystack || {}), verified: true, status, amountPesewas, paidAt },
      });

      const refreshed = (await orderRef.get()).data() || existing;

      if (!refreshed?.emailSent) {
        try {
          await sendOrderPaidEmails({
            orderId: orderDoc.id, reference,
            customer: refreshed?.customer,
            amounts:  refreshed?.pricing || refreshed?.amounts,
          });
          await orderRef.update({ emailSent: true, updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
        } catch (e) {
          await orderRef.update({ emailSent: false, emailError: String(e?.message || e), updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
        }
      }

      return { status: "success", orderId: orderDoc.id, userId: refreshed?.userId || existing?.userId || null };
    }

    await finalizeFailedOrder(orderRef, existing, status || "failed", { amountPesewas, paidAt });
    return { status: status || "failed", orderId: orderDoc.id, userId: existing?.userId || null };

  } catch (error) {
    await orderRef.update({
      verifyLock: false,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      paystack: { ...(existing?.paystack || {}), verifyError: String(error?.message || error) },
    });
    throw error;
  }
}

/* ══════════════════════════════════════
   CALLBACK (redirect from Paystack)
══════════════════════════════════════ */
router.get("/checkout/callback", async (req, res) => {
  const reference = safeTrim(req.query?.reference || req.query?.trxref);
  if (!reference) return res.redirect(`${FRONTEND_URL}/order-success?status=missing_reference`);
  try {
    const out = await verifyOrderAndUpdate(reference);
    if (out?.status === "success") {
      return res.redirect(`${FRONTEND_URL}/order-success?reference=${encodeURIComponent(reference)}&status=success`);
    }
    return res.redirect(`${FRONTEND_URL}/order-success?reference=${encodeURIComponent(reference)}&status=${encodeURIComponent(out?.status || "failed")}`);
  } catch (err) {
    console.error("Paystack callback verify error:", err);
    return res.redirect(`${FRONTEND_URL}/order-success?reference=${encodeURIComponent(reference)}&status=verify_error`);
  }
});

/* ══════════════════════════════════════
   VERIFY (frontend polling)
══════════════════════════════════════ */
router.get("/checkout/verify", async (req, res) => {
  try {
    const authUser  = await requireAuthUser(req);
    const reference = safeTrim(req.query?.reference);
    if (!reference) return res.status(400).json({ error: "Missing reference" });

    const out = await verifyOrderAndUpdate(reference);
    if (!out?.orderId) return res.status(404).json({ error: "Order not found" });
    if (out?.userId && out.userId !== authUser.uid) return res.status(403).json({ error: "You are not allowed to verify this order." });

    return res.json({ ok: true, status: out.status, reference, orderId: out.orderId });
  } catch (err) {
    console.error("Paystack verify error:", err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Server error" });
  }
});

/* ════════════════════════════════════════════════════════════
   BEME DELIVERY — PAY AT DOOR
   ════════════════════════════════════════════════════════════
   Three pieces:
   1. POST /pay-at-door/create  — customer selects "Pay at Door"
      at checkout. Creates an UNPAID order (no Paystack call yet).
   2. POST /pay-at-door/init    — customer taps "Pay Now" on their
      Orders page once the courier has arrived. Initializes a real
      Paystack transaction scoped to that existing order's total.
   3. verifyPayAtDoorAndUpdate  — mirrors verifyOrderAndUpdate above.
      Server-side Paystack verify is REQUIRED before payAtDoorStatus
      or paymentStatus ever flips to paid. A client "success" callback
      alone is never trusted — same integrity rule as the rest of
      this file.
   ════════════════════════════════════════════════════════════ */

/* ── 1. CREATE (unpaid order, at checkout) ── */
router.post("/pay-at-door/create", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);

    if (!authUser.email_verified) {
      return res.status(403).json({ error: "Email verification required before checkout." });
    }

    const email    = normalizeEmail(req.body?.email);
    const items    = req.body?.items || [];
    const customer = req.body?.customer || {};
    const delivery = req.body?.delivery || {};
    const pricing  = req.body?.pricing  || {};
    const userId   = authUser.uid;

    assertCheckoutCustomer(customer, email);

    if (authUser.email && normalizeEmail(authUser.email) !== email) {
      return res.status(403).json({ error: "Authenticated email does not match checkout email." });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const region = sanitizeText(customer.region, 80);
    const { subtotal, lineItems } = await buildCheckoutFromItems(items);
    if (!lineItems.length) return res.status(400).json({ error: "Cart items invalid" });

    const trustedDelivery = computeTrustedBemeDelivery({
      delivery, customerRegion: region, lineItems, paymentTiming: "pay_at_door",
    });

    // Pay at Door only makes sense paired with Beme courier — the entire
    // safety model depends on Beme controlling the payment moment.
    if (!trustedDelivery.isBemeDelivery) {
      return res.status(400).json({ error: "Pay at Door is only available with Beme courier delivery." });
    }

    const deliveryFee = trustedDelivery.fee;
    const requestedSubtotal = toNumber(pricing?.subtotal, subtotal);
    const safeSubtotal = Math.abs(requestedSubtotal - subtotal) < 0.01 ? requestedSubtotal : subtotal;

    const incomingCode   = safeTrim(pricing?.discountCode   || "").toUpperCase() || null;
    const incomingCodeId = safeTrim(pricing?.discountCodeId || "") || null;
    const primaryStoreId = Array.from(
      new Set(lineItems.map((item) => (item.storeId || item.shopId || "").trim()).filter(Boolean))
    )[0] || null;

    let validatedDiscount = 0;
    let validatedCode     = null;
    let validatedCodeId   = null;

    if (incomingCode && incomingCodeId) {
      try {
        const result = await validateDiscountCode({
          code: incomingCode, codeId: incomingCodeId, storeId: primaryStoreId, subtotal: safeSubtotal,
        });
        validatedDiscount = result.discount;
        validatedCode     = result.discountCode;
        validatedCodeId   = result.discountCodeId;
      } catch (discountError) {
        return res.status(400).json({ error: discountError.message });
      }
    }

    const total = Math.max(0, safeSubtotal + deliveryFee - validatedDiscount);
    if (total <= 0) return res.status(400).json({ error: "Invalid order total." });

    const fingerprint = buildOrderFingerprint({ email, customer, items, userId, delivery: trustedDelivery });

    const orderRef = adminDb.collection("orders").doc();
    const now       = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    const storeIds = Array.from(new Set(lineItems.map((item) => (item.storeId || item.shopId || "").trim()).filter(Boolean)));
    const shops    = Array.from(new Set([...storeIds, ...lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean)]));

    const rawPricing = {
      currency: "GHS",
      subtotal: safeSubtotal,
      deliveryFee,
      discount:       validatedDiscount,
      discountCode:   validatedDiscount > 0 ? validatedCode   : null,
      discountCodeId: validatedDiscount > 0 ? validatedCodeId : null,
      total,
    };
    const enrichedPricing = buildReviewPricing(rawPricing, lineItems);

    // Pay-at-Door orders start in the same "awaiting payment" shape as a
    // pending Paystack order — paid never becomes true until the door payment
    // is verified, which can be days after the order is created.
    const initialState = createInitialPaystackPendingState();
    const reviewFlags   = summarizeReviewFlags({
      items: lineItems, pricing: enrichedPricing,
      customer: {
        email,
        firstName: sanitizeText(customer.firstName, 80),
        lastName:  sanitizeText(customer.lastName, 80),
        phone:     normalizePhone(customer.phone),
        network:   sanitizeOptionalText(customer.network, 40),
        country:   "Ghana",
        address:   sanitizeText(customer.address, 300),
        region,
        city:      sanitizeText(customer.city, 80),
        area:      sanitizeOptionalText(customer.area, 120),
        notes:     sanitizeOptionalText(customer.notes, 500),
      },
    });
    const stockCheckSummary = summarizeStockState(lineItems);
    const firstSupplierMappedItem = lineItems.find(
      (item) => item.supplierApiType || item.supplierId || item.supplierProductId || item.supplierSku || item.supplierVariantId
    );

    await orderRef.set({
      // No "reference" yet — that's only created when /pay-at-door/init runs,
      // at the moment the customer actually taps Pay Now at the door.
      status: "pending", paymentMethod: "pay_at_door", paymentStatus: "pending",
      paid: false, emailSent: false, reference: "", source: ORDER_SOURCE,
      userId, orderFingerprint: fingerprint, verifyLock: false,
      pricing: enrichedPricing, delivery: trustedDelivery,
      customer: {
        email,
        firstName: sanitizeText(customer.firstName, 80),
        lastName:  sanitizeText(customer.lastName, 80),
        phone:     normalizePhone(customer.phone),
        network:   sanitizeOptionalText(customer.network, 40),
        country:   "Ghana",
        address:   sanitizeText(customer.address, 300),
        region,
        city:  sanitizeText(customer.city, 80),
        area:  sanitizeOptionalText(customer.area, 120),
        notes: sanitizeOptionalText(customer.notes, 500),
      },
      items: lineItems, shops,
      primaryShop: storeIds[0] || shops[0] || "main",
      storeId:  storeIds[0] || null,
      sellerId: storeIds[0] || null,
      shopOwnerId: storeIds[0] || null,
      progressStep: -1, progressStages: [],
      fulfillmentStatus:  initialState.fulfillmentStatus,
      supplierPushStatus: initialState.supplierPushStatus,
      adminReviewed:  initialState.adminReviewed,
      adminApproved:  initialState.adminApproved,
      approvedBy: "", approvedAt: null, rejectedBy: "", rejectedAt: null,
      heldBy: "", heldAt: null, reviewNotes: "",
      supplierId:    firstSupplierMappedItem?.supplierId    || "",
      supplierApiType: firstSupplierMappedItem?.supplierApiType || "",
      supplierOrderId: "", supplierStatus: "", syncAttempts: 0, lastSyncError: "",
      supplierTrackingNumber: "", supplierTrackingUrl: "", supplierPushKey: "",
      supplierPushResponseSummary: null,
      reviewFlags, stockCheckSummary,
      createdAt: now, updatedAt: now,
    });

    return res.status(201).json({
      success: true,
      message: "Order created. Payment will be collected when the courier arrives.",
      orderId: orderRef.id,
    });
  } catch (err) {
    console.error("Pay-at-Door create error:", err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to create order." });
  }
});

/* ── 2. INIT (customer taps "Pay Now" at the door) ── */
router.post("/pay-at-door/init", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);
    const orderId  = sanitizeText(req.body?.orderId, 200);
    if (!orderId) return res.status(400).json({ error: "Missing orderId." });

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return res.status(404).json({ error: "Order not found." });

    const order = orderSnap.data() || {};

    if (order.userId !== authUser.uid) {
      return res.status(403).json({ error: "This order does not belong to your account." });
    }
    if (order?.delivery?.paymentTiming !== "pay_at_door") {
      return res.status(400).json({ error: "This order is not a Pay-at-Door order." });
    }
    if (order?.delivery?.payAtDoorStatus === PAY_AT_DOOR_STATUS.PAID) {
      return res.status(400).json({ error: "This order has already been paid." });
    }
    // Gate exactly per spec: Pay Now is only valid once the courier has
    // actually picked up the package or is en route — never earlier.
    if (!PAY_AT_DOOR_ELIGIBLE_STATUSES.includes(order?.delivery?.status)) {
      return res.status(400).json({
        error: "Payment is not available yet — please wait until the courier has picked up your order.",
      });
    }

    const total = toNumber(order?.pricing?.total, 0);
    if (total <= 0) return res.status(400).json({ error: "Invalid order total." });

    const amountPesewas = Math.round(total * 100);
    const reference = `PAD_${orderId}_${Date.now()}`;
    const email = order?.customer?.email || authUser.email || `${authUser.uid}@bememarket.store`;

    const initRes = await safeFetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email, amount: amountPesewas, currency: "GHS", reference,
        callback_url: `${FRONTEND_URL}/orders?pad_ref=${reference}`,
        metadata: { type: "pay_at_door", orderId, userId: authUser.uid, total },
      }),
    });
    const initData = await initRes.json().catch(() => ({}));

    if (!initRes.ok || !initData?.status || !initData?.data?.authorization_url) {
      return res.status(400).json({ error: initData?.message || "Paystack init failed." });
    }

    await orderRef.update({
      "delivery.payAtDoorReference": reference,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ authorization_url: initData.data.authorization_url, reference, orderId });
  } catch (err) {
    console.error("Pay-at-Door init error:", err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Server error" });
  }
});

/* ── 3. VERIFY (shared by polling route + webhook) ──
   Mirrors verifyOrderAndUpdate's integrity model exactly:
   server-side Paystack verify is mandatory, amount/order/user are
   cross-checked, and a mismatch fails closed (payAtDoorStatus → failed)
   rather than ever assuming success. */
async function verifyPayAtDoorAndUpdate(reference) {
  const q = await adminDb.collection("orders").where("delivery.payAtDoorReference", "==", reference).limit(1).get();
  if (q.empty) return { status: "not_found", orderId: null, userId: null };

  const orderDoc = q.docs[0];
  const orderRef  = orderDoc.ref;
  const existing  = orderDoc.data() || {};

  if (existing?.delivery?.payAtDoorStatus === PAY_AT_DOOR_STATUS.PAID) {
    return { status: "success", orderId: orderDoc.id, userId: existing?.userId || null };
  }
  if (existing?.verifyLock === true) {
    return {
      status: existing?.delivery?.payAtDoorStatus === PAY_AT_DOOR_STATUS.PAID ? "success" : "pending",
      orderId: orderDoc.id, userId: existing?.userId || null,
    };
  }

  await orderRef.update({ verifyLock: true, updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });

  try {
    const data          = await verifyPaystackReference(reference);
    const status        = safeTrim(data?.status).toLowerCase();
    const amountPesewas = Number(data?.amount || 0);
    const paidAt        = data?.paid_at || null;
    const metadata       = data?.metadata || {};

    const expectedTotal = Math.round(toNumber(existing?.pricing?.total, 0) * 100);
    if (expectedTotal <= 0) throw new Error("Stored order total is invalid.");

    if (metadata?.userId && metadata.userId !== existing?.userId) {
      await orderRef.update({
        "delivery.payAtDoorStatus": PAY_AT_DOOR_STATUS.FAILED,
        verifyLock: false,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      });
      return { status: "user_mismatch", orderId: orderDoc.id, userId: existing?.userId || null };
    }

    if (amountPesewas !== expectedTotal) {
      await orderRef.update({
        "delivery.payAtDoorStatus": PAY_AT_DOOR_STATUS.FAILED,
        verifyLock: false,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      });
      return { status: "amount_mismatch", orderId: orderDoc.id, userId: existing?.userId || null };
    }

    if (metadata?.type && metadata.type !== "pay_at_door") {
      await orderRef.update({
        "delivery.payAtDoorStatus": PAY_AT_DOOR_STATUS.FAILED,
        verifyLock: false,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      });
      return { status: "invalid_metadata_type", orderId: orderDoc.id, userId: existing?.userId || null };
    }

    if (status === "success") {
      // IMPORTANT: only payAtDoorStatus/paymentStatus flip here. delivery.status
      // is intentionally untouched — releasing the package and marking
      // "delivered" remains an explicit admin action via deliveryRoutes.js,
      // per the safety rule that only admin changes delivery.status.
      await orderRef.update({
        paid: true, paymentStatus: "paid", status: "paid",
        "delivery.payAtDoorStatus": PAY_AT_DOOR_STATUS.PAID,
        verifyLock: false,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        paystack: { ...(existing?.paystack || {}), verified: true, status, amountPesewas, paidAt, payAtDoor: true },
      });

      const refreshed = (await orderRef.get()).data() || existing;

      if (!refreshed?.emailSent) {
        try {
          await sendOrderPaidEmails({
            orderId: orderDoc.id, reference,
            customer: refreshed?.customer,
            amounts:  refreshed?.pricing || refreshed?.amounts,
          });
          await orderRef.update({ emailSent: true, updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
        } catch (e) {
          await orderRef.update({ emailSent: false, emailError: String(e?.message || e), updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
        }
      }

      return { status: "success", orderId: orderDoc.id, userId: refreshed?.userId || existing?.userId || null };
    }

    // Any non-success Paystack status (failed, abandoned, reversed, etc) —
    // mark payAtDoorStatus failed so admin's reschedule-payment endpoint can
    // reset it. delivery.status remains whatever it was (picked_up/in_transit)
    // — this is explicitly NOT a delivery failure.
    await orderRef.update({
      "delivery.payAtDoorStatus": PAY_AT_DOOR_STATUS.FAILED,
      verifyLock: false,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      paystack: { ...(existing?.paystack || {}), verified: true, status: status || "failed", amountPesewas, paidAt },
    });
    return { status: status || "failed", orderId: orderDoc.id, userId: existing?.userId || null };

  } catch (error) {
    await orderRef.update({
      verifyLock: false,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      paystack: { ...(existing?.paystack || {}), verifyError: String(error?.message || error) },
    });
    throw error;
  }
}

/* ── Frontend polling after the Paystack redirect ── */
router.get("/pay-at-door/verify", async (req, res) => {
  try {
    const authUser  = await requireAuthUser(req);
    const reference = safeTrim(req.query?.reference);
    if (!reference) return res.status(400).json({ error: "Missing reference" });

    const out = await verifyPayAtDoorAndUpdate(reference);
    if (!out?.orderId) return res.status(404).json({ error: "Order not found" });
    if (out?.userId && out.userId !== authUser.uid) return res.status(403).json({ error: "You are not allowed to verify this order." });

    return res.json({ ok: true, status: out.status, reference, orderId: out.orderId });
  } catch (err) {
    console.error("Pay-at-Door verify error:", err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Server error" });
  }
});

/* ══════════════════════════════════════
   BATCH C: PAYSTACK WEBHOOK
   Primary payment confirmation — fires server-to-server, no browser required.
   HMAC-SHA512 signature validated before processing.
   Handles charge.success for orders, ai_topup, and pay_at_door types.
══════════════════════════════════════ */
router.post("/webhook", async (req, res) => {
  // Raw body is set by app.js: app.use("/api/paystack/webhook", express.raw(...))
  const signature = req.headers["x-paystack-signature"];
  const rawBody   = req.body; // Buffer from express.raw()

  // Always respond 200 quickly — Paystack retries if it doesn't get a fast response
  // Validate signature first; reject silently on failure (don't reveal details)
  if (!signature || !Buffer.isBuffer(rawBody)) {
    return res.status(200).json({ received: true });
  }

  const expectedSig = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSig) {
    console.warn("[webhook] Invalid Paystack signature — rejected");
    return res.status(200).json({ received: true }); // 200 to stop retries on bad sig
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    console.error("[webhook] Failed to parse webhook body");
    return res.status(200).json({ received: true });
  }

  const eventType = event?.event;
  const data      = event?.data || {};
  const reference = safeTrim(data?.reference);

  console.log(`[webhook] Received event: ${eventType} | reference: ${reference}`);

  // Process asynchronously — don't await, respond immediately
  res.status(200).json({ received: true });

  // Handle payment success
  if (eventType === "charge.success" && reference) {
    const metadataType = data?.metadata?.type;

    if (metadataType === "order" || reference.startsWith("BM_")) {
      // Standard order payment (checkout-time Paystack, self or Beme-courier prepaid)
      try {
        const out = await verifyOrderAndUpdate(reference);
        console.log(`[webhook] Order ${reference} → ${out.status}`);
      } catch (err) {
        console.error(`[webhook] Order verify failed for ${reference}:`, err.message);
      }

    } else if (metadataType === "pay_at_door" || reference.startsWith("PAD_")) {
      // Pay-at-Door payment, collected the moment the courier arrives
      try {
        const out = await verifyPayAtDoorAndUpdate(reference);
        console.log(`[webhook] Pay-at-Door ${reference} → ${out.status}`);
      } catch (err) {
        console.error(`[webhook] Pay-at-Door verify failed for ${reference}:`, err.message);
      }

    } else if (metadataType === "ai_topup" || reference.startsWith("topup_")) {
      // AI topup payment — same idempotency logic as /topup/verify
      try {
        const { uid, pack, credits } = data?.metadata || {};
        if (!uid || !pack || !credits) {
          console.error("[webhook] ai_topup missing metadata fields");
          return;
        }

        // Idempotency check
        const existingTopup = await adminDb.collection("aiTopups")
          .where("reference", "==", reference).limit(1).get();

        if (!existingTopup.empty) {
          console.log(`[webhook] ai_topup ${reference} already processed — skipping`);
          return;
        }

        const { FieldValue } = await import("firebase-admin/firestore");
        const usageRef = adminDb.collection("aiUsage").doc(uid);
        const snap     = await usageRef.get();
        const today    = new Date().toISOString().split("T")[0];

        if (!snap.exists()) {
          await usageRef.set({ count: 0, date: today, extraCredits: Number(credits), lastUpdated: new Date() });
        } else {
          await usageRef.update({ extraCredits: FieldValue.increment(Number(credits)), lastUpdated: new Date() });
        }

        await adminDb.collection("aiTopups").doc(`${uid}_${Date.now()}`).set({
          uid, pack, credits: Number(credits),
          reference, amount: (data?.amount || 0) / 100,
          purchasedAt: new Date(), source: "webhook",
        });

        console.log(`[webhook] ai_topup ${reference} — credited ${credits} to ${uid}`);
      } catch (err) {
        console.error(`[webhook] ai_topup failed for ${reference}:`, err.message);
      }
    }
  }
});

/* ══════════════════════════════════════
   DISABLED ROUTES
══════════════════════════════════════ */
router.get("/shop-owner/callback", async (_req, res) => {
  return res.redirect(`${FRONTEND_URL}/shop-payment-status?status=disabled`);
});
router.get("/shop-owner/verify", async (_req, res) => {
  return res.status(403).json({ error: "Shop owner applications are temporarily disabled." });
});

/* ══════════════════════════════════════
   AI CREDITS TOPUP
══════════════════════════════════════ */
const TOPUP_PACKS = {
  small:          { credits: 50,   label: "50 Messages",     amountGHS: 15 },
  medium:         { credits: 200,  label: "200 Messages",    amountGHS: 45 },
  unlimited_week: { credits: 9999, label: "7-Day Unlimited", amountGHS: 75 },
};

router.post("/topup/init", async (req, res) => {
  let decoded;
  try {
    const auth  = req.headers.authorization || "";
    const match = auth.match(/^Bearer (.+)$/);
    if (!match?.[1]) return res.status(401).json({ error: "Unauthorized" });
    decoded = await firebaseAdmin.auth().verifyIdToken(match[1], true);
  } catch { return res.status(401).json({ error: "Invalid token" }); }

  const { pack } = req.body;
  const packData = TOPUP_PACKS[pack];
  if (!packData) return res.status(400).json({ error: "Invalid pack" });

  const reference = `topup_${decoded.uid}_${pack}_${Date.now()}`;

  try {
    const initRes = await safeFetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email:    decoded.email || `${decoded.uid}@bememarket.store`,
        amount:   packData.amountGHS * 100,
        currency: "GHS",
        reference,
        callback_url: `${FRONTEND_URL}/seller-dashboard?tab=ai&topup_ref=${reference}`,
        metadata: { uid: decoded.uid, pack, credits: packData.credits, type: "ai_topup" },
      }),
    });
    const initData = await initRes.json();
    if (!initData?.status || !initData?.data?.authorization_url) {
      return res.status(500).json({ error: "Paystack init failed" });
    }
    return res.json({ authorization_url: initData.data.authorization_url, reference });
  } catch (e) {
    console.error("[topup/init]", e.message);
    return res.status(500).json({ error: "Payment initialization failed" });
  }
});

router.get("/topup/verify", async (req, res) => {
  let decoded;
  try {
    const auth  = req.headers.authorization || "";
    const match = auth.match(/^Bearer (.+)$/);
    if (!match?.[1]) return res.status(401).json({ error: "Unauthorized" });
    decoded = await firebaseAdmin.auth().verifyIdToken(match[1], true);
  } catch { return res.status(401).json({ error: "Invalid token" }); }

  const { reference } = req.query;
  if (!reference)                       return res.status(400).json({ error: "Missing reference" });
  if (!reference.startsWith("topup_")) return res.status(400).json({ error: "Invalid topup reference" });

  // Idempotency check
  try {
    const existingTopup = await adminDb.collection("aiTopups")
      .where("reference", "==", reference).limit(1).get();
    if (!existingTopup.empty) {
      const existing = existingTopup.docs[0].data();
      return res.json({ success: true, alreadyProcessed: true, credits: existing.credits || 0, pack: existing.pack || "" });
    }
  } catch (e) {
    console.error("[topup/verify] idempotency check failed:", e.message);
  }

  try {
    const verifyRes  = await safeFetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const verifyData = await verifyRes.json();
    if (!verifyData?.status || verifyData?.data?.status !== "success") {
      return res.status(400).json({ error: "Payment not successful", status: verifyData?.data?.status });
    }

    const { uid, pack, credits } = verifyData.data.metadata || {};
    if (!uid || !pack || !credits) return res.status(400).json({ error: "Invalid metadata" });
    if (decoded.uid !== uid)       return res.status(403).json({ error: "This topup does not belong to your account." });

    const { FieldValue } = await import("firebase-admin/firestore");
    const usageRef = adminDb.collection("aiUsage").doc(uid);
    const snap     = await usageRef.get();
    const today    = new Date().toISOString().split("T")[0];

    if (!snap.exists()) {
      await usageRef.set({ count: 0, date: today, extraCredits: Number(credits), lastUpdated: new Date() });
    } else {
      await usageRef.update({ extraCredits: FieldValue.increment(Number(credits)), lastUpdated: new Date() });
    }

    await adminDb.collection("aiTopups").doc(`${uid}_${Date.now()}`).set({
      uid, pack, credits: Number(credits),
      reference, amount: verifyData.data.amount / 100,
      purchasedAt: new Date(),
    });

    return res.json({ success: true, credits: Number(credits), pack });
  } catch (e) {
    console.error("[topup/verify]", e.message);
    return res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
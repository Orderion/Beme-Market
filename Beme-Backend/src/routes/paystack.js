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
const BACKEND_URL = process.env.BACKEND_URL;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("Missing PAYSTACK_SECRET_KEY in backend env");
}
if (!FRONTEND_URL) {
  throw new Error("Missing FRONTEND_URL in backend env");
}
if (!BACKEND_URL) {
  throw new Error("Missing BACKEND_URL in backend env");
}

const ALLOWED_SHOPS = new Set(["fashion", "main", "kente", "perfume", "tech"]);
const SPECIAL_REGIONS = new Set([
  "Ashanti",
  "Greater Accra",
  "Eastern",
  "Western",
]);

const SHOP_OWNER_FLOW_ENABLED = false;
const ORDER_SOURCE = "web";
const MAX_ITEM_QTY = 20;
const MAX_CART_ITEMS = 100;

/* Locked backend delivery rules */
const DELIVERY_METHODS = {
  MALL_PICKUP: "mall_pickup",
  HOME_DELIVERY: "home_delivery",
};

const LOCKED_HOME_DELIVERY_FEE = 150;

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

async function safeFetch(...args) {
  if (typeof fetch !== "undefined") return fetch(...args);
  const mod = await import("node-fetch");
  return mod.default(...args);
}

function safeTrim(v) {
  return String(v ?? "").trim();
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeEmail(value) {
  return safeTrim(value).toLowerCase();
}

function normalizePhone(value) {
  return safeTrim(value).replace(/[^\d+]/g, "").slice(0, 30);
}

function normalizeShopKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalizeSupplierType(value) {
  return safeTrim(value).toLowerCase().slice(0, 80);
}

function isAllowedShop(value) {
  return ALLOWED_SHOPS.has(normalizeShopKey(value));
}

function computeRegionalBaseDeliveryFee(region) {
  if (!region) return 0;
  return SPECIAL_REGIONS.has(region) ? 0 : 50;
}

function getNumericStock(item) {
  const parsed = Number(item?.stock);
  return Number.isFinite(parsed) ? parsed : null;
}

function isOutOfStock(item) {
  if (!item) return true;
  if (item.inStock === false) return true;

  const stock = getNumericStock(item);
  if (stock !== null && stock <= 0) return true;

  return false;
}

function sanitizeText(value, max = 200) {
  return safeTrim(value).slice(0, max);
}

function sanitizeOptionalText(value, max = 200) {
  const out = safeTrim(value).slice(0, max);
  return out || "";
}

function sanitizeSelectedOptions(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }

  const out = {};

  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = sanitizeText(rawKey, 60);
    if (!key) continue;

    if (Array.isArray(rawValue)) {
      const cleanArray = rawValue
        .map((part) => sanitizeText(part, 80))
        .filter(Boolean)
        .slice(0, 20);

      if (cleanArray.length) out[key] = cleanArray;
      continue;
    }

    if (rawValue && typeof rawValue === "object") {
      const nested =
        sanitizeText(rawValue?.value, 80) ||
        sanitizeText(rawValue?.label, 80) ||
        sanitizeText(rawValue?.name, 80) ||
        sanitizeText(rawValue?.title, 80);

      if (nested) out[key] = nested;
      continue;
    }

    const cleanValue = sanitizeText(rawValue, 80);
    if (cleanValue) out[key] = cleanValue;
  }

  return out;
}

function sanitizeSelectedOptionDetails(source) {
  if (!Array.isArray(source)) return [];

  return source
    .map((opt) => {
      const groupName = sanitizeText(
        opt?.groupName || opt?.group || opt?.name || opt?.key,
        60
      );
      const label = sanitizeText(opt?.label || opt?.value || opt?.title, 80);
      const priceBump = toNumber(opt?.priceBump, 0);

      if (!groupName && !label) return null;

      return {
        groupName,
        label,
        priceBump: priceBump >= 0 ? priceBump : 0,
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

function sanitizeDeliveryInput(source) {
  const method = sanitizeText(source?.method, 40).toLowerCase();
  const mallPickupId = sanitizeText(
    source?.mallPickup?.id || source?.mallId,
    80
  );

  return {
    method,
    mallPickupId,
  };
}

function computeAbroadDeliveryFee(lineItems = []) {
  return lineItems.reduce((sum, item) => {
    const qty = Math.max(1, toNumber(item?.qty, 1));
    const fee = Math.max(0, toNumber(item?.abroadDeliveryFee, 0));
    return sum + fee * qty;
  }, 0);
}

function computeTrustedDelivery({ delivery, customerRegion, lineItems }) {
  const region = sanitizeText(customerRegion, 80);
  const cleanDelivery = sanitizeDeliveryInput(delivery);
  const regionalBaseFee = computeRegionalBaseDeliveryFee(region);
  const abroadFee = computeAbroadDeliveryFee(lineItems);

  if (!cleanDelivery.method) {
    throw new Error("A delivery option is required.");
  }

  if (
    cleanDelivery.method !== DELIVERY_METHODS.MALL_PICKUP &&
    cleanDelivery.method !== DELIVERY_METHODS.HOME_DELIVERY
  ) {
    throw new Error("Invalid delivery option selected.");
  }

  let methodFee = 0;
  let label = "";
  let mallPickup = null;
  let homeDelivery = null;

  if (cleanDelivery.method === DELIVERY_METHODS.HOME_DELIVERY) {
    methodFee = LOCKED_HOME_DELIVERY_FEE;
    label = "Home Delivery";
    homeDelivery = {
      label: "Home Delivery",
      fee: LOCKED_HOME_DELIVERY_FEE,
    };
  }

  if (cleanDelivery.method === DELIVERY_METHODS.MALL_PICKUP) {
    if (region !== "Greater Accra") {
      throw new Error("Mall pickup is only available in Greater Accra.");
    }

    const selectedMall = ACCRA_MALL_PICKUP_OPTIONS.find(
      (mall) => mall.id === cleanDelivery.mallPickupId
    );

    if (!selectedMall) {
      throw new Error("Invalid mall pickup option selected.");
    }

    methodFee = Math.max(0, toNumber(selectedMall.fee, 0));
    label = selectedMall.label;
    mallPickup = {
      id: selectedMall.id,
      label: selectedMall.label,
      area: selectedMall.area,
      fee: methodFee,
    };
  }

  const totalFee = regionalBaseFee + methodFee + abroadFee;

  return {
    method: cleanDelivery.method,
    label,
    fee: totalFee,
    breakdown: {
      regionalBaseFee,
      methodFee,
      abroadFee,
    },
    mallPickup,
    homeDelivery,
  };
}

async function requireAuthUser(req) {
  const authHeader = String(req.headers.authorization || "");
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    const error = new Error("Missing authorization token.");
    error.statusCode = 401;
    throw error;
  }

  const decoded = await firebaseAdmin.auth().verifyIdToken(match[1]);
  if (!decoded?.uid) {
    const error = new Error("Invalid authorization token.");
    error.statusCode = 401;
    throw error;
  }

  return decoded;
}

function buildOrderFingerprint({ email, customer, items, userId, delivery }) {
  const basis = {
    userId: sanitizeText(userId, 128),
    email: normalizeEmail(email),
    firstName: sanitizeText(customer?.firstName, 80),
    lastName: sanitizeText(customer?.lastName, 80),
    phone: normalizePhone(customer?.phone),
    address: sanitizeText(customer?.address, 300),
    region: sanitizeText(customer?.region, 80),
    city: sanitizeText(customer?.city, 80),
    delivery: {
      method: sanitizeText(delivery?.method, 40).toLowerCase(),
      mallPickupId: sanitizeText(delivery?.mallPickup?.id, 80),
    },
    items: normalizeIncomingItems(items).map((item) => ({
      id: item.id,
      qty: item.qty,
      price: item.price,
      selectedOptions: item.selectedOptions,
      selectedOptionsLabel: item.selectedOptionsLabel,
      selectedOptionDetails: item.selectedOptionDetails,
      supplierId: item.supplierId,
      supplierProductId: item.supplierProductId,
      supplierSku: item.supplierSku,
      supplierVariantId: item.supplierVariantId,
      supplierApiType: item.supplierApiType,
    })),
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(basis))
    .digest("hex");
}

function assertCheckoutCustomer(customer, email) {
  const firstName = sanitizeText(customer?.firstName, 80);
  const lastName = sanitizeText(customer?.lastName, 80);
  const phone = normalizePhone(customer?.phone);
  const address = sanitizeText(customer?.address, 300);
  const region = sanitizeText(customer?.region, 80);
  const city = sanitizeText(customer?.city, 80);
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("A valid email is required.");
  }
  if (!firstName) throw new Error("First name is required.");
  if (!lastName) throw new Error("Last name is required.");
  if (!phone || phone.length < 7) {
    throw new Error("A valid phone number is required.");
  }
  if (!address) throw new Error("Delivery address is required.");
  if (!region) throw new Error("Region is required.");
  if (!city) throw new Error("City is required.");
}

function normalizeIncomingItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const id = safeTrim(item?.id || item?.productId);
      const qty = Math.max(1, Math.min(MAX_ITEM_QTY, toNumber(item?.qty, 1)));
      const price = toNumber(item?.price, 0);
      const basePrice = toNumber(item?.basePrice, 0);
      const optionPriceTotal = toNumber(item?.optionPriceTotal, 0);
      const stock = getNumericStock(item);

      return {
        id,
        productId: id,
        name: sanitizeText(item?.name, 160),
        image: sanitizeOptionalText(item?.image, 500),
        qty,
        price,
        basePrice,
        optionPriceTotal,
        stock,
        inStock: item?.inStock !== false,
        shop: normalizeShopKey(item?.shop || "main"),
        homeSlot: sanitizeOptionalText(item?.homeSlot, 60),
        selectedOptions: sanitizeSelectedOptions(item?.selectedOptions),
        selectedOptionsLabel: sanitizeOptionalText(
          item?.selectedOptionsLabel,
          240
        ),
        selectedOptionDetails: sanitizeSelectedOptionDetails(
          item?.selectedOptionDetails
        ),
        customizations: sanitizeCustomizations(item?.customizations),
        shippingSource: sanitizeOptionalText(item?.shippingSource, 60),
        shipsFromAbroad: item?.shipsFromAbroad === true,
        abroadDeliveryFee: Math.max(0, toNumber(item?.abroadDeliveryFee, 0)),
        oldPrice:
          item?.oldPrice !== undefined &&
          item?.oldPrice !== null &&
          item?.oldPrice !== ""
            ? Math.max(0, toNumber(item?.oldPrice, 0))
            : null,

        supplierId: sanitizeOptionalText(item?.supplierId, 120),
        supplierProductId: sanitizeOptionalText(item?.supplierProductId, 120),
        supplierSku: sanitizeOptionalText(item?.supplierSku, 120),
        supplierVariantId: sanitizeOptionalText(item?.supplierVariantId, 120),
        supplierCost: Math.max(0, toNumber(item?.supplierCost, 0)),
        supplierShippingEstimate: Math.max(
          0,
          toNumber(item?.supplierShippingEstimate, 0)
        ),
        shipsFrom: sanitizeOptionalText(item?.shipsFrom, 120),
        supplierApiType: normalizeSupplierType(item?.supplierApiType),
        syncEnabled: item?.syncEnabled !== false,
      };
    })
    .filter((item) => item.id)
    .slice(0, MAX_CART_ITEMS);
}

async function buildCheckoutFromItems(items) {
  const clean = normalizeIncomingItems(items);
  if (!clean.length) return { subtotal: 0, lineItems: [] };

  const ids = clean.map((x) => x.id).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10));
  }

  const productMap = new Map();

  for (const chunk of chunks) {
    const snap = await adminDb
      .collection("Products")
      .where(firebaseAdmin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    snap.forEach((docSnap) => {
      productMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
    });
  }

  let subtotal = 0;
  const lineItems = [];

  for (const item of clean) {
    const product = productMap.get(item.id);
    if (!product) {
      throw new Error(`Product not found: ${item.id}`);
    }

    if (isOutOfStock(product)) {
      throw new Error(
        `${product?.name || item?.name || "A product"} is out of stock.`
      );
    }

    const productStock = getNumericStock(product);
    if (productStock !== null && item.qty > productStock) {
      throw new Error(
        `${product?.name || item?.name || "A product"} only has ${productStock} item${
          productStock === 1 ? "" : "s"
        } available.`
      );
    }

    const finalUnitPrice = toNumber(item.price, NaN);
    if (!Number.isFinite(finalUnitPrice) || finalUnitPrice < 0) {
      throw new Error(`Invalid final checkout price for product: ${item.id}`);
    }

    const basePriceCandidate = toNumber(item.basePrice, NaN);
    const baseUnitPrice =
      Number.isFinite(basePriceCandidate) && basePriceCandidate >= 0
        ? basePriceCandidate
        : toNumber(product.price, 0);

    const optionPriceTotal =
      item.optionPriceTotal > 0
        ? item.optionPriceTotal
        : Math.max(0, finalUnitPrice - baseUnitPrice);

    const shop = normalizeShopKey(item.shop || product.shop || "main");
    const image = sanitizeOptionalText(item.image || product.image || "", 500);
    const name = sanitizeText(item.name || product.name || "", 160);

    if (!isAllowedShop(shop)) {
      throw new Error(`Invalid shop for product: ${item.id}`);
    }

    const productSupplierMapping =
      product?.supplierMapping && typeof product.supplierMapping === "object"
        ? product.supplierMapping
        : null;

    const supplierId = sanitizeOptionalText(
      item.supplierId || productSupplierMapping?.supplierId,
      120
    );
    const supplierProductId = sanitizeOptionalText(
      item.supplierProductId || productSupplierMapping?.supplierProductId,
      120
    );
    const supplierSku = sanitizeOptionalText(
      item.supplierSku || productSupplierMapping?.supplierSku,
      120
    );
    const supplierVariantId = sanitizeOptionalText(
      item.supplierVariantId || productSupplierMapping?.supplierVariantId,
      120
    );
    const supplierCost = Math.max(
      0,
      toNumber(item.supplierCost, productSupplierMapping?.supplierCost ?? 0)
    );
    const supplierShippingEstimate = Math.max(
      0,
      toNumber(
        item.supplierShippingEstimate,
        productSupplierMapping?.supplierShippingEstimate ??
          item.abroadDeliveryFee ??
          0
      )
    );
    const shipsFrom = sanitizeOptionalText(
      item.shipsFrom || productSupplierMapping?.shipsFrom,
      120
    );
    const supplierApiType = normalizeSupplierType(
      item.supplierApiType || productSupplierMapping?.supplierApiType
    );
    const syncEnabled =
      item.syncEnabled !== false &&
      productSupplierMapping?.syncEnabled !== false;

    subtotal += finalUnitPrice * item.qty;

    lineItems.push({
      id: item.id,
      productId: item.id,
      name,
      price: finalUnitPrice,
      basePrice: baseUnitPrice,
      optionPriceTotal,
      qty: item.qty,
      image,
      shop,
      selectedOptions: item.selectedOptions || {},
      selectedOptionsLabel: item.selectedOptionsLabel || "",
      selectedOptionDetails: Array.isArray(item.selectedOptionDetails)
        ? item.selectedOptionDetails
        : [],
      customizations: Array.isArray(item.customizations)
        ? item.customizations
        : [],
      shippingSource: item.shippingSource || "",
      shipsFromAbroad: item.shipsFromAbroad === true,
      abroadDeliveryFee: Math.max(0, toNumber(item.abroadDeliveryFee, 0)),
      stock: productStock,
      inStock: product.inStock !== false,

      supplierId,
      supplierProductId,
      supplierSku,
      supplierVariantId,
      supplierCost,
      supplierShippingEstimate,
      shipsFrom,
      supplierApiType,
      syncEnabled,
    });
  }

  return { subtotal, lineItems };
}

async function findOrderByReference(reference) {
  const q = await adminDb
    .collection("orders")
    .where("reference", "==", reference)
    .limit(1)
    .get();

  if (q.empty) return null;
  return q.docs[0];
}

async function findExistingRecentPendingOrder({ userId, fingerprint }) {
  if (!userId || !fingerprint) return null;

  const q = await adminDb
    .collection("orders")
    .where("userId", "==", userId)
    .where("orderFingerprint", "==", fingerprint)
    .where("paymentMethod", "==", "paystack")
    .where("paymentStatus", "==", "pending")
    .limit(1)
    .get()
    .catch(() => null);

  if (!q || q.empty) return null;
  return q.docs[0];
}

async function verifyPaystackReference(reference) {
  const response = await safeFetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.status) {
    throw new Error(data?.message || "Verify failed");
  }

  return data?.data || {};
}

async function finalizeFailedOrder(
  orderRef,
  existing,
  status = "failed",
  extra = {}
) {
  await orderRef.update({
    paid: false,
    paymentStatus: "failed",
    status: "payment_failed",
    fulfillmentStatus: "failed",
    supplierPushStatus: existing?.supplierPushStatus || "not_sent",
    verifyLock: false,
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    paystack: {
      ...(existing?.paystack || {}),
      verified: true,
      status: status || "failed",
      ...extra,
    },
  });
}

router.post("/checkout/init", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);

    const email = normalizeEmail(req.body?.email);
    const items = req.body?.items || [];
    const customer = req.body?.customer || {};
    const delivery = req.body?.delivery || {};
    const pricing = req.body?.pricing || {};
    const userId = authUser.uid;

    assertCheckoutCustomer(customer, email);

    if (authUser.email && normalizeEmail(authUser.email) !== email) {
      return res.status(403).json({
        error: "Authenticated email does not match checkout email.",
      });
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const region = sanitizeText(customer.region, 80);

    const { subtotal, lineItems } = await buildCheckoutFromItems(items);
    if (!lineItems.length) {
      return res.status(400).json({ error: "Cart items invalid" });
    }

    const trustedDelivery = computeTrustedDelivery({
      delivery,
      customerRegion: region,
      lineItems,
    });

    const requestedSubtotal = toNumber(pricing?.subtotal, subtotal);
    const safeSubtotal =
      Math.abs(requestedSubtotal - subtotal) < 0.01
        ? requestedSubtotal
        : subtotal;

    const deliveryFee = trustedDelivery.fee;
    const total = safeSubtotal + deliveryFee;

    if (total <= 0) {
      return res.status(400).json({ error: "Invalid order total." });
    }

    const amountPesewas = Math.round(total * 100);
    const fingerprint = buildOrderFingerprint({
      email,
      customer,
      items,
      userId,
      delivery: trustedDelivery,
    });

    const existingPendingOrder = await findExistingRecentPendingOrder({
      userId,
      fingerprint,
    });

    if (existingPendingOrder) {
      const existingData = existingPendingOrder.data() || {};
      const existingReference = safeTrim(existingData.reference);

      if (
        existingData?.userId === userId &&
        existingReference &&
        existingData?.paymentMethod === "paystack" &&
        safeTrim(existingData?.paymentStatus) === "pending"
      ) {
        try {
          const verifyData = await verifyPaystackReference(existingReference);
          const paystackStatus = safeTrim(verifyData?.status).toLowerCase();

          if (paystackStatus === "success") {
            return res.json({
              authorization_url: `${FRONTEND_URL}/order-success?reference=${encodeURIComponent(
                existingReference
              )}&status=verifying`,
              reference: existingReference,
              orderId: existingPendingOrder.id,
              reuseExisting: true,
              alreadyPaid: true,
            });
          }

          await finalizeFailedOrder(
            existingPendingOrder.ref,
            existingData,
            paystackStatus || "stale_pending",
            {
              amountPesewas: Number(verifyData?.amount || 0),
              paidAt: verifyData?.paid_at || null,
              replacedByRetry: true,
            }
          );
        } catch (verifyError) {
          await finalizeFailedOrder(
            existingPendingOrder.ref,
            existingData,
            "stale_pending",
            {
              replacedByRetry: true,
              verifyError: String(verifyError?.message || verifyError),
            }
          );
        }
      }
    }

    const orderRef = adminDb.collection("orders").doc();
    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    const shops = Array.from(
      new Set(lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean))
    );

    const rawPricing = {
      currency: "GHS",
      subtotal: safeSubtotal,
      deliveryFee,
      total,
    };

    const enrichedPricing = buildReviewPricing(rawPricing, lineItems);
    const initialState = createInitialPaystackPendingState();
    const reviewFlags = summarizeReviewFlags({
      items: lineItems,
      pricing: enrichedPricing,
      customer: {
        email,
        firstName: sanitizeText(customer.firstName, 80),
        lastName: sanitizeText(customer.lastName, 80),
        phone: normalizePhone(customer.phone),
        network: sanitizeOptionalText(customer.network, 40),
        country: "Ghana",
        address: sanitizeText(customer.address, 300),
        region,
        city: sanitizeText(customer.city, 80),
        area: sanitizeOptionalText(customer.area, 120),
        notes: sanitizeOptionalText(customer.notes, 500),
      },
    });
    const stockCheckSummary = summarizeStockState(lineItems);
    const firstSupplierMappedItem = lineItems.find(
      (item) =>
        item.supplierApiType ||
        item.supplierId ||
        item.supplierProductId ||
        item.supplierSku ||
        item.supplierVariantId
    );

    await orderRef.set({
      status: "pending_payment",
      paymentMethod: "paystack",
      paymentStatus: "pending",
      paid: false,
      emailSent: false,
      reference: "",
      source: ORDER_SOURCE,
      userId,
      orderFingerprint: fingerprint,
      verifyLock: false,

      pricing: enrichedPricing,
      delivery: trustedDelivery,
      customer: {
        email,
        firstName: sanitizeText(customer.firstName, 80),
        lastName: sanitizeText(customer.lastName, 80),
        phone: normalizePhone(customer.phone),
        network: sanitizeOptionalText(customer.network, 40),
        country: "Ghana",
        address: sanitizeText(customer.address, 300),
        region,
        city: sanitizeText(customer.city, 80),
        area: sanitizeOptionalText(customer.area, 120),
        notes: sanitizeOptionalText(customer.notes, 500),
      },
      items: lineItems,
      shops,
      primaryShop: shops[0] || "main",

      fulfillmentStatus: initialState.fulfillmentStatus,
      supplierPushStatus: initialState.supplierPushStatus,
      adminReviewed: initialState.adminReviewed,
      adminApproved: initialState.adminApproved,
      approvedBy: "",
      approvedAt: null,
      rejectedBy: "",
      rejectedAt: null,
      heldBy: "",
      heldAt: null,
      reviewNotes: "",

      supplierId: firstSupplierMappedItem?.supplierId || "",
      supplierApiType: firstSupplierMappedItem?.supplierApiType || "",
      supplierOrderId: "",
      supplierStatus: "",
      syncAttempts: 0,
      lastSyncError: "",
      supplierTrackingNumber: "",
      supplierTrackingUrl: "",
      supplierPushKey: "",
      supplierPushResponseSummary: null,

      reviewFlags,
      stockCheckSummary,

      createdAt: now,
      updatedAt: now,
    });

    const reference = `BM_${orderRef.id}`;

    const initRes = await safeFetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountPesewas,
          currency: "GHS",
          reference,
          callback_url: `${BACKEND_URL}/api/paystack/checkout/callback`,
          metadata: {
            type: "order",
            orderId: orderRef.id,
            userId,
            fingerprint,
            deliveryMethod: trustedDelivery.method,
            deliveryLabel: trustedDelivery.label,
            deliveryFee,
            deliveryBreakdown: trustedDelivery.breakdown,
            subtotal: safeSubtotal,
            total,
            itemCount: lineItems.reduce((sum, item) => sum + item.qty, 0),
            items: lineItems.map((item) => ({
              id: item.id,
              name: item.name,
              qty: item.qty,
              price: item.price,
              basePrice: item.basePrice,
              optionPriceTotal: item.optionPriceTotal,
              selectedOptions: item.selectedOptions || {},
              selectedOptionsLabel: item.selectedOptionsLabel || "",
              selectedOptionDetails: item.selectedOptionDetails || [],
              supplierId: item.supplierId || "",
              supplierProductId: item.supplierProductId || "",
              supplierSku: item.supplierSku || "",
              supplierVariantId: item.supplierVariantId || "",
              supplierApiType: item.supplierApiType || "",
            })),
          },
        }),
      }
    );

    const initData = await initRes.json().catch(() => ({}));

    if (!initRes.ok || !initData?.status || !initData?.data?.authorization_url) {
      await orderRef.update({
        status: "paystack_init_failed",
        paymentStatus: "failed",
        fulfillmentStatus: "failed",
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        paystack: { initError: initData },
      });

      return res.status(400).json({
        error: initData?.message || "Paystack init failed",
      });
    }

    await orderRef.update({
      reference,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      paystack: {
        reference,
        access_code: initData?.data?.access_code || null,
        initialized: true,
      },
    });

    return res.json({
      authorization_url: initData.data.authorization_url,
      reference,
      orderId: orderRef.id,
    });
  } catch (err) {
    console.error("Paystack init error:", err);
    return res
      .status(err?.statusCode || 500)
      .json({ error: err?.message || "Server error" });
  }
});

router.post("/shop-owner/init", async (_req, res) => {
  if (!SHOP_OWNER_FLOW_ENABLED) {
    return res.status(403).json({
      error: "Shop owner applications are temporarily disabled.",
    });
  }

  return res.status(403).json({
    error: "Shop owner applications are temporarily disabled.",
  });
});

async function verifyOrderAndUpdate(reference) {
  const orderDoc = await findOrderByReference(reference);
  if (!orderDoc) return { status: "not_found", orderId: null, userId: null };

  const orderRef = orderDoc.ref;
  const existing = orderDoc.data() || {};

  if (existing?.paid === true && existing?.paymentStatus === "paid") {
    return {
      status: "success",
      orderId: orderDoc.id,
      userId: existing?.userId || null,
    };
  }

  if (existing?.verifyLock === true) {
    return {
      status: existing?.paid
        ? "success"
        : safeTrim(existing?.paymentStatus || "pending"),
      orderId: orderDoc.id,
      userId: existing?.userId || null,
    };
  }

  await orderRef.update({
    verifyLock: true,
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    const data = await verifyPaystackReference(reference);

    const status = safeTrim(data?.status).toLowerCase();
    const amountPesewas = Number(data?.amount || 0);
    const paidAt = data?.paid_at || null;
    const metadata = data?.metadata || {};

    const expectedTotal = Math.round(toNumber(existing?.pricing?.total, 0) * 100);
    if (expectedTotal <= 0) {
      throw new Error("Stored order total is invalid.");
    }

    if (metadata?.userId && metadata.userId !== existing?.userId) {
      await finalizeFailedOrder(orderRef, existing, "user_mismatch", {
        metadataUserId: metadata.userId,
        orderUserId: existing?.userId || null,
      });

      return {
        status: "user_mismatch",
        orderId: orderDoc.id,
        userId: existing?.userId || null,
      };
    }

    if (amountPesewas !== expectedTotal) {
      await finalizeFailedOrder(orderRef, existing, "amount_mismatch", {
        amountPesewas,
        expectedAmountPesewas: expectedTotal,
      });

      return {
        status: "amount_mismatch",
        orderId: orderDoc.id,
        userId: existing?.userId || null,
      };
    }

    if (metadata?.type && metadata.type !== "order") {
      await finalizeFailedOrder(orderRef, existing, "invalid_metadata_type", {
        amountPesewas,
        expectedAmountPesewas: expectedTotal,
      });

      return {
        status: "invalid_metadata_type",
        orderId: orderDoc.id,
        userId: existing?.userId || null,
      };
    }

    if (status === "success") {
      const paidState = createInitialPaidState();

      await orderRef.update({
        paid: true,
        paymentStatus: "paid",
        status: "paid",
        fulfillmentStatus: paidState.fulfillmentStatus,
        supplierPushStatus: paidState.supplierPushStatus,
        adminReviewed: paidState.adminReviewed,
        adminApproved: paidState.adminApproved,
        verifyLock: false,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        paystack: {
          ...(existing?.paystack || {}),
          verified: true,
          status,
          amountPesewas,
          paidAt,
        },
      });

      const refreshed = (await orderRef.get()).data() || existing;

      if (!refreshed?.emailSent) {
        try {
          await sendOrderPaidEmails({
            orderId: orderDoc.id,
            reference,
            customer: refreshed?.customer,
            amounts: refreshed?.pricing || refreshed?.amounts,
          });

          await orderRef.update({
            emailSent: true,
            updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (e) {
          await orderRef.update({
            emailSent: false,
            emailError: String(e?.message || e),
            updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      return {
        status: "success",
        orderId: orderDoc.id,
        userId: refreshed?.userId || existing?.userId || null,
      };
    }

    await finalizeFailedOrder(orderRef, existing, status || "failed", {
      amountPesewas,
      paidAt,
    });

    return {
      status: status || "failed",
      orderId: orderDoc.id,
      userId: existing?.userId || null,
    };
  } catch (error) {
    await orderRef.update({
      verifyLock: false,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      paystack: {
        ...(existing?.paystack || {}),
        verifyError: String(error?.message || error),
      },
    });

    throw error;
  }
}

router.get("/checkout/callback", async (req, res) => {
  const reference = safeTrim(req.query?.reference || req.query?.trxref);

  if (!reference) {
    return res.redirect(`${FRONTEND_URL}/order-success?status=missing_reference`);
  }

  try {
    const out = await verifyOrderAndUpdate(reference);

    if (out?.status === "success") {
      return res.redirect(
        `${FRONTEND_URL}/order-success?reference=${encodeURIComponent(
          reference
        )}&status=success`
      );
    }

    return res.redirect(
      `${FRONTEND_URL}/order-success?reference=${encodeURIComponent(
        reference
      )}&status=${encodeURIComponent(out?.status || "failed")}`
    );
  } catch (err) {
    console.error("Paystack callback verify error:", err);
    return res.redirect(
      `${FRONTEND_URL}/order-success?reference=${encodeURIComponent(
        reference
      )}&status=verify_error`
    );
  }
});

router.get("/checkout/verify", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);
    const reference = safeTrim(req.query?.reference);

    if (!reference) {
      return res.status(400).json({ error: "Missing reference" });
    }

    const out = await verifyOrderAndUpdate(reference);

    if (!out?.orderId) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (out?.userId && out.userId !== authUser.uid) {
      return res.status(403).json({
        error: "You are not allowed to verify this order.",
      });
    }

    return res.json({
      ok: true,
      status: out.status,
      reference,
      orderId: out.orderId,
    });
  } catch (err) {
    console.error("Paystack verify error:", err);
    return res
      .status(err?.statusCode || 500)
      .json({ error: err?.message || "Server error" });
  }
});

router.get("/shop-owner/callback", async (_req, res) => {
  return res.redirect(`${FRONTEND_URL}/shop-payment-status?status=disabled`);
});

router.get("/shop-owner/verify", async (_req, res) => {
  return res.status(403).json({
    error: "Shop owner applications are temporarily disabled.",
  });
});

export default router;
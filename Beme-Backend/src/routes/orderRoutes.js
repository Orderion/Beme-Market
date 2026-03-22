import express from "express";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";
import { createInitialCodState } from "../modules/dropship/orderStates.js";
import {
  buildReviewPricing,
  summarizeReviewFlags,
  summarizeStockState,
} from "../modules/dropship/orderCalculations.js";

const router = express.Router();

const ALLOWED_PAYMENT_METHODS = new Set(["cod"]);
const ALLOWED_CREATE_STATUS = new Set(["pending"]);
const ALLOWED_PAYMENT_STATUS = new Set(["pending"]);
const MAX_CART_ITEMS = 100;
const MAX_ITEM_QTY = 20;

/* Secure backend delivery config */
const DELIVERY_METHODS = {
  MALL_PICKUP: "mall_pickup",
  HOME_DELIVERY: "home_delivery",
};

const OUTSIDE_ACCRA_DELIVERY_FEE = 50;
const HOME_DELIVERY_FLAT_FEE = 150;

const ACCRA_MALL_PICKUP_OPTIONS = {
  "accra-mall": {
    id: "accra-mall",
    label: "Accra Mall Pickup",
    area: "Tetteh Quarshie / Spintex",
    fee: 0,
  },
  "achimota-mall": {
    id: "achimota-mall",
    label: "Achimota Mall Pickup",
    area: "Achimota",
    fee: 5,
  },
  "marina-mall": {
    id: "marina-mall",
    label: "Marina Mall Pickup",
    area: "Airport",
    fee: 10,
  },
  "west-hills-mall": {
    id: "west-hills-mall",
    label: "West Hills Mall Pickup",
    area: "Weija",
    fee: 15,
  },
};

function safeTrim(value) {
  return String(value ?? "").trim();
}

function sanitizeText(value, max = 200) {
  return safeTrim(value).slice(0, max);
}

function sanitizeOptionalText(value, max = 200) {
  return sanitizeText(value, max);
}

function normalizeEmail(value) {
  return sanitizeText(value, 160).toLowerCase();
}

function normalizePhone(value) {
  return safeTrim(value).replace(/[^\d+]/g, "").slice(0, 30);
}

function normalizeShopKey(value) {
  return (
    String(value || "main")
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "main"
  );
}

function normalizeSupplierType(value) {
  return sanitizeText(value, 80).toLowerCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function getSortableTime(value) {
  if (!value) return 0;

  try {
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?._seconds === "number") return value._seconds * 1000;
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    return new Date(value).getTime() || 0;
  } catch {
    return 0;
  }
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

function sanitizeSelectedOptions(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }

  const out = {};

  Object.entries(source).forEach(([rawKey, rawValue]) => {
    const key = sanitizeText(rawKey, 60);
    if (!key) return;

    if (Array.isArray(rawValue)) {
      const cleanArray = rawValue
        .map((item) => sanitizeText(item, 80))
        .filter(Boolean)
        .slice(0, 20);

      if (cleanArray.length) out[key] = cleanArray;
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

    const cleanValue = sanitizeText(rawValue, 80);
    if (cleanValue) out[key] = cleanValue;
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
      const priceBump = Math.max(0, toNumber(entry?.priceBump, 0));

      if (!groupName && !label) return null;

      return {
        groupName,
        label,
        priceBump,
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

function sanitizeCustomer(customer = {}) {
  const email = normalizeEmail(customer.email);
  const firstName = sanitizeText(customer.firstName, 80);
  const lastName = sanitizeText(customer.lastName, 80);
  const phone = normalizePhone(customer.phone);
  const address = sanitizeText(customer.address, 300);
  const region = sanitizeText(customer.region, 80);
  const city = sanitizeText(customer.city, 80);
  const area = sanitizeOptionalText(customer.area, 120);
  const notes = sanitizeOptionalText(customer.notes, 500);
  const country = sanitizeText(customer.country || "Ghana", 80) || "Ghana";
  const network = sanitizeOptionalText(customer.network, 40);

  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required.");
  }
  if (!firstName) {
    throw new Error("First name is required.");
  }
  if (!lastName) {
    throw new Error("Last name is required.");
  }
  if (!phone || phone.length < 7) {
    throw new Error("A valid phone number is required.");
  }
  if (!address) {
    throw new Error("Delivery address is required.");
  }
  if (!region) {
    throw new Error("Region is required.");
  }
  if (!city) {
    throw new Error("City is required.");
  }

  return {
    email,
    firstName,
    lastName,
    phone,
    address,
    region,
    city,
    area,
    notes,
    country,
    network,
  };
}

function sanitizeDelivery(delivery = {}, customer = {}, abroadDeliveryFeeTotal = 0) {
  const method = sanitizeText(delivery?.method, 40).toLowerCase();
  const customerRegion = sanitizeText(customer?.region, 80);
  const isGreaterAccra = customerRegion === "Greater Accra";

  let regionalBaseFee = isGreaterAccra ? 0 : OUTSIDE_ACCRA_DELIVERY_FEE;
  let methodFee = 0;
  let label = "";

  let mallPickup = null;
  let homeDelivery = null;

  if (!method) {
    throw new Error("Delivery method is required.");
  }

  if (method === DELIVERY_METHODS.HOME_DELIVERY) {
    methodFee = HOME_DELIVERY_FLAT_FEE;
    label = "Home Delivery";
    homeDelivery = {
      label: "Home Delivery",
      fee: HOME_DELIVERY_FLAT_FEE,
    };
  } else if (method === DELIVERY_METHODS.MALL_PICKUP) {
    if (!isGreaterAccra) {
      throw new Error("Mall pickup is only available in Greater Accra.");
    }

    const mallId = sanitizeText(delivery?.mallPickup?.id || delivery?.mallId, 80);
    const safeMall = ACCRA_MALL_PICKUP_OPTIONS[mallId];

    if (!safeMall) {
      throw new Error("Invalid mall pickup option selected.");
    }

    methodFee = safeMall.fee;
    label = safeMall.label;
    mallPickup = {
      id: safeMall.id,
      label: safeMall.label,
      area: safeMall.area,
      fee: safeMall.fee,
    };
  } else {
    throw new Error("Invalid delivery method.");
  }

  const abroadFee = Math.max(0, toNumber(abroadDeliveryFeeTotal, 0));
  const totalFee = regionalBaseFee + methodFee + abroadFee;

  return {
    method,
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

function normalizeIncomingItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const id = sanitizeText(item?.id || item?.productId, 120);
      const qty = Math.max(1, Math.min(MAX_ITEM_QTY, toNumber(item?.qty, 1)));
      const price = Math.max(0, toNumber(item?.price, 0));
      const basePrice = Math.max(0, toNumber(item?.basePrice, price));
      const optionPriceTotal = Math.max(0, toNumber(item?.optionPriceTotal, 0));
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
        selectedOptions: sanitizeSelectedOptions(item?.selectedOptions),
        selectedOptionsLabel: sanitizeOptionalText(
          item?.selectedOptionsLabel,
          240
        ),
        selectedOptionDetails: sanitizeSelectedOptionDetails(
          item?.selectedOptionDetails
        ),
        customizations: sanitizeCustomizations(item?.customizations),
        shipsFromAbroad: item?.shipsFromAbroad === true,
        abroadDeliveryFee: Math.max(0, toNumber(item?.abroadDeliveryFee, 0)),

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

async function buildValidatedOrderItems(items) {
  const normalizedItems = normalizeIncomingItems(items);

  if (!normalizedItems.length) {
    throw new Error("Cart is empty.");
  }

  const ids = normalizedItems.map((item) => item.id);
  const productMap = new Map();

  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);

    const snap = await adminDb
      .collection("Products")
      .where(firebaseAdmin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    snap.forEach((docSnap) => {
      productMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
    });
  }

  const lineItems = [];
  let subtotal = 0;
  let abroadDeliveryFeeTotal = 0;

  for (const item of normalizedItems) {
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

    const finalUnitPrice = Math.max(0, toNumber(item.price, 0));
    const baseUnitPrice = Math.max(
      0,
      toNumber(item.basePrice, product?.price ?? 0)
    );
    const optionPriceTotal =
      item.optionPriceTotal > 0
        ? item.optionPriceTotal
        : Math.max(0, finalUnitPrice - baseUnitPrice);

    const shop = normalizeShopKey(item.shop || product.shop || "main");
    const name = sanitizeText(item.name || product.name || "", 160);
    const image = sanitizeOptionalText(item.image || product.image || "", 500);
    const abroadDeliveryFee = Math.max(0, toNumber(item.abroadDeliveryFee, 0));

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
        productSupplierMapping?.supplierShippingEstimate ?? abroadDeliveryFee
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
    abroadDeliveryFeeTotal += abroadDeliveryFee * item.qty;

    lineItems.push({
      id: item.id,
      productId: item.id,
      name,
      image,
      qty: item.qty,
      price: finalUnitPrice,
      basePrice: baseUnitPrice,
      optionPriceTotal,
      stock: productStock,
      inStock: product.inStock !== false,
      shop,
      selectedOptions: item.selectedOptions || {},
      selectedOptionsLabel: item.selectedOptionsLabel || "",
      selectedOptionDetails: Array.isArray(item.selectedOptionDetails)
        ? item.selectedOptionDetails
        : [],
      customizations: Array.isArray(item.customizations)
        ? item.customizations
        : [],
      shipsFromAbroad: item.shipsFromAbroad === true,
      abroadDeliveryFee,

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

  return {
    lineItems,
    subtotal,
    abroadDeliveryFeeTotal,
  };
}

function sanitizePricing(pricing = {}, computedSubtotal = 0, computedDelivery = 0) {
  const subtotal = computedSubtotal;
  const deliveryFee = computedDelivery;
  const total = subtotal + deliveryFee;

  return {
    currency: sanitizeText(pricing.currency || "GHS", 10) || "GHS",
    subtotal,
    deliveryFee,
    total,
  };
}

function sanitizeOrderForResponse(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    userId: data.userId || "",
    status: data.status || "pending",
    paymentMethod: data.paymentMethod || "",
    paymentStatus: data.paymentStatus || "",
    paid: data.paid === true,
    emailSent: data.emailSent === true,
    reference: data.reference || "",
    source: data.source || "web",
    shops: Array.isArray(data.shops) ? data.shops : [],
    primaryShop: data.primaryShop || "main",
    pricing: data.pricing || null,
    customer: data.customer || null,
    delivery: data.delivery || null,
    items: Array.isArray(data.items) ? data.items : [],
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    fulfillmentStatus: data.fulfillmentStatus || "",
    supplierPushStatus: data.supplierPushStatus || "",
    adminReviewed: data.adminReviewed === true,
    adminApproved: data.adminApproved === true,
    approvedBy: data.approvedBy || "",
    approvedAt: data.approvedAt || null,
    rejectedBy: data.rejectedBy || "",
    rejectedAt: data.rejectedAt || null,
    heldBy: data.heldBy || "",
    heldAt: data.heldAt || null,
    reviewNotes: data.reviewNotes || "",
    supplierOrderId: data.supplierOrderId || "",
    supplierStatus: data.supplierStatus || "",
    syncAttempts: Number(data.syncAttempts || 0) || 0,
    lastSyncError: data.lastSyncError || "",
    supplierTrackingNumber: data.supplierTrackingNumber || "",
    supplierTrackingUrl: data.supplierTrackingUrl || "",
    reviewFlags: Array.isArray(data.reviewFlags) ? data.reviewFlags : [],
    stockCheckSummary: data.stockCheckSummary || null,
  };
}

router.get("/", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);

    const snap = await adminDb
      .collection("orders")
      .where("userId", "==", authUser.uid)
      .get();

    const orders = snap.docs
      .map(sanitizeOrderForResponse)
      .sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Orders GET error:", error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || "Failed to load orders.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);

    const paymentMethod = sanitizeText(req.body?.paymentMethod, 30).toLowerCase();
    const paymentStatus = sanitizeText(
      req.body?.paymentStatus,
      30
    ).toLowerCase();
    const status = sanitizeText(req.body?.status, 40).toLowerCase();
    const source = sanitizeText(req.body?.source || "web", 40) || "web";

    if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: "Only COD orders can be created from this route.",
      });
    }

    if (!ALLOWED_PAYMENT_STATUS.has(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment status.",
      });
    }

    if (!ALLOWED_CREATE_STATUS.has(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order status.",
      });
    }

    const customer = sanitizeCustomer(req.body?.customer || {});

    if (authUser.email && normalizeEmail(authUser.email) !== customer.email) {
      return res.status(403).json({
        success: false,
        error: "Authenticated email does not match order email.",
      });
    }

    const { lineItems, subtotal, abroadDeliveryFeeTotal } =
      await buildValidatedOrderItems(req.body?.items || []);

    const delivery = sanitizeDelivery(
      req.body?.delivery || {},
      customer,
      abroadDeliveryFeeTotal
    );

    const rawPricing = sanitizePricing(
      req.body?.pricing || {},
      subtotal,
      delivery.fee
    );

    const pricing = buildReviewPricing(rawPricing, lineItems);
    const shops = Array.from(
      new Set(lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean))
    );

    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    const initialState = createInitialCodState();
    const reviewFlags = summarizeReviewFlags({
      items: lineItems,
      pricing,
      customer,
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

    const payload = {
      userId: authUser.uid,
      customer,
      delivery,
      items: lineItems,
      shops,
      primaryShop: shops[0] || "main",
      pricing,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "pending",
      paid: false,
      emailSent: false,
      reference: "",
      source,

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
    };

    const orderRef = await adminDb.collection("orders").add(payload);
    const created = await orderRef.get();

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      order: sanitizeOrderForResponse(created),
    });
  } catch (error) {
    console.error("Orders POST error:", error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || "Failed to create order.",
    });
  }
});

export default router;
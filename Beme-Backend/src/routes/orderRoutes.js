import express from "express";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";

const router = express.Router();

const ALLOWED_PAYMENT_METHODS = new Set(["cod"]);
const ALLOWED_CREATE_STATUS = new Set(["pending"]);
const ALLOWED_PAYMENT_STATUS = new Set(["pending"]);
const ALLOWED_ORDER_UPDATE_STATUSES = new Set([
  "pending",
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "payment_failed",
]);

const MAX_CART_ITEMS = 100;
const MAX_ITEM_QTY = 20;

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

async function getUserProfile(uid) {
  const safeUid = sanitizeText(uid, 128);
  if (!safeUid) return null;

  const snap = await adminDb.collection("users").doc(safeUid).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  const role = sanitizeText(data.role, 40).toLowerCase();
  const shop = normalizeShopKey(data.shop || "main");

  return {
    id: snap.id,
    ...data,
    role,
    shop,
  };
}

function isSuperAdminRole(role) {
  return role === "super_admin" || role === "admin";
}

function isShopAdminRole(role) {
  return role === "shop_admin";
}

function orderMatchesShop(order, shopKey) {
  const normalizedShop = normalizeShopKey(shopKey);
  if (!normalizedShop) return false;

  const shops = Array.isArray(order?.shops)
    ? order.shops.map((shop) => normalizeShopKey(shop))
    : [];

  if (shops.includes(normalizedShop)) return true;

  const primaryShop = normalizeShopKey(order?.primaryShop || "main");
  if (primaryShop === normalizedShop) return true;

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((item) => normalizeShopKey(item?.shop) === normalizedShop);
}

async function requireAdminOrderAccess(authUser, orderData) {
  const profile = await getUserProfile(authUser?.uid);

  if (!profile) {
    const error = new Error("Admin profile not found.");
    error.statusCode = 403;
    throw error;
  }

  if (isSuperAdminRole(profile.role)) {
    return { profile, scope: "all" };
  }

  if (isShopAdminRole(profile.role)) {
    const adminShop = normalizeShopKey(profile.shop);
    if (!adminShop) {
      const error = new Error("Shop admin account has no assigned shop.");
      error.statusCode = 403;
      throw error;
    }

    if (!orderMatchesShop(orderData, adminShop)) {
      const error = new Error("You are not allowed to manage this order.");
      error.statusCode = 403;
      throw error;
    }

    return { profile, scope: adminShop };
  }

  const error = new Error("Admin access required.");
  error.statusCode = 403;
  throw error;
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
    });
  }

  return {
    lineItems,
    subtotal,
    abroadDeliveryFeeTotal,
  };
}

function sanitizePricing(
  pricing = {},
  computedSubtotal = 0,
  computedDelivery = 0
) {
  const requestedSubtotal = Math.max(
    0,
    toNumber(pricing.subtotal, computedSubtotal)
  );
  const requestedDeliveryFee = Math.max(
    0,
    toNumber(pricing.deliveryFee, computedDelivery)
  );

  const subtotal =
    Math.abs(requestedSubtotal - computedSubtotal) < 0.01
      ? requestedSubtotal
      : computedSubtotal;

  const deliveryFee =
    Math.abs(requestedDeliveryFee - computedDelivery) < 0.01
      ? requestedDeliveryFee
      : computedDelivery;

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
    items: Array.isArray(data.items) ? data.items : [],
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

router.get("/", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);

    const snap = await adminDb
      .collection("orders")
      .where("userId", "==", authUser.uid)
      .orderBy("createdAt", "desc")
      .get();

    const orders = snap.docs.map(sanitizeOrderForResponse);

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

    const paymentMethod = sanitizeText(
      req.body?.paymentMethod,
      30
    ).toLowerCase();
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

    const requestedDeliveryFee = Math.max(
      0,
      toNumber(req.body?.pricing?.deliveryFee, abroadDeliveryFeeTotal)
    );

    const pricing = sanitizePricing(
      req.body?.pricing || {},
      subtotal,
      requestedDeliveryFee
    );

    const shops = Array.from(
      new Set(lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean))
    );

    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    const payload = {
      userId: authUser.uid,
      customer,
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

router.patch("/:orderId/status", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);
    const orderId = sanitizeText(req.params?.orderId, 128);
    const nextStatus = sanitizeText(req.body?.status, 40).toLowerCase();

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Missing order ID.",
      });
    }

    if (!ALLOWED_ORDER_UPDATE_STATUSES.has(nextStatus)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order status.",
      });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({
        success: false,
        error: "Order not found.",
      });
    }

    const orderData = orderSnap.data() || {};
    await requireAdminOrderAccess(authUser, orderData);

    const updatePayload = {
      status: nextStatus,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    };

    if (nextStatus === "paid") {
      updatePayload.paymentStatus = "paid";
      updatePayload.paid = true;
    }

    if (nextStatus === "payment_failed") {
      updatePayload.paymentStatus = "failed";
      updatePayload.paid = false;
    }

    if (nextStatus === "cancelled") {
      if (String(orderData?.paymentMethod || "").toLowerCase() === "cod") {
        updatePayload.paid = false;
      }
    }

    await orderRef.update(updatePayload);

    const updatedSnap = await orderRef.get();

    return res.json({
      success: true,
      message: "Order status updated successfully.",
      order: sanitizeOrderForResponse(updatedSnap),
    });
  } catch (error) {
    console.error("Orders PATCH status error:", error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || "Failed to update order status.",
    });
  }
});

export default router;
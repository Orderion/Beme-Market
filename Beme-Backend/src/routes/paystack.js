import express from "express";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";
import { sendOrderPaidEmails } from "../services/email.js";

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL;

if (!PAYSTACK_SECRET_KEY) throw new Error("Missing PAYSTACK_SECRET_KEY in backend env");
if (!FRONTEND_URL) throw new Error("Missing FRONTEND_URL in backend env");
if (!BACKEND_URL) throw new Error("Missing BACKEND_URL in backend env");

const ALLOWED_SHOPS = new Set(["fashion", "main", "kente", "perfume", "tech"]);
const SPECIAL_REGIONS = new Set(["Ashanti", "Greater Accra", "Eastern", "Western"]);
const SHOP_OWNER_FEE_GHS = 1300;
const SHOP_OWNER_FEE_USD = 120;

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

function normalizeShopKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function isAllowedShop(value) {
  return ALLOWED_SHOPS.has(normalizeShopKey(value));
}

function computeDeliveryFee(region) {
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

function normalizeIncomingItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const id = safeTrim(item?.id || item?.productId);
      const qty = Math.max(1, toNumber(item?.qty, 1));
      const price = toNumber(item?.price, 0);
      const basePrice = toNumber(item?.basePrice, 0);
      const optionPriceTotal = toNumber(item?.optionPriceTotal, 0);
      const stock = getNumericStock(item);

      return {
        id,
        productId: id,
        name: safeTrim(item?.name),
        image: safeTrim(item?.image),
        qty,
        price,
        basePrice,
        optionPriceTotal,
        stock,
        inStock: item?.inStock !== false,
        shop: normalizeShopKey(item?.shop || "main"),
        homeSlot: safeTrim(item?.homeSlot),
        selectedOptions:
          item?.selectedOptions && typeof item.selectedOptions === "object"
            ? item.selectedOptions
            : {},
        selectedOptionsLabel: safeTrim(item?.selectedOptionsLabel),
        selectedOptionDetails: Array.isArray(item?.selectedOptionDetails)
          ? item.selectedOptionDetails.map((opt) => ({
              groupName: safeTrim(opt?.groupName),
              label: safeTrim(opt?.label),
              priceBump: toNumber(opt?.priceBump, 0),
            }))
          : [],
        customizations: Array.isArray(item?.customizations) ? item.customizations : [],
        shippingSource: safeTrim(item?.shippingSource),
        shipsFromAbroad: item?.shipsFromAbroad === true,
        abroadDeliveryFee: toNumber(item?.abroadDeliveryFee, 0),
        oldPrice:
          item?.oldPrice !== undefined && item?.oldPrice !== null && item?.oldPrice !== ""
            ? toNumber(item?.oldPrice, 0)
            : null,
      };
    })
    .filter((item) => item.id);
}

async function buildCheckoutFromItems(items) {
  const clean = normalizeIncomingItems(items);
  if (!clean.length) return { subtotal: 0, lineItems: [] };

  const ids = clean.map((x) => x.id).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

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
      throw new Error(`${product?.name || item?.name || "A product"} is out of stock.`);
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

    const baseUnitPrice =
      Number.isFinite(toNumber(item.basePrice, NaN)) && toNumber(item.basePrice, NaN) >= 0
        ? toNumber(item.basePrice, 0)
        : toNumber(product.price, 0);

    const optionPriceTotal =
      item.optionPriceTotal > 0
        ? item.optionPriceTotal
        : Math.max(0, finalUnitPrice - baseUnitPrice);

    const shop = normalizeShopKey(item.shop || product.shop || "main");
    const image = safeTrim(item.image || product.image || "");
    const name = safeTrim(item.name || product.name || "");

    subtotal += finalUnitPrice * item.qty;

    lineItems.push({
      id: item.id,
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
      customizations: Array.isArray(item.customizations) ? item.customizations : [],
      shippingSource: item.shippingSource || "",
      shipsFromAbroad: item.shipsFromAbroad === true,
      abroadDeliveryFee: toNumber(item.abroadDeliveryFee, 0),
      stock: productStock,
      inStock: product.inStock !== false,
    });
  }

  return { subtotal, lineItems };
}

router.post("/checkout/init", async (req, res) => {
  try {
    const email = safeTrim(req.body?.email);
    const items = req.body?.items || [];
    const customer = req.body?.customer || {};
    const pricing = req.body?.pricing || {};

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const region = safeTrim(customer.region);
    const fallbackDeliveryFee = computeDeliveryFee(region);
    const requestedDeliveryFee = toNumber(pricing?.deliveryFee, fallbackDeliveryFee);
    const deliveryFee = requestedDeliveryFee >= 0 ? requestedDeliveryFee : fallbackDeliveryFee;

    const { subtotal, lineItems } = await buildCheckoutFromItems(items);
    if (!lineItems.length) {
      return res.status(400).json({ error: "Cart items invalid" });
    }

    const requestedSubtotal = toNumber(pricing?.subtotal, subtotal);
    const safeSubtotal = Math.abs(requestedSubtotal - subtotal) < 0.01 ? requestedSubtotal : subtotal;

    const total = safeSubtotal + deliveryFee;
    const amountPesewas = Math.round(total * 100);

    const orderRef = adminDb.collection("orders").doc();
    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    const shops = Array.from(
      new Set(lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean))
    );

    await orderRef.set({
      status: "pending_payment",
      paymentMethod: "paystack",
      paymentStatus: "pending",
      paid: false,
      emailSent: false,
      reference: "",
      source: "web",
      userId: safeTrim(customer.userId),

      pricing: {
        currency: safeTrim(pricing?.currency) || "GHS",
        subtotal: safeSubtotal,
        deliveryFee,
        total,
      },

      customer: {
        email,
        firstName: safeTrim(customer.firstName),
        lastName: safeTrim(customer.lastName),
        phone: safeTrim(customer.phone),
        network: safeTrim(customer.network),
        country: "Ghana",
        address: safeTrim(customer.address),
        region,
        city: safeTrim(customer.city),
        area: safeTrim(customer.area),
        notes: safeTrim(customer.notes),
      },

      items: lineItems,
      shops,
      primaryShop: shops[0] || "main",
      createdAt: now,
      updatedAt: now,
    });

    const reference = `BM_${orderRef.id}`;

    const initRes = await safeFetch("https://api.paystack.co/transaction/initialize", {
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
          deliveryFee,
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
          })),
        },
      }),
    });

    const initData = await initRes.json();

    if (!initRes.ok || !initData?.status || !initData?.data?.authorization_url) {
      await orderRef.update({
        status: "paystack_init_failed",
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
      },
    });

    return res.json({
      authorization_url: initData.data.authorization_url,
      reference,
      orderId: orderRef.id,
    });
  } catch (err) {
    console.error("Paystack init error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

router.post("/shop-owner/init", async (req, res) => {
  try {
    const body = req.body || {};

    const userId = safeTrim(body.userId);
    const businessName = safeTrim(body.businessName);
    const ownerName = safeTrim(body.ownerName);
    const phone = safeTrim(body.phone);
    const email = safeTrim(body.email).toLowerCase();
    const shopName = safeTrim(body.shopName);
    const rawShop = safeTrim(body.shop);
    const rawRequestedShop = safeTrim(body.requestedShop || rawShop);
    const category = safeTrim(body.category);
    const description = safeTrim(body.description);
    const website = safeTrim(body.website);
    const instagram = safeTrim(body.instagram);

    const shop = normalizeShopKey(rawShop);
    const requestedShop = normalizeShopKey(rawRequestedShop);

    if (!userId) return res.status(400).json({ error: "Missing userId" });
    if (!businessName) return res.status(400).json({ error: "Business name is required" });
    if (!ownerName) return res.status(400).json({ error: "Owner name is required" });
    if (!phone) return res.status(400).json({ error: "Phone is required" });
    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!shopName) return res.status(400).json({ error: "Shop name is required" });
    if (!shop || !isAllowedShop(shop)) {
      return res.status(400).json({ error: "Please choose a valid marketplace shop." });
    }
    if (requestedShop !== shop) {
      return res.status(400).json({ error: "Requested shop must match the selected shop." });
    }
    if (!category) return res.status(400).json({ error: "Category is required" });
    if (!description) return res.status(400).json({ error: "Description is required" });

    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const currentRole = safeTrim(userData.role).toLowerCase();
    const currentShop = normalizeShopKey(userData.shop || "");

    if (currentRole === "shop_admin" || currentRole === "super_admin" || currentRole === "admin") {
      return res.status(400).json({ error: "This account already has admin shop access." });
    }

    if (currentShop) {
      return res.status(400).json({ error: "This account already owns a shop." });
    }

    const existingActiveUserShop = await adminDb
      .collection("users")
      .where("shop", "==", shop)
      .limit(1)
      .get();

    if (!existingActiveUserShop.empty) {
      return res.status(400).json({ error: "That shop is already assigned to another account." });
    }

    const existingUserApplication = await adminDb
      .collection("shopApplications")
      .where("userId", "==", userId)
      .where("paymentStatus", "in", ["pending_payment", "pending", "paid"])
      .limit(1)
      .get()
      .catch(() => null);

    if (existingUserApplication && !existingUserApplication.empty) {
      return res.status(400).json({
        error: "You already have an active shop application on this account.",
      });
    }

    const existingApplication = await adminDb
      .collection("shopApplications")
      .where("shop", "==", shop)
      .where("paymentStatus", "in", ["pending_payment", "pending", "paid"])
      .limit(1)
      .get()
      .catch(() => null);

    if (existingApplication && !existingApplication.empty) {
      const docData = existingApplication.docs[0]?.data?.() || {};
      const sameApplicant = safeTrim(docData.userId) === userId;

      if (!sameApplicant) {
        return res.status(400).json({
          error: "That shop is already being used in another application.",
        });
      }
    }

    const applicationRef = adminDb.collection("shopApplications").doc();
    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    await applicationRef.set({
      userId,
      businessName,
      ownerName,
      phone,
      email,
      shopName,
      shop,
      requestedShop,
      category,
      description,
      website,
      instagram,
      yearlyFee: {
        usd: SHOP_OWNER_FEE_USD,
        ghs: SHOP_OWNER_FEE_GHS,
      },
      roleToGrant: "shop_admin",
      paymentMethod: "paystack",
      paymentStatus: "pending_payment",
      approvalStatus: "pending",
      capabilities: [
        "manage_products",
        "view_orders",
        "view_analytics",
        "request_payout",
      ],
      activated: false,
      reference: "",
      createdAt: now,
      updatedAt: now,
    });

    const reference = `BMSHOP_${applicationRef.id}`;
    const amountPesewas = Math.round(SHOP_OWNER_FEE_GHS * 100);

    const initRes = await safeFetch("https://api.paystack.co/transaction/initialize", {
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
        callback_url: `${BACKEND_URL}/api/paystack/shop-owner/callback`,
        metadata: {
          type: "shop_owner_application",
          applicationId: applicationRef.id,
          shop,
          userId,
        },
      }),
    });

    const initData = await initRes.json();

    if (!initRes.ok || !initData?.status || !initData?.data?.authorization_url) {
      await applicationRef.update({
        paymentStatus: "init_failed",
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        paystack: { initError: initData },
      });

      return res.status(400).json({
        error: initData?.message || "Paystack init failed",
      });
    }

    await applicationRef.update({
      reference,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      paystack: {
        reference,
        access_code: initData?.data?.access_code || null,
      },
    });

    return res.json({
      authorization_url: initData.data.authorization_url,
      reference,
      applicationId: applicationRef.id,
    });
  } catch (err) {
    console.error("Shop owner Paystack init error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

async function verifyOrderAndUpdate(reference) {
  const vr = await safeFetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    }
  );

  const data = await vr.json();
  if (!vr.ok || !data?.status) throw new Error(data?.message || "Verify failed");

  const status = data?.data?.status;
  const amountPesewas = Number(data?.data?.amount || 0);
  const paidAt = data?.data?.paid_at || null;

  const q = await adminDb.collection("orders").where("reference", "==", reference).limit(1).get();
  if (q.empty) return { status, orderId: null };

  const orderDoc = q.docs[0];
  const orderRef = orderDoc.ref;
  const existing = orderDoc.data();

  if (status === "success") {
    if (!existing?.paid) {
      await orderRef.update({
        paid: true,
        paymentStatus: "paid",
        status: "paid",
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        paystack: {
          ...(existing?.paystack || {}),
          verified: true,
          status,
          amountPesewas,
          paidAt,
        },
      });
    }

    if (!existing?.emailSent) {
      try {
        await sendOrderPaidEmails({
          orderId: orderDoc.id,
          reference,
          customer: existing?.customer,
          amounts: existing?.pricing || existing?.amounts,
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

    return { status, orderId: orderDoc.id };
  }

  await orderRef.update({
    paid: false,
    paymentStatus: "failed",
    status: "payment_failed",
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    paystack: {
      ...(existing?.paystack || {}),
      verified: true,
      status: status || "failed",
    },
  });

  return { status: status || "failed", orderId: orderDoc.id };
}

async function verifyShopOwnerAndActivate(reference) {
  const vr = await safeFetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    }
  );

  const data = await vr.json();
  if (!vr.ok || !data?.status) throw new Error(data?.message || "Verify failed");

  const status = data?.data?.status;
  const amountPesewas = Number(data?.data?.amount || 0);
  const paidAt = data?.data?.paid_at || null;

  const q = await adminDb
    .collection("shopApplications")
    .where("reference", "==", reference)
    .limit(1)
    .get();

  if (q.empty) {
    return { status, applicationId: null, userId: null, shop: null };
  }

  const applicationDoc = q.docs[0];
  const applicationRef = applicationDoc.ref;
  const existing = applicationDoc.data() || {};

  if (status !== "success") {
    await applicationRef.update({
      paymentStatus: "failed",
      approvalStatus: "rejected",
      activated: false,
      updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      paystack: {
        ...(existing?.paystack || {}),
        verified: true,
        status: status || "failed",
      },
    });

    return {
      status: status || "failed",
      applicationId: applicationDoc.id,
      userId: safeTrim(existing.userId),
      shop: normalizeShopKey(existing.shop),
    };
  }

  const userId = safeTrim(existing.userId);
  const shop = normalizeShopKey(existing.shop);
  const capabilities = Array.isArray(existing.capabilities)
    ? existing.capabilities
    : ["manage_products", "view_orders", "view_analytics", "request_payout"];

  if (!userId) throw new Error("Application has no userId");
  if (!shop || !isAllowedShop(shop)) throw new Error("Application has no valid shop key");

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() || {} : {};
  const currentRole = safeTrim(userData.role).toLowerCase();
  const currentShop = normalizeShopKey(userData.shop || "");

  if (
    currentRole === "super_admin" ||
    currentRole === "admin" ||
    (currentRole === "shop_admin" && currentShop && currentShop !== shop)
  ) {
    throw new Error("This account already has another shop assignment.");
  }

  if (currentShop && currentShop !== shop) {
    throw new Error("This account already owns another shop.");
  }

  const existingShopOwner = await adminDb
    .collection("users")
    .where("shop", "==", shop)
    .limit(1)
    .get();

  if (!existingShopOwner.empty) {
    const foundDoc = existingShopOwner.docs[0];
    if (foundDoc.id !== userId) {
      throw new Error("This shop is already assigned to another account.");
    }
  }

  const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

  await userRef.set(
    {
      role: "shop_admin",
      shop,
      capabilities,
      updatedAt: now,
    },
    { merge: true }
  );

  await applicationRef.update({
    paymentStatus: "paid",
    approvalStatus: "approved",
    activated: true,
    activatedAt: now,
    updatedAt: now,
    paystack: {
      ...(existing?.paystack || {}),
      verified: true,
      status,
      amountPesewas,
      paidAt,
    },
  });

  return {
    status: "success",
    applicationId: applicationDoc.id,
    userId,
    shop,
  };
}

router.get("/checkout/callback", async (req, res) => {
  const reference = safeTrim(req.query?.reference);

  if (!reference) {
    return res.redirect(`${FRONTEND_URL}/order-success?status=missing_reference`);
  }

  try {
    const out = await verifyOrderAndUpdate(reference);

    if (out?.status === "success") {
      return res.redirect(`${FRONTEND_URL}/order-success?reference=${reference}&status=success`);
    }

    return res.redirect(
      `${FRONTEND_URL}/order-success?reference=${reference}&status=${encodeURIComponent(
        out?.status || "failed"
      )}`
    );
  } catch (err) {
    console.error("Paystack callback verify error:", err);
    return res.redirect(`${FRONTEND_URL}/order-success?reference=${reference}&status=verify_error`);
  }
});

router.get("/checkout/verify", async (req, res) => {
  try {
    const reference = safeTrim(req.query?.reference);
    if (!reference) return res.status(400).json({ error: "Missing reference" });

    const out = await verifyOrderAndUpdate(reference);

    return res.json({
      ok: true,
      status: out.status,
      reference,
      orderId: out.orderId,
    });
  } catch (err) {
    console.error("Paystack verify error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

router.get("/shop-owner/callback", async (req, res) => {
  const reference = safeTrim(req.query?.reference);

  if (!reference) {
    return res.redirect(`${FRONTEND_URL}/shop-payment-status?status=missing_reference`);
  }

  try {
    const out = await verifyShopOwnerAndActivate(reference);

    if (out?.status === "success") {
      return res.redirect(
        `${FRONTEND_URL}/shop-payment-status?reference=${reference}&status=success&activated=1`
      );
    }

    return res.redirect(
      `${FRONTEND_URL}/shop-payment-status?reference=${reference}&status=${encodeURIComponent(
        out?.status || "failed"
      )}`
    );
  } catch (err) {
    console.error("Shop owner callback verify error:", err);
    return res.redirect(
      `${FRONTEND_URL}/shop-payment-status?reference=${reference}&status=verify_error`
    );
  }
});

router.get("/shop-owner/verify", async (req, res) => {
  try {
    const reference = safeTrim(req.query?.reference);
    if (!reference) return res.status(400).json({ error: "Missing reference" });

    const out = await verifyShopOwnerAndActivate(reference);

    return res.json({
      ok: true,
      status: out.status,
      reference,
      applicationId: out.applicationId,
      userId: out.userId,
      shop: out.shop,
      activated: out.status === "success",
    });
  } catch (err) {
    console.error("Shop owner verify error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

export default router;
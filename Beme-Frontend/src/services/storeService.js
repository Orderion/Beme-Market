import {
  doc, collection, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { uploadImageToCloudinary } from "../lib/cloudinary";

// ─── PLAN LIMITS ─────────────────────────────────────────────
// Updated prices: Basic GHS 0 / Starter GHS 59 / Growth GHS 129 / Pro GHS 399
// Beme Delivery Support: Growth and Pro only
const PLAN_LIMITS = {
  basic:    { maxProducts: 5,   hasChat: false, hasSocialLinks: false, hasBemeDelivery: false, hasCustomDomain: false, hasBranding: false },
  free:     { maxProducts: 5,   hasChat: false, hasSocialLinks: false, hasBemeDelivery: false, hasCustomDomain: false, hasBranding: false },
  starter:  { maxProducts: 10,  hasChat: true,  hasSocialLinks: true,  hasBemeDelivery: false, hasCustomDomain: false, hasBranding: false },
  growth:   { maxProducts: 25,  hasChat: true,  hasSocialLinks: true,  hasBemeDelivery: true,  hasCustomDomain: false, hasBranding: false },
  standard: { maxProducts: 25,  hasChat: true,  hasSocialLinks: true,  hasBemeDelivery: true,  hasCustomDomain: false, hasBranding: false },
  pro:      { maxProducts: 500, hasChat: true,  hasSocialLinks: true,  hasBemeDelivery: true,  hasCustomDomain: true,  hasBranding: true  },
};

export const PLAN_PRICES_GHS = {
  basic:   0,
  starter: 59,
  growth:  129,
  pro:     399,
};

export function getPlanLimits(planId) {
  return PLAN_LIMITS[String(planId || "").toLowerCase()] || PLAN_LIMITS.basic;
}

// ─── SHOP ────────────────────────────────────────────────────
export async function getShop(shopId) {
  if (!shopId) return null;
  const snap = await getDoc(doc(db, "shops", shopId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateShop(shopId, updates) {
  await updateDoc(doc(db, "shops", shopId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ─── PRODUCTS ────────────────────────────────────────────────
export async function getSellerProducts(uid, shopId) {
  try {
    // Preferred: with orderBy (requires composite index in Firestore console)
    const snap = await getDocs(
      query(
        collection(db, "Products"),
        where("sellerId", "==", uid),
        orderBy("createdAt", "desc")
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    // Fallback: no orderBy (works without a composite index)
    // Sorts client-side instead — safe for up to ~500 products
    const snap = await getDocs(
      query(collection(db, "Products"), where("sellerId", "==", uid))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }
}

export async function getProductById(productId) {
  const snap = await getDoc(doc(db, "Products", productId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addSellerProduct(uid, shopId, shopName, planId, data) {
  const existing = await getDocs(
    query(collection(db, "Products"), where("sellerId", "==", uid))
  );
  const limits = getPlanLimits(planId);
  if (existing.size >= limits.maxProducts) {
    throw new Error(
      `Your ${planId} plan allows a maximum of ${limits.maxProducts} products. Please upgrade to add more.`
    );
  }

  // Ensure imageUrl is set from images array for backward compatibility
  const images = Array.isArray(data.images) ? data.images : (data.imageUrl ? [data.imageUrl] : []);
  const imageUrl = images[0] || data.imageUrl || "";

  return await addDoc(collection(db, "Products"), {
    ...data,
    images,
    imageUrl,
    sellerId:   uid,
    shopId,
    shopName,
    sellerPlan: planId,
    ownerType:  "seller",
    source:     "seller",
    status:     data.status || "active",
    inStock:    data.inStock !== false,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
}

export async function updateSellerProduct(productId, uid, updates) {
  const snap = await getDoc(doc(db, "Products", productId));
  if (!snap.exists() || snap.data().sellerId !== uid) {
    throw new Error("You do not have permission to edit this product.");
  }

  // Keep imageUrl in sync with images array
  const images = Array.isArray(updates.images) ? updates.images : undefined;
  const imageUrl = images ? (images[0] || "") : updates.imageUrl;

  await updateDoc(doc(db, "Products", productId), {
    ...updates,
    ...(images !== undefined && { images }),
    ...(imageUrl !== undefined && { imageUrl }),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSellerProduct(productId, uid) {
  const snap = await getDoc(doc(db, "Products", productId));
  if (!snap.exists() || snap.data().sellerId !== uid) {
    throw new Error("You do not have permission to delete this product.");
  }
  await deleteDoc(doc(db, "Products", productId));
}

// ─── CLOUDINARY IMAGE UPLOADS ────────────────────────────────
// All media now goes through Cloudinary — no Firebase Storage.

/** Upload a single product image. Returns the Cloudinary URL string. */
export async function uploadProductImage(uid, file) {
  const result = await uploadImageToCloudinary(file);
  return result.url;
}

/** Upload a single store image (logo / banner). Returns the URL string. */
export async function uploadStoreImage(uid, file, type = "logo") {
  const result = await uploadImageToCloudinary(file);
  return result.url;
}

// ─── ORDERS (seller view) ────────────────────────────────────
export async function getSellerOrders(shopId, limitCount = 100) {
  if (!shopId) return [];
  const results = new Map();

  try {
    // Query by shopOwnerId — seller's Firebase auth uid stored on order at creation
    const snap = await getDocs(
      query(collection(db, "orders"), where("shopOwnerId", "==", shopId), limit(limitCount))
    );
    snap.docs.forEach((d) => results.set(d.id, { id: d.id, ...d.data() }));
    console.log("[getSellerOrders] shopOwnerId ==:", snap.size, "results");
  } catch (e) {
    console.warn("[getSellerOrders] query failed:", e?.code, e?.message);
  }

  return Array.from(results.values()).sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return tb - ta;
  }).slice(0, limitCount);
}

// ─── STORE APPLICATION ───────────────────────────────────────
export async function saveApplicationStep(uid, step, data) {
  const ref = doc(db, "storeApplications", uid);
  await updateDoc(ref, {
    [`step${step}`]: data,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    const { setDoc } = await import("firebase/firestore");
    await setDoc(ref, {
      [`step${step}`]: data,
      status: "draft",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function getApplicationDraft(uid) {
  const snap = await getDoc(doc(db, "storeApplications", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
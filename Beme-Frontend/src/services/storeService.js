import {
  doc, collection, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { auth } from "../firebase";

// ─── PLAN LIMITS (server-side mirror — Cloud Function enforces these) ─────────
const PLAN_LIMITS = {
  basic:    { maxProducts: 25,   hasChat: false, hasCustomDomain: false, hasBranding: false },
  standard: { maxProducts: 500,  hasChat: true,  hasCustomDomain: false, hasBranding: false },
  pro:      { maxProducts: 99999, hasChat: true,  hasCustomDomain: true,  hasBranding: true  },
};

export function getPlanLimits(planId) {
  return PLAN_LIMITS[planId] || PLAN_LIMITS.basic;
}

// ─── SHOP ────────────────────────────────────────────────────────────────────

export async function getShop(shopId) {
  const snap = await getDoc(doc(db, "shops", shopId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateShop(shopId, updates) {
  await updateDoc(doc(db, "shops", shopId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export async function getSellerProducts(uid, shopId) {
  const snap = await getDocs(
    query(
      collection(db, "Products"),
      where("sellerId", "==", uid),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addSellerProduct(uid, shopId, shopName, planId, data) {
  // Client-side plan limit check (enforced by Cloud Function too)
  const existing = await getDocs(
    query(collection(db, "Products"), where("sellerId", "==", uid))
  );
  const limits = getPlanLimits(planId);
  if (existing.size >= limits.maxProducts) {
    throw new Error(`Your ${planId} plan allows a maximum of ${limits.maxProducts} products. Please upgrade to add more.`);
  }

  return await addDoc(collection(db, "Products"), {
    ...data,
    sellerId:  uid,
    shopId,
    shopName,
    sellerPlan: planId,
    source:    "seller",
    status:    "active",
    inStock:   data.inStock !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSellerProduct(productId, uid, updates) {
  const snap = await getDoc(doc(db, "Products", productId));
  if (!snap.exists() || snap.data().sellerId !== uid) {
    throw new Error("You do not have permission to edit this product.");
  }
  await updateDoc(doc(db, "Products", productId), {
    ...updates,
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

// ─── UPLOAD MEDIA ────────────────────────────────────────────────────────────

export async function uploadStoreImage(uid, file, type = "logo") {
  const ext  = file.name.split(".").pop();
  const path = `stores/${uid}/${type}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function uploadProductImage(uid, file) {
  const ext  = file.name.split(".").pop();
  const path = `products/${uid}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ─── ORDERS (seller view) ───────────────────────────────────────────────────

export async function getSellerOrders(shopId, limitCount = 100) {
  try {
    const snap = await getDocs(
      query(
        collection(db, "orders"),
        where("shops", "array-contains", shopId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    // Fallback without orderBy if index not built
    const snap = await getDocs(
      query(collection(db, "orders"), where("shops", "array-contains", shopId), limit(limitCount))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

// ─── STORE APPLICATION ──────────────────────────────────────────────────────

export async function saveApplicationStep(uid, step, data) {
  const ref = doc(db, "storeApplications", uid);
  await updateDoc(ref, {
    [`step${step}`]: data,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    // Document may not exist yet — create it
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


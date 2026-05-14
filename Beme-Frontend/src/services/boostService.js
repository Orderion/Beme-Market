// src/services/boostService.js
import {
  collection, addDoc, getDocs, query, where, orderBy,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export const BOOST_TYPES = {
  homepage:  { label: "Homepage Feature",  description: "Your store featured on the homepage", price: 50,  duration: 7  },
  featured:  { label: "Featured Product",  description: "Product pinned to top of category",   price: 30,  duration: 7  },
  trending:  { label: "Trending Boost",    description: "Listed in trending section",          price: 40,  duration: 3  },
};

/**
 * createBoost — creates a boost request. Payment handled separately.
 */
export async function createBoost({ shopId, sellerId, type, productId = null, paystackReference }) {
  const boostInfo = BOOST_TYPES[type];
  if (!boostInfo) throw new Error(`Unknown boost type: ${type}`);

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + boostInfo.duration);

  return await addDoc(collection(db, "boosts"), {
    shopId, sellerId, type, productId,
    amount:    boostInfo.price,
    duration:  boostInfo.duration,
    status:    "active",
    startDate: Timestamp.fromDate(now),
    endDate:   Timestamp.fromDate(end),
    paystackReference: paystackReference || null,
    createdAt: serverTimestamp(),
  });
}

/**
 * getSellerBoosts — gets all boosts for a seller's shop.
 */
export async function getSellerBoosts(shopId) {
  const snap = await getDocs(
    query(
      collection(db, "boosts"),
      where("shopId", "==", shopId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * getActiveBoosts — gets currently active boosts (for homepage rendering).
 */
export async function getActiveBoosts(type) {
  const now  = Timestamp.now();
  const snap = await getDocs(
    query(
      collection(db, "boosts"),
      where("status", "==", "active"),
      where("type", "==", type)
    )
  );
  // Filter client-side for endDate > now
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => b.endDate?.toMillis() > now.toMillis());
}


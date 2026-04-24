// ─────────────────────────────────────────────────────────────
//  useHomepageConfig  ·  Realtime Firestore listener
//  Document: /homepage/config
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export const DEFAULT_SECTIONS = [
  { id: "carousel",          label: "Shop Carousel",      active: true, order: 0 },
  { id: "categories",        label: "Categories",         active: true, order: 1 },
  { id: "flashDeals",        label: "Flash Deals Banner", active: true, order: 2 },
  { id: "trending",          label: "Trending Now",       active: true, order: 3 },
  { id: "continueShopping",  label: "Continue Shopping",  active: true, order: 4 },
];

export const DEFAULT_CONFIG = {
  sections:       DEFAULT_SECTIONS,
  storeCards:     [],   // empty = Home.jsx uses hardcoded fallback
  categories:     [],   // empty = Home.jsx uses hardcoded fallback
  trendingText:   { heading: "Trending now",       seeAllText: "See featured" },
  continueText:   { heading: "Continue shopping",  seeAllText: "See all"      },
};

/**
 * Subscribe to /homepage/config in realtime.
 * Returns { config, loading }.
 * Falls back to DEFAULT_CONFIG if the document does not exist yet.
 */
export default function useHomepageConfig() {
  const [config,  setConfig]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, "homepage", "config");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            // Ensure sections array always exists and has all 5 entries
            sections: (data.sections?.length ? data.sections : DEFAULT_SECTIONS),
          });
        } else {
          setConfig(DEFAULT_CONFIG);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useHomepageConfig]", err);
        setConfig(DEFAULT_CONFIG);
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  return { config, loading };
}
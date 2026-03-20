import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "./ProductCard";
import "./ProductGrid.css";

const COLLECTION_NAME = "Products";
const PAGE_SIZE = 24;
const MAX_PAGES = 8;
const SKELETON_COUNT = 8;

const SEARCH_SYNONYMS = {
  phone: ["phone", "phones", "iphone", "android", "mobile", "smartphone", "samsung", "tecno", "infinix", "itel", "pixel", "ipad", "tablet"],
  phones: ["phone", "phones", "iphone", "android", "mobile", "smartphone", "samsung", "tecno", "infinix", "itel", "pixel", "ipad", "tablet"],
  laptop: ["laptop", "laptops", "macbook", "notebook", "computer", "pc", "dell", "hp", "lenovo", "acer", "asus"],
  laptops: ["laptop", "laptops", "macbook", "notebook", "computer", "pc", "dell", "hp", "lenovo", "acer", "asus"],
  shoes: ["shoe", "shoes", "sneaker", "sneakers", "slides", "sandals", "heels", "boots", "slippers", "loafer"],
  shoe: ["shoe", "shoes", "sneaker", "sneakers", "slides", "sandals", "heels", "boots", "slippers", "loafer"],
  clothing: ["clothing", "clothes", "fashion", "shirt", "shirts", "dress", "dresses", "hoodie", "hoodies", "jeans", "trousers", "top", "tops"],
  clothes: ["clothing", "clothes", "fashion", "shirt", "shirts", "dress", "dresses", "hoodie", "hoodies", "jeans", "trousers", "top", "tops"],
  kids: ["kids", "kid", "children", "child", "baby", "babies", "toddler", "infant"],
  kid: ["kids", "kid", "children", "child", "baby", "babies", "toddler", "infant"],
  accessories: ["accessories", "accessory", "watch", "bag", "bags", "speaker", "power bank", "powerbank", "perfume", "cosmetics", "others"],
  accessory: ["accessories", "accessory", "watch", "bag", "bags", "speaker", "power bank", "powerbank", "perfume", "cosmetics", "others"],
  others: ["others", "other", "accessories", "accessory", "general", "misc"],
};

function parseBooleanish(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;

  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;

  if (
    [
      "true",
      "yes",
      "1",
      "in stock",
      "instock",
      "available",
      "active",
      "featured",
      "abroad",
      "imported",
      "international",
      "overseas",
    ].includes(raw)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "0",
      "out of stock",
      "outofstock",
      "unavailable",
      "inactive",
      "local",
    ].includes(raw)
  ) {
    return false;
  }

  return fallback;
}

function getNumericStock(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFilter(filter) {
  if (!filter) {
    return {
      dept: null,
      kind: null,
      shop: null,
      slot: null,
      q: "",
      priceMin: null,
      priceMax: null,
      inStockOnly: false,
      featuredOnly: false,
      sort: "new",
    };
  }

  if (typeof filter === "string") {
    return {
      dept: filter.toLowerCase(),
      kind: null,
      shop: null,
      slot: null,
      q: "",
      priceMin: null,
      priceMax: null,
      inStockOnly: false,
      featuredOnly: false,
      sort: "new",
    };
  }

  return {
    dept: filter.dept ? String(filter.dept).toLowerCase().trim() : null,
    kind: filter.kind ? String(filter.kind).toLowerCase().trim() : null,
    shop: filter.shop ? String(filter.shop).toLowerCase().trim() : null,
    slot: filter.slot ? String(filter.slot).toLowerCase().trim() : null,
    q: filter.q ? String(filter.q).toLowerCase().trim() : "",
    priceMin:
      filter.priceMin != null && !Number.isNaN(Number(filter.priceMin))
        ? Number(filter.priceMin)
        : null,
    priceMax:
      filter.priceMax != null && !Number.isNaN(Number(filter.priceMax))
        ? Number(filter.priceMax)
        : null,
    inStockOnly: !!filter.inStockOnly,
    featuredOnly: !!filter.featuredOnly,
    sort: (filter.sort || "new").toLowerCase(),
  };
}

function normalizeImages(data) {
  const list = Array.isArray(data?.images)
    ? data.images.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (list.length) return list;

  const single = String(data?.image || "").trim();
  return single ? [single] : [];
}

function normalizeShippingSource(data) {
  const candidates = [
    data?.shippingSource,
    data?.shippingType,
    data?.shipFrom,
    data?.ship_from,
    data?.fulfillmentType,
    data?.originType,
    data?.shipping_origin,
    data?.shipping_origin_type,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim().toLowerCase();
    if (!value) continue;

    if (
      [
        "abroad",
        "ship from abroad",
        "ships from abroad",
        "international",
        "imported",
        "overseas",
      ].includes(value)
    ) {
      return "abroad";
    }

    if (["uni", "unisex", "universal"].includes(value)) {
      return "uni";
    }

    if (["local", "ghana", "domestic"].includes(value)) {
      return "local";
    }
  }

  if (
    parseBooleanish(data?.shipFromAbroad, false) ||
    parseBooleanish(data?.shipsFromAbroad, false)
  ) {
    return "abroad";
  }

  return "";
}

function normalizeDoc(docSnap) {
  const d = docSnap.data() || {};

  const price = Number(d.price ?? d.Price ?? 0) || 0;
  const rawOldPrice = d.oldPrice ?? d.oldprice ?? null;

  const dept = d.dept ?? d.Dept ?? null;
  const kind = d.kind ?? d.Kind ?? null;
  const shop = d.shop ?? d.Shop ?? "main";
  const homeSlot =
    d.homeSlot ??
    d.home_filter ??
    d.homeFilter ??
    d.slot ??
    d.discoveryCategory ??
    "others";

  const stock = getNumericStock(d.stock ?? d.Stock ?? d.quantity ?? d.qty);
  const inStock = parseBooleanish(d.inStock ?? d.in_stock, true);
  const featured = parseBooleanish(d.featured ?? d.Featured, false);

  const images = normalizeImages(d);
  const shippingSource = normalizeShippingSource(d);
  const shipsFromAbroad =
    shippingSource === "abroad" ||
    parseBooleanish(d.shipFromAbroad, false) ||
    parseBooleanish(d.shipsFromAbroad, false);

  return {
    id: docSnap.id,
    ...d,
    name: String(d.name || "").trim(),
    brand: String(d.brand || "").trim(),
    description: String(d.description || "").trim(),
    shortDescription: String(
      d.shortDescription ?? d.short_description ?? ""
    ).trim(),
    price,
    oldPrice:
      rawOldPrice !== null && rawOldPrice !== undefined && rawOldPrice !== ""
        ? Number(rawOldPrice) || rawOldPrice
        : null,
    dept: typeof dept === "string" ? dept.toLowerCase().trim() : dept,
    kind: typeof kind === "string" ? kind.toLowerCase().trim() : kind,
    shop: typeof shop === "string" ? shop.toLowerCase().trim() : shop,
    homeSlot:
      typeof homeSlot === "string" ? homeSlot.toLowerCase().trim() : "others",
    stock,
    inStock,
    featured,
    image: images[0] || "",
    images,
    shippingSource,
    shipsFromAbroad,
    createdAt: d.createdAt ?? null,
  };
}

function getCreatedAtMillis(item) {
  if (typeof item?.createdAt?.toMillis === "function") {
    return item.createdAt.toMillis();
  }
  if (typeof item?.createdAt?.seconds === "number") {
    return item.createdAt.seconds * 1000;
  }
  return 0;
}

function clientSort(list, sortKey) {
  const arr = [...list];

  if (sortKey === "price-asc") {
    return arr.sort((a, b) => (a.price || 0) - (b.price || 0));
  }

  if (sortKey === "price-desc") {
    return arr.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  return arr.sort((a, b) => getCreatedAtMillis(b) - getCreatedAtMillis(a));
}

function buildOrder(sortKey) {
  if (sortKey === "price-asc") return orderBy("price", "asc");
  if (sortKey === "price-desc") return orderBy("price", "desc");
  return orderBy("createdAt", "desc");
}

function makeSkeleton(n = SKELETON_COUNT) {
  return Array.from({ length: n }).map((_, i) => ({ id: `sk_${i}` }));
}

function tokenizeSearch(term) {
  return String(term || "")
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function expandTokens(tokens) {
  const expanded = new Set();

  for (const token of tokens) {
    expanded.add(token);

    const synonyms = SEARCH_SYNONYMS[token];
    if (Array.isArray(synonyms)) {
      for (const word of synonyms) expanded.add(word);
    }
  }

  return [...expanded];
}

function buildSearchText(product) {
  return [
    product.name,
    product.brand,
    product.description,
    product.shortDescription,
    product.dept,
    product.kind,
    product.shop,
    product.homeSlot,
    product.shipsFromAbroad
      ? "ships from abroad imported international"
      : "local",
    product.inStock ? "in stock" : "out of stock",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesSearch(product, term) {
  if (!term) return true;

  const tokens = tokenizeSearch(term);
  if (!tokens.length) return true;

  const haystack = buildSearchText(product);
  const expandedTokens = expandTokens(tokens);

  return tokens.every((token) => {
    if (haystack.includes(token)) return true;

    const related = expandedTokens.filter(
      (item) => item === token || SEARCH_SYNONYMS[token]?.includes(item)
    );

    return related.some((word) => haystack.includes(word));
  });
}

function seededHash(input) {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shouldRandomize(sortKey) {
  return sortKey === "new" || sortKey === "";
}

function randomizedStableOrder(list, seedBase) {
  return [...list].sort((a, b) => {
    const aSeed = seededHash(`${seedBase}:${a.id}`);
    const bSeed = seededHash(`${seedBase}:${b.id}`);

    if (aSeed !== bSeed) return aSeed - bSeed;
    return getCreatedAtMillis(b) - getCreatedAtMillis(a);
  });
}

export default function ProductGrid({
  filter = null,
  sortBy = "new",
  withCount = false,
  infinite = true,
}) {
  const [products, setProducts] = useState([]);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);
  const [err, setErr] = useState("");
  const [serverCount, setServerCount] = useState(null);

  const sentinelRef = useRef(null);

  const f = useMemo(() => normalizeFilter(filter), [filter]);
  const sortKey = useMemo(
    () => (sortBy || f.sort || "new").toLowerCase(),
    [sortBy, f.sort]
  );

  const signature = useMemo(() => {
    return JSON.stringify({
      dept: f.dept,
      kind: f.kind,
      shop: f.shop,
      slot: f.slot,
      q: f.q,
      inStockOnly: f.inStockOnly,
      sortKey,
      priceMin: f.priceMin,
      priceMax: f.priceMax,
      featuredOnly: f.featuredOnly,
    });
  }, [
    f.dept,
    f.kind,
    f.shop,
    f.slot,
    f.q,
    f.inStockOnly,
    f.priceMin,
    f.priceMax,
    f.featuredOnly,
    sortKey,
  ]);

  const randomSeedBase = useMemo(() => {
    return [
      "beme-market",
      f.dept || "all",
      f.kind || "all",
      f.shop || "all",
      f.slot || "all",
      f.q || "none",
      f.featuredOnly ? "featured" : "not-featured",
      f.inStockOnly ? "in-stock" : "stock-any",
      f.priceMin ?? "min-any",
      f.priceMax ?? "max-any",
    ].join("|");
  }, [
    f.dept,
    f.kind,
    f.shop,
    f.slot,
    f.q,
    f.featuredOnly,
    f.inStockOnly,
    f.priceMin,
    f.priceMax,
  ]);

  const baseQueryParts = useMemo(() => {
    const colRef = collection(db, COLLECTION_NAME);
    const wheres = [];

    if (f.dept) wheres.push(where("dept", "==", f.dept));
    if (f.kind) wheres.push(where("kind", "==", f.kind));
    if (f.shop) wheres.push(where("shop", "==", f.shop));
    if (f.inStockOnly) wheres.push(where("inStock", "==", true));

    const ord = buildOrder(sortKey);
    return { colRef, wheres, ord };
  }, [f.dept, f.kind, f.shop, f.inStockOnly, sortKey]);

  useEffect(() => {
    let alive = true;

    async function runCount() {
      if (!withCount) return;

      try {
        const { colRef, wheres } = baseQueryParts;
        const qCount = query(colRef, ...wheres);
        const snap = await getCountFromServer(qCount);

        if (!alive) return;
        setServerCount(snap.data().count);
      } catch {
        if (!alive) return;
        setServerCount(null);
      }
    }

    runCount();

    return () => {
      alive = false;
    };
  }, [withCount, baseQueryParts, signature]);

  useEffect(() => {
    let alive = true;

    async function fetchFirst() {
      setErr("");
      setLoadingFirst(true);
      setLoadingMore(false);
      setProducts([]);
      setHasMore(true);
      setPagesLoaded(0);
      setLastDoc(null);

      const { colRef, wheres, ord } = baseQueryParts;

      try {
        const qIdeal = query(colRef, ...wheres, ord, limit(PAGE_SIZE));
        const snap = await getDocs(qIdeal);

        if (!alive) return;

        const normalized = snap.docs.map(normalizeDoc);
        setProducts(normalized);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
        setPagesLoaded(1);
        setLoadingFirst(false);
        return;
      } catch {
        try {
          const qFallback = query(colRef, ...wheres, limit(PAGE_SIZE));
          const snap2 = await getDocs(qFallback);

          if (!alive) return;

          const normalized2 = snap2.docs.map(normalizeDoc);
          const sorted = clientSort(normalized2, sortKey);

          setProducts(sorted);
          setLastDoc(snap2.docs[snap2.docs.length - 1] || null);
          setHasMore(snap2.docs.length === PAGE_SIZE);
          setPagesLoaded(1);
          setLoadingFirst(false);
        } catch (e2) {
          if (!alive) return;
          console.error("❌ Failed to fetch products:", e2);
          setErr("Failed to load products.");
          setLoadingFirst(false);
          setHasMore(false);
        }
      }
    }

    fetchFirst();

    return () => {
      alive = false;
    };
  }, [baseQueryParts, sortKey, signature]);

  const loadMore = async () => {
    if (loadingFirst || loadingMore || !hasMore) return;
    if (!lastDoc) return;
    if (pagesLoaded >= MAX_PAGES) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    setErr("");

    const { colRef, wheres, ord } = baseQueryParts;

    try {
      const qMore = query(
        colRef,
        ...wheres,
        ord,
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(qMore);

      const normalized = snap.docs.map(normalizeDoc);

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of normalized) {
          if (!seen.has(p.id)) merged.push(p);
        }
        return merged;
      });

      setLastDoc(snap.docs[snap.docs.length - 1] || lastDoc);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setPagesLoaded((p) => p + 1);
      setLoadingMore(false);
    } catch {
      try {
        const qMore2 = query(
          colRef,
          ...wheres,
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
        const snap2 = await getDocs(qMore2);
        const normalized2 = snap2.docs.map(normalizeDoc);

        setProducts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const p of normalized2) {
            if (!seen.has(p.id)) merged.push(p);
          }
          return clientSort(merged, sortKey);
        });

        setLastDoc(snap2.docs[snap2.docs.length - 1] || lastDoc);
        setHasMore(snap2.docs.length === PAGE_SIZE);
        setPagesLoaded((p) => p + 1);
        setLoadingMore(false);
      } catch (e2) {
        console.error("❌ Failed to load more:", e2);
        setErr("Failed to load more products.");
        setLoadingMore(false);
        setHasMore(false);
      }
    }
  };

  useEffect(() => {
    if (!infinite) return;
    if (!sentinelRef.current) return;

    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "800px 0px", threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    infinite,
    hasMore,
    lastDoc,
    loadingFirst,
    loadingMore,
    pagesLoaded,
    signature,
  ]);

  const finalList = useMemo(() => {
    let list = [...products];

    if (f.slot) {
      list = list.filter(
        (p) => String(p.homeSlot || "others").toLowerCase().trim() === f.slot
      );
    }

    if (f.featuredOnly) {
      list = list.filter((p) => !!p.featured);
    }

    if (f.priceMin != null) {
      list = list.filter((p) => (Number(p.price) || 0) >= f.priceMin);
    }

    if (f.priceMax != null) {
      list = list.filter((p) => (Number(p.price) || 0) <= f.priceMax);
    }

    if (f.q) {
      list = list.filter((p) => matchesSearch(p, f.q));
    }

    if (shouldRandomize(sortKey)) {
      return randomizedStableOrder(list, randomSeedBase);
    }

    return list;
  }, [
    products,
    f.slot,
    f.priceMin,
    f.priceMax,
    f.featuredOnly,
    f.q,
    sortKey,
    randomSeedBase,
  ]);

  if (withCount) {
    if (loadingFirst) return <>…</>;
    if (err) return <>0 items</>;

    const base = serverCount != null ? serverCount : finalList.length;
    const clientFilteredActive =
      !!f.slot ||
      f.priceMin != null ||
      f.priceMax != null ||
      f.featuredOnly ||
      !!f.q;

    if (clientFilteredActive) return <>{finalList.length} items</>;
    return <>{base} items</>;
  }

  if (loadingFirst) {
    return (
      <div className="product-grid product-grid--loading">
        {makeSkeleton().map((x) => (
          <div key={x.id} className="product-skeleton" aria-hidden="true">
            <div className="product-skeleton-media" />
            <div className="product-skeleton-line" />
            <div className="product-skeleton-line short" />
            <div className="product-skeleton-line tiny" />
          </div>
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="product-grid-empty">
        <div className="product-grid-empty-title">Something went wrong</div>
        <div className="product-grid-empty-sub">{err}</div>
        <button
          className="product-grid-empty-btn"
          type="button"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    );
  }

  if (!finalList.length) {
    return (
      <div className="product-grid-empty">
        <div className="product-grid-empty-title">No products found</div>
        <div className="product-grid-empty-sub">
          Try another keyword or adjust your filters.
        </div>
        <button
          className="product-grid-empty-btn"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Back to filters
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="product-grid">
        {finalList.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="product-grid-footer">
        {loadingMore ? (
          <div className="product-grid-footer-muted">Loading more…</div>
        ) : hasMore ? (
          <button
            className="product-grid-loadmore"
            type="button"
            onClick={loadMore}
          >
            Load more
          </button>
        ) : (
          <div className="product-grid-footer-muted">End of results</div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </>
  );
}
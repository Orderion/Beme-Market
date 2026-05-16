import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  doc, getDoc, collection, query, where, getDocs,
  setDoc, deleteDoc, updateDoc, increment, serverTimestamp,
  orderBy, limit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";

/* ─── Helpers ─── */
function fmtMoney(n) {
  return `GHS ${Number(n || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── SVG icons ─── */
function Ico({ d, size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  verified: "M9 12l2 2 4-4|M12 22a10 10 0 100-20 10 10 0 000 20z",
  wp:       "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  ig:       "M17.5 2h-11A5.5 5.5 0 001 7.5v9A5.5 5.5 0 006.5 22h11a5.5 5.5 0 005.5-5.5v-9A5.5 5.5 0 0017.5 2z|M12 8a4 4 0 100 8 4 4 0 000-8z|M17.5 6.5h.01",
  tt:       "M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6|M18 16a3 3 0 100-6 3 3 0 000 6",
  link:     "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71|M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  chat:     "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  back:     "M19 12H5|M12 19l-7-7 7-7",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|M9 7a4 4 0 108 0 4 4 0 00-8 0|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75",
  box:      "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  check:    "M20 6L9 17l-5-5",
  heart:    "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  cart:     "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z|M3 6h18|M16 10a4 4 0 01-8 0",
};

/* ─── Star rating ─── */
function Stars({ rating = 0, size = 11 }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? "#F59E0B" : "none"}
          stroke="#F59E0B" strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}

/* ─── Product card ─── */
function ProductCard({ product }) {
  const navigate = useNavigate();
  const images = Array.isArray(product.images) ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const price = Number(product.price || 0);
  const compare = Number(product.comparePrice || 0);
  const hasDiscount = compare > price;

  return (
    <button type="button" onClick={() => navigate(`/product/${product.id}`)}
      style={{ background: "var(--card,#fff)", border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 14, overflow: "hidden", cursor: "pointer", textAlign: "left",
        transition: "transform 0.15s, box-shadow 0.15s", padding: 0 }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      {/* Image */}
      <div style={{ aspectRatio: "1", background: "var(--bg,#F7F8FA)", position: "relative", overflow: "hidden" }}>
        {images[0]
          ? <img src={images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico d={IC.box} size={32} color="rgba(0,0,0,0.15)" />
            </div>
        }
        {hasDiscount && (
          <div style={{ position: "absolute", top: 8, left: 8, background: "#EF4444", color: "#fff",
            fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 100 }}>
            -{Math.round(((compare - price) / compare) * 100)}%
          </div>
        )}
        {product.inStock === false && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF" }}>Out of Stock</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text,#111)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
          {product.name}
        </div>
        {product.category && (
          <div style={{ fontSize: 10, color: "var(--muted,#9CA3AF)", marginBottom: 6, fontWeight: 500 }}>
            {product.category}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text,#111)", letterSpacing: "-0.02em" }}>
            {fmtMoney(price)}
          </span>
          {hasDiscount && (
            <span style={{ fontSize: 11, color: "var(--muted,#9CA3AF)", textDecoration: "line-through" }}>
              {fmtMoney(compare)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Performance metric ─── */
function PerfRow({ label, value }) {
  const color = value === "Excellent" ? "#22C55E" : value === "Good" ? "#046EF2" : value === "Average" ? "#F59E0B" : "#9CA3AF";
  const dot = value === "Excellent" ? IC.check : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
      borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${color}20`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      </div>
      <span style={{ flex: 1, fontSize: 13, color: "var(--muted,#6B7280)" }}>{label}:</span>
      <strong style={{ fontSize: 13, color: color }}>{value}</strong>
    </div>
  );
}

/* ─── Skeleton ─── */
function Skeleton({ h = 20, w = "100%", r = 8 }) {
  return (
    <div style={{ height: h, width: w, borderRadius: r, background: "rgba(0,0,0,0.07)",
      animation: "sfPulse 1.4s ease infinite" }} />
  );
}

/* ═══ MAIN COMPONENT ═══ */
export default function StoreFront() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();

  const [shop,       setShop]       = useState(null);
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [following,  setFollowing]  = useState(false);
  const [fwLoading,  setFwLoading]  = useState(false);
  const [follCount,  setFollCount]  = useState(0);
  const [tab,        setTab]        = useState("products");
  const [currentUser, setCurrentUser] = useState(null);
  const [prodLoading, setProdLoading] = useState(true);

  /* Auth listener */
  useEffect(() => {
    const auth = getAuth();
    setCurrentUser(auth.currentUser);
    const unsub = auth.onAuthStateChanged(u => setCurrentUser(u));
    return unsub;
  }, []);

  /* Fetch shop by slug or id */
  useEffect(() => {
    if (!storeSlug) return;
    const run = async () => {
      setLoading(true);
      try {
        // Try by slug field first
        let shopData = null;
        const bySlug = await getDocs(query(
          collection(db, "shops"),
          where("slug", "==", storeSlug),
          limit(1),
        ));
        if (!bySlug.empty) {
          shopData = { id: bySlug.docs[0].id, ...bySlug.docs[0].data() };
        } else {
          // Fallback: try by doc ID
          const byId = await getDoc(doc(db, "shops", storeSlug));
          if (byId.exists()) shopData = { id: byId.id, ...byId.data() };
          // Fallback: try by generated slug from shopName
          if (!shopData) {
            const all = await getDocs(query(collection(db, "shops"), limit(200)));
            for (const d of all.docs) {
              const data = d.data();
              const gen = (data.shopName || "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
              if (gen === storeSlug) { shopData = { id: d.id, ...data }; break; }
            }
          }
        }
        if (shopData) {
          setShop(shopData);
          setFollCount(shopData.followersCount || 0);
        }
      } catch (e) { console.error("[StoreFront] shop fetch:", e); }
      finally { setLoading(false); }
    };
    run();
  }, [storeSlug]);

  /* Check follow status */
  useEffect(() => {
    if (!shop?.id || !currentUser) return;
    getDoc(doc(db, "shops", shop.id, "followers", currentUser.uid))
      .then(snap => setFollowing(snap.exists()))
      .catch(() => {});
  }, [shop?.id, currentUser?.uid]);

  /* Fetch products */
  useEffect(() => {
    if (!shop?.id && !shop?.ownerId) return;
    setProdLoading(true);
    const run = async () => {
      try {
        const snap = await getDocs(query(
          collection(db, "Products"),
          where("shopId", "==", shop.id),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(100),
        ));
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        // Fallback: by sellerId
        try {
          const snap2 = await getDocs(query(
            collection(db, "Products"),
            where("sellerId", "==", shop.ownerId),
            where("status", "==", "active"),
            limit(100),
          ));
          setProducts(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error("[StoreFront] products:", e); }
      } finally { setProdLoading(false); }
    };
    run();
  }, [shop?.id, shop?.ownerId]);

  /* Follow / unfollow — optimistic UI + server sync + prevent negative */
  const handleFollow = async () => {
    if (!currentUser) { navigate("/login"); return; }
    if (!shop?.id) return;
    setFwLoading(true);

    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollCount(c => wasFollowing ? Math.max(0, c - 1) : c + 1);

    try {
      const ref = doc(db, "shops", shop.id, "followers", currentUser.uid);
      if (wasFollowing) {
        await deleteDoc(ref);
        await updateDoc(doc(db, "shops", shop.id), { followersCount: increment(-1) });
      } else {
        await setDoc(ref, { uid: currentUser.uid, createdAt: serverTimestamp() });
        await updateDoc(doc(db, "shops", shop.id), { followersCount: increment(1) });
      }
      // Read authoritative count back from Firestore to prevent drift
      const snap = await getDoc(doc(db, "shops", shop.id));
      if (snap.exists()) {
        const real = snap.data().followersCount;
        setFollCount(Math.max(0, typeof real === "number" ? real : 0));
      }
    } catch (e) {
      console.error(e);
      // Revert on error
      setFollowing(wasFollowing);
      setFollCount(c => wasFollowing ? c + 1 : Math.max(0, c - 1));
    } finally {
      setFwLoading(false);
    }
  };

  /* ── Render: loading ── */
  if (loading) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 0 60px", fontFamily: "var(--font-main,'Nunito',sans-serif)" }}>
        <div style={{ height: 220, background: "rgba(0,0,0,0.08)", marginBottom: 0 }} />
        <div style={{ padding: "0 20px" }}>
          <div style={{ marginTop: -40, marginBottom: 20 }}><Skeleton h={80} w={80} r="50%" /></div>
          <Skeleton h={24} w={200} r={6} />
          <div style={{ marginTop: 8 }}><Skeleton h={14} w={140} r={6} /></div>
        </div>
        <style>{`@keyframes sfPulse{0%,100%{opacity:.45}50%{opacity:.85}}`}</style>
      </div>
    );
  }

  /* ── Render: not found ── */
  if (!loading && !shop) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 24, fontFamily: "var(--font-main,'Nunito',sans-serif)" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>
          <Ico d={IC.box} size={48} color="rgba(0,0,0,0.15)" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text,#111)", marginBottom: 8 }}>Store not found</div>
        <div style={{ fontSize: 14, color: "var(--muted,#9CA3AF)", marginBottom: 24 }}>This store may have been removed or the link is incorrect.</div>
        <button onClick={() => navigate("/shop")}
          style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#046EF2",
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
          Browse Products
        </button>
      </div>
    );
  }

  const perf = shop.performance || {};
  const hasPerf = perf.shippingSpeed || perf.qualityScore || perf.customerRating;
  const socialLinks = [
    shop.whatsapp   && { icon: IC.wp,   href: `https://wa.me/${shop.whatsapp.replace(/\D/g,"")}`,  label: "WhatsApp",  color: "#25D366" },
    shop.instagram  && { icon: IC.ig,   href: `https://instagram.com/${shop.instagram.replace("@","")}`, label: "Instagram", color: "#E1306C" },
    shop.tiktok     && { icon: IC.tt,   href: `https://tiktok.com/@${shop.tiktok.replace("@","")}`,       label: "TikTok",    color: "#010101" },
    shop.website    && { icon: IC.link, href: shop.website,                                                label: "Website",   color: "#046EF2" },
  ].filter(Boolean);

  return (
    <div style={{ background: "var(--bg,#F7F8FA)", minHeight: "100vh",
      fontFamily: "var(--font-main,'Nunito',sans-serif)", paddingBottom: 60 }}>

      {/* ── BANNER ── */}
      <div style={{ position: "relative", height: 200, overflow: "hidden",
        background: shop.bannerUrl ? "transparent" : "linear-gradient(135deg,#046EF2 0%,#1e3a8a 100%)" }}>
        {shop.bannerUrl && (
          <img src={shop.bannerUrl} alt="banner"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
        {/* Dark overlay for readability */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,0) 40%,rgba(0,0,0,0.4) 100%)" }} />
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 16px" }}>

        {/* ── STORE IDENTITY ROW ── */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -44, marginBottom: 20, flexWrap: "wrap" }}>
          {/* Logo */}
          <div style={{ width: 80, height: 80, borderRadius: 18, border: "3px solid var(--card,#fff)",
            background: shop.logoUrl ? "transparent" : "#046EF2",
            overflow: "hidden", flexShrink: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            {shop.logoUrl
              ? <img src={shop.logoUrl} alt={shop.shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>
                  {(shop.shopName || "S").charAt(0).toUpperCase()}
                </span>
            }
          </div>

          {/* Name + badges */}
          <div style={{ flex: 1, paddingBottom: 4, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text,#111)",
                letterSpacing: "-0.03em", margin: 0 }}>
                {shop.shopName || "Store"}
              </h1>
              {shop.verified && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px",
                  borderRadius: 100, background: "rgba(4,110,242,0.1)", border: "1px solid rgba(4,110,242,0.2)" }}>
                  <Ico d={IC.verified} size={13} color="#046EF2" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#046EF2" }}>Verified</span>
                </div>
              )}
              {shop.status === "active" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11,
                  fontWeight: 700, color: "#22C55E" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                  Active
                </div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--muted,#6B7280)", fontWeight: 600 }}>
                <strong style={{ color: "var(--text,#111)" }}>{products.length}</strong> products
              </span>
              <span style={{ fontSize: 13, color: "var(--muted,#6B7280)", fontWeight: 600 }}>
                <strong style={{ color: "var(--text,#111)" }}>{follCount.toLocaleString()}</strong> followers
              </span>
              {shop.sellerScore > 0 && (
                <span style={{ fontSize: 13, color: "var(--muted,#6B7280)", fontWeight: 600 }}>
                  <strong style={{ color: "var(--text,#111)" }}>{shop.sellerScore}%</strong> seller score
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, paddingBottom: 4, flexShrink: 0 }}>
            <button type="button" onClick={handleFollow} disabled={fwLoading}
              style={{ padding: "9px 20px", borderRadius: 100,
                border: `1.5px solid ${following ? "#046EF2" : "rgba(0,0,0,0.12)"}`,
                background: following ? "#046EF2" : "var(--card,#fff)",
                color: following ? "#fff" : "var(--text,#111)",
                fontSize: 13, fontWeight: 800, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s" }}>
              {fwLoading ? "…" : following ? "Following ✓" : "Follow"}
            </button>
            {shop.whatsapp && (
              <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g,"")}`}
                target="_blank" rel="noreferrer"
                style={{ padding: "9px 16px", borderRadius: 100, border: "1.5px solid rgba(0,0,0,0.12)",
                  background: "var(--card,#fff)", color: "var(--text,#111)",
                  fontSize: 13, fontWeight: 800, cursor: "pointer", textDecoration: "none",
                  display: "flex", alignItems: "center", gap: 6 }}>
                <Ico d={IC.chat} size={14} />
                Chat
              </a>
            )}
          </div>
        </div>

        {/* ── SOCIAL LINKS ── */}
        {socialLinks.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {socialLinks.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
                  borderRadius: 100, border: "1px solid rgba(0,0,0,0.1)",
                  background: "var(--card,#fff)", color: "var(--text,#333)",
                  fontSize: 12, fontWeight: 700, textDecoration: "none", transition: "border-color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.color = s.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; e.currentTarget.style.color = "var(--text,#333)"; }}>
                <Ico d={s.icon} size={14} color="currentColor" />
                {s.label}
              </a>
            ))}
          </div>
        )}

        {/* ── TAB NAV ── */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(0,0,0,0.08)",
          marginBottom: 20 }}>
          {["products", "about"].map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              style={{ padding: "10px 20px", border: "none", borderRadius: "10px 10px 0 0",
                background: "transparent", cursor: "pointer",
                fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                color: tab === t ? "#046EF2" : "var(--muted,#9CA3AF)",
                borderBottom: `2px solid ${tab === t ? "#046EF2" : "transparent"}`,
                marginBottom: -1, transition: "all 0.15s" }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "products" && !prodLoading && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700,
                  background: "#046EF2", color: "#fff", padding: "2px 7px", borderRadius: 100 }}>
                  {products.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: PRODUCTS ── */}
        {tab === "products" && (
          prodLoading
            ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} style={{ borderRadius: 14, overflow: "hidden", background: "var(--card,#fff)", border: "1px solid rgba(0,0,0,0.07)" }}>
                    <div style={{ aspectRatio: "1", background: "rgba(0,0,0,0.06)", animation: "sfPulse 1.4s ease infinite" }} />
                    <div style={{ padding: "10px 12px" }}>
                      <Skeleton h={12} r={6} /><div style={{ marginTop: 6 }}><Skeleton h={14} w="60%" r={6} /></div>
                    </div>
                  </div>
                ))}
              </div>
            : products.length === 0
              ? <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <Ico d={IC.box} size={48} color="rgba(0,0,0,0.12)" />
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text,#111)", marginTop: 12 }}>No products listed yet</div>
                  <div style={{ fontSize: 14, color: "var(--muted,#9CA3AF)", marginTop: 4 }}>Check back soon!</div>
                </div>
              : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
        )}

        {/* ── TAB: ABOUT ── */}
        {tab === "about" && (
          <div style={{ maxWidth: 680 }}>

            {/* Description */}
            {shop.description && (
              <div style={{ background: "var(--card,#fff)", borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.07)", padding: "20px", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text,#111)", marginBottom: 10 }}>About this store</div>
                <p style={{ fontSize: 14, color: "var(--muted,#6B7280)", lineHeight: 1.7, margin: 0 }}>
                  {shop.description}
                </p>
              </div>
            )}

            {/* Seller info */}
            <div style={{ background: "var(--card,#fff)", borderRadius: 16,
              border: "1px solid rgba(0,0,0,0.07)", padding: "20px", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text,#111)", marginBottom: 14 }}>Seller Information</div>
              {[
                shop.city && shop.region && { label: "Location", value: `${shop.city}, ${shop.region}` },
                shop.successfulSales && { label: "Successful Sales", value: `${Number(shop.successfulSales).toLocaleString()}+` },
              ].filter(Boolean).map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
                  fontSize: 13 }}>
                  <span style={{ color: "var(--muted,#6B7280)", fontWeight: 600 }}>{row.label}</span>
                  <span style={{ color: "var(--text,#111)", fontWeight: 700 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Performance */}
            {hasPerf && (
              <div style={{ background: "var(--card,#fff)", borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.07)", padding: "20px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text,#111)", marginBottom: 4 }}>Seller Performance</div>
                <div style={{ fontSize: 12, color: "var(--muted,#9CA3AF)", marginBottom: 12 }}>Rated by Beme Market based on order history</div>
                {perf.shippingSpeed   && <PerfRow label="Shipping Speed"   value={perf.shippingSpeed}   />}
                {perf.qualityScore    && <PerfRow label="Quality Score"    value={perf.qualityScore}    />}
                {perf.customerRating  && <PerfRow label="Customer Rating"  value={perf.customerRating}  />}
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes sfPulse { 0%,100%{opacity:.45} 50%{opacity:.85} }
        @media(min-width:768px){
          .sf-banner { height: 280px !important; }
        }
      `}</style>
    </div>
  );
}
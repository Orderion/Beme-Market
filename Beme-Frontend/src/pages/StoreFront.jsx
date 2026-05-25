import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, getDoc, collection, query, where, getDocs,
  setDoc, deleteDoc, updateDoc, increment, serverTimestamp, orderBy, limit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import ChatModal from "../components/ChatModal";

/* ─── helpers ─── */
function fmtMoney(n) {
  return `GHS ${Number(n || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── icons ─── */
function Ico({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  verified: "M9 12l2 2 4-4|M12 22a10 10 0 100-20 10 10 0 000 20z",
  chat:     "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  wp:       "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  ig:       "M17.5 2h-11A5.5 5.5 0 001 7.5v9A5.5 5.5 0 006.5 22h11a5.5 5.5 0 005.5-5.5v-9A5.5 5.5 0 0017.5 2z|M12 8a4 4 0 100 8 4 4 0 000-8z|M17.5 6.5h.01",
  tt:       "M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6|M18 16a3 3 0 100-6 3 3 0 000 6",
  link:     "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71|M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  box:      "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  check:    "M20 6L9 17l-5-5",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|M9 7a4 4 0 108 0 4 4 0 00-8 0|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75",
};

/* ─── product card ─── */
function ProductCard({ product }) {
  const navigate = useNavigate();
  const imgs  = Array.isArray(product.images) ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const price = Number(product.price || 0);
  const cmp   = Number(product.comparePrice || 0);
  const disc  = cmp > price;

  return (
    <button type="button" onClick={() => navigate(`/product/${product.id}`)}
      style={{
        background: "#fff", border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 14, overflow: "hidden", cursor: "pointer",
        textAlign: "left", padding: 0, transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ aspectRatio: "1", background: "#f5f5f5", position: "relative", overflow: "hidden" }}>
        {imgs[0]
          ? <img src={imgs[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico d={IC.box} size={28} color="rgba(0,0,0,0.12)" />
            </div>
        }
        {disc && (
          <div style={{ position: "absolute", top: 8, left: 8, background: "#EF4444", color: "#fff",
            fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 100 }}>
            -{Math.round(((cmp - price) / cmp) * 100)}%
          </div>
        )}
        {product.inStock === false && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF" }}>Out of Stock</span>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
          {product.name}
        </div>
        {product.category && (
          <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 5, fontWeight: 500 }}>{product.category}</div>
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#111", letterSpacing: "-0.02em" }}>
            {fmtMoney(price)}
          </span>
          {disc && <span style={{ fontSize: 11, color: "#9CA3AF", textDecoration: "line-through" }}>{fmtMoney(cmp)}</span>}
        </div>
      </div>
    </button>
  );
}

/* ─── skeleton ─── */
function Skeleton({ h = 16, w = "100%", r = 8 }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: "rgba(0,0,0,0.07)", animation: "sf-pulse 1.4s ease infinite" }} />;
}

/* ─── perf row ─── */
function PerfRow({ label, value }) {
  const color = value === "Excellent" ? "#22C55E" : value === "Good" ? "#046EF2" : value === "Average" ? "#F59E0B" : "#9CA3AF";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: "#6B7280" }}>{label}:</span>
      <strong style={{ fontSize: 13, color }}>{value}</strong>
    </div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
export default function StoreFront() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();

  const [shop,        setShop]        = useState(null);
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [prodLoading, setProdLoading] = useState(true);
  const [following,   setFollowing]   = useState(false);
  const [fwLoading,   setFwLoading]   = useState(false);
  const [follCount,   setFollCount]   = useState(0);
  const [tab,         setTab]         = useState("products");
  const [currentUser, setCurrentUser] = useState(null);
  const [showChat,    setShowChat]    = useState(false);

  /* Auth */
  useEffect(() => {
    const auth = getAuth();
    setCurrentUser(auth.currentUser);
    const unsub = auth.onAuthStateChanged(u => setCurrentUser(u));
    return unsub;
  }, []);

  /* Fetch shop */
  useEffect(() => {
    if (!storeSlug) return;
    const run = async () => {
      setLoading(true);
      try {
        let shopData = null;
        const bySlug = await getDocs(query(collection(db, "shops"), where("slug", "==", storeSlug), limit(1)));
        if (!bySlug.empty) {
          shopData = { id: bySlug.docs[0].id, ...bySlug.docs[0].data() };
        } else {
          const byId = await getDoc(doc(db, "shops", storeSlug));
          if (byId.exists()) shopData = { id: byId.id, ...byId.data() };
          if (!shopData) {
            const all = await getDocs(query(collection(db, "shops"), limit(200)));
            for (const d of all.docs) {
              const data = d.data();
              const gen = (data.shopName || "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
              if (gen === storeSlug) { shopData = { id: d.id, ...data }; break; }
            }
          }
        }
        if (shopData) { setShop(shopData); setFollCount(shopData.followersCount || 0); }
      } catch (e) { console.error("[StoreFront]", e); }
      finally { setLoading(false); }
    };
    run();
  }, [storeSlug]);

  /* Follow status */
  useEffect(() => {
    if (!shop?.id || !currentUser) return;
    getDoc(doc(db, "shops", shop.id, "followers", currentUser.uid))
      .then(snap => setFollowing(snap.exists()))
      .catch(() => {});
  }, [shop?.id, currentUser?.uid]);

  /* Products */
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
        try {
          const snap2 = await getDocs(query(
            collection(db, "Products"),
            where("sellerId", "==", shop.ownerId),
            where("status", "==", "active"),
            limit(100),
          ));
          setProducts(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
      } finally { setProdLoading(false); }
    };
    run();
  }, [shop?.id, shop?.ownerId]);

  /* Follow / unfollow */
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
      const snap = await getDoc(doc(db, "shops", shop.id));
      if (snap.exists()) setFollCount(Math.max(0, snap.data().followersCount || 0));
    } catch (e) {
      setFollowing(wasFollowing);
      setFollCount(c => wasFollowing ? c + 1 : Math.max(0, c - 1));
    } finally { setFwLoading(false); }
  };

  /* Chat handler */
  const handleChat = () => {
    const pref = shop?.chatPreference || "beme";
    if (pref === "whatsapp" && shop?.whatsapp) {
      const num  = shop.whatsapp.replace(/\D/g, "");
      window.open(`https://wa.me/${num}`, "_blank");
    } else if (pref === "website" && shop?.website) {
      window.open(shop.website, "_blank");
    } else {
      // Beme Market Chat
      if (!currentUser) { navigate(`/login?redirect=/store/${storeSlug}`); return; }
      setShowChat(true);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 16px 60px",
        fontFamily: "var(--font-main,'Nunito',sans-serif)" }}>
        <div style={{ height: 260, background: "rgba(0,0,0,0.06)", borderRadius: "0 0 20px 20px", marginBottom: 0 }} />
        <div style={{ padding: "0 20px", marginTop: -36 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(0,0,0,0.08)", border: "3px solid #fff", marginBottom: 16 }} />
          <Skeleton h={24} w={180} r={8} />
          <div style={{ marginTop: 8 }}><Skeleton h={14} w={120} r={6} /></div>
        </div>
        <style>{`@keyframes sf-pulse{0%,100%{opacity:.45}50%{opacity:.85}}`}</style>
      </div>
    );
  }

  /* ── Not found ── */
  if (!shop) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 24,
        fontFamily: "var(--font-main,'Nunito',sans-serif)" }}>
        <Ico d={IC.box} size={48} color="rgba(0,0,0,0.12)" />
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: "16px 0 8px" }}>Store not found</div>
        <div style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 24 }}>This store may have been removed.</div>
        <button onClick={() => navigate("/shop")}
          style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#046EF2",
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
          Browse Products
        </button>
      </div>
    );
  }

  const isOwnStore  = !!(currentUser?.uid && shop?.ownerId && currentUser.uid === shop.ownerId);
  const basicPlan   = !shop.planId || shop.planId === "basic";
  const hasChat     = !basicPlan; // Starter+
  const canSocial   = !basicPlan;
  const perf        = shop.performance || {};
  const hasPerf     = perf.shippingSpeed || perf.qualityScore || perf.customerRating;

  const socialLinks = canSocial ? [
    shop.whatsapp  && { icon: IC.wp,   href: `https://wa.me/${shop.whatsapp.replace(/\D/g,"")}`,            label: "WhatsApp",  color: "#25D366" },
    shop.instagram && { icon: IC.ig,   href: `https://instagram.com/${shop.instagram.replace("@","")}`,      label: "Instagram", color: "#E1306C" },
    shop.tiktok    && { icon: IC.tt,   href: `https://tiktok.com/@${shop.tiktok.replace("@","")}`,           label: "TikTok",    color: "#111"    },
    shop.website   && { icon: IC.link, href: shop.website,                                                    label: "Website",   color: "#046EF2" },
  ].filter(Boolean) : [];

  const initials = (shop.shopName || "S").charAt(0).toUpperCase();

  return (
    <div style={{ background: "#F7F8FA", minHeight: "100vh",
      fontFamily: "var(--font-main,'Nunito',sans-serif)", paddingBottom: 60 }}>

      {/* ═══ BANNER ═══ */}
      <div style={{ position: "relative", height: 240,
        background: shop.bannerUrl ? "transparent" : "linear-gradient(135deg,#046EF2 0%,#1e3a8a 100%)" }}>
        {shop.bannerUrl && (
          <img src={shop.bannerUrl} alt="banner"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(0,0,0,0.5) 100%)" }} />
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 16px" }}>

        {/* ═══ PROFILE CARD ═══ */}
        <div style={{
          background:   "#fff",
          borderRadius: "0 0 20px 20px",
          border:       "1px solid rgba(0,0,0,0.07)",
          borderTop:    "none",
          marginBottom: 16,
          padding:      "0 24px 20px",
          position:     "relative",
        }}>
          {/* Circular logo — overlaps banner */}
          <div style={{
            position:   "absolute",
            top:        -44,
            left:       24,
            width:      88, height: 88,
            borderRadius: "50%",
            border:     "4px solid #fff",
            background: shop.logoUrl ? "transparent" : "#046EF2",
            overflow:   "hidden",
            boxShadow:  "0 4px 20px rgba(0,0,0,0.18)",
            display:    "flex", alignItems: "center", justifyContent: "center",
          }}>
            {shop.logoUrl
              ? <img src={shop.logoUrl} alt={shop.shopName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>{initials}</span>
            }
          </div>

          {/* Content row */}
          <div style={{ paddingTop: 56, display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>

            {/* Left — identity */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111",
                  letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>
                  {shop.shopName || "Store"}
                </h1>
                {shop.verified && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px",
                    borderRadius: 100, background: "rgba(4,110,242,0.08)",
                    border: "1px solid rgba(4,110,242,0.2)", flexShrink: 0 }}>
                    <Ico d={IC.verified} size={11} color="#046EF2" />
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#046EF2" }}>Verified</span>
                  </div>
                )}
                {shop.status === "active" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#22C55E" }}>Active</span>
                  </div>
                )}
              </div>

              {shop.description && (
                <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 10px",
                  lineHeight: 1.6, maxWidth: 480 }}>
                  {shop.description}
                </p>
              )}

              {/* Stats */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#111", letterSpacing: "-0.02em" }}>
                    {products.length}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>Products</div>
                </div>
                <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.08)" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#111", letterSpacing: "-0.02em" }}>
                    {follCount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>Followers</div>
                </div>
                {shop.sellerScore > 0 && (
                  <>
                    <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.08)" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#111", letterSpacing: "-0.02em" }}>
                        {shop.sellerScore}%
                      </div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>Score</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right — action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
              {!isOwnStore && (
                <button type="button" onClick={handleFollow} disabled={fwLoading}
                  style={{
                    padding: "9px 22px", borderRadius: 100,
                    border: `1.5px solid ${following ? "#046EF2" : "rgba(0,0,0,0.12)"}`,
                    background: following ? "#046EF2" : "#fff",
                    color: following ? "#fff" : "#111",
                    fontSize: 13, fontWeight: 800, cursor: fwLoading ? "default" : "pointer",
                    fontFamily: "inherit", transition: "all 0.15s", opacity: fwLoading ? 0.7 : 1,
                    boxShadow: following ? "0 4px 14px rgba(4,110,242,0.25)" : "none",
                  }}>
                  {fwLoading ? "…" : following ? "✓ Following" : "Follow"}
                </button>
              )}

              {hasChat && !isOwnStore && (
                <button type="button" onClick={handleChat}
                  style={{
                    padding: "9px 20px", borderRadius: 100,
                    border: "1.5px solid rgba(0,0,0,0.12)", background: "#fff",
                    color: "#111", fontSize: 13, fontWeight: 800, cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="#046EF2"; e.currentTarget.style.color="#046EF2"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(0,0,0,0.12)"; e.currentTarget.style.color="#111"; }}>
                  <Ico d={IC.chat} size={14} />
                  Chat
                </button>
              )}

              {/* Social link pills */}
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
                    borderRadius: 100, border: "1px solid rgba(0,0,0,0.1)",
                    background: "#fff", color: "#333", fontSize: 12, fontWeight: 700,
                    textDecoration: "none", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.color = s.color; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; e.currentTarget.style.color = "#333"; }}>
                  <Ico d={s.icon} size={13} color="currentColor" />
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)",
          marginBottom: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            {["products", "about"].map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{
                  padding: "14px 24px", border: "none", background: "transparent",
                  cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                  color: tab === t ? "#046EF2" : "#9CA3AF",
                  borderBottom: `2px solid ${tab === t ? "#046EF2" : "transparent"}`,
                  marginBottom: -1, transition: "all 0.15s",
                }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "products" && !prodLoading && (
                  <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 700, padding: "2px 8px",
                    borderRadius: 100, background: tab === "products" ? "#046EF2" : "#f0f0f0",
                    color: tab === "products" ? "#fff" : "#9CA3AF" }}>
                    {products.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ padding: 20 }}>
            {/* ── PRODUCTS TAB ── */}
            {tab === "products" && (
              prodLoading
                ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} style={{ borderRadius: 14, overflow: "hidden", background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
                        <div style={{ aspectRatio:"1", background:"rgba(0,0,0,0.06)", animation:"sf-pulse 1.4s ease infinite" }}/>
                        <div style={{ padding:"10px 12px" }}>
                          <Skeleton h={12} r={6}/><div style={{marginTop:6}}><Skeleton h={14} w="60%" r={6}/></div>
                        </div>
                      </div>
                    ))}
                  </div>
                : products.length === 0
                  ? <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <Ico d={IC.box} size={40} color="rgba(0,0,0,0.1)" />
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginTop: 10 }}>No products yet</div>
                      <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>Check back soon!</div>
                    </div>
                  : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
                      {products.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
            )}

            {/* ── ABOUT TAB ── */}
            {tab === "about" && (
              <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 14 }}>
                {shop.description && (
                  <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase",
                      letterSpacing: "0.06em", color: "#9CA3AF", marginBottom: 8 }}>About this store</div>
                    <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0 }}>{shop.description}</p>
                  </div>
                )}

                <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase",
                    letterSpacing: "0.06em", color: "#9CA3AF", marginBottom: 12 }}>Seller Information</div>
                  {[
                    shop.city && shop.region && { label: "Location", value: `${shop.city}, ${shop.region}` },
                    shop.successfulSales && { label: "Successful Sales", value: `${Number(shop.successfulSales).toLocaleString()}+` },
                    { label: "Plan", value: (shop.planId || "basic").charAt(0).toUpperCase() + (shop.planId || "basic").slice(1) },
                  ].filter(Boolean).map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between",
                      padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: 13 }}>
                      <span style={{ color: "#9CA3AF", fontWeight: 600 }}>{row.label}</span>
                      <span style={{ color: "#111", fontWeight: 700 }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {hasPerf && (
                  <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase",
                      letterSpacing: "0.06em", color: "#9CA3AF", marginBottom: 12 }}>Seller Performance</div>
                    {perf.shippingSpeed  && <PerfRow label="Shipping Speed"  value={perf.shippingSpeed}  />}
                    {perf.qualityScore   && <PerfRow label="Quality Score"   value={perf.qualityScore}   />}
                    {perf.customerRating && <PerfRow label="Customer Rating" value={perf.customerRating} />}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat modal */}
      {showChat && shop && (
        <ChatModal
          shop={shop}
          onClose={() => setShowChat(false)}
        />
      )}

      <style>{`
        @keyframes sf-pulse { 0%,100%{opacity:.45} 50%{opacity:.85} }
        @media(min-width:768px){ }
      `}</style>
    </div>
  );
}

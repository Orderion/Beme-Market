// src/pages/StoreFront.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, getDoc, collection, query, where, getDocs,
  setDoc, deleteDoc, updateDoc, increment, serverTimestamp, orderBy, limit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";

function fmtMoney(n) {
  return `GHS ${Number(n || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {String(d).split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const IC = {
  verified: "M9 12l2 2 4-4|M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  wp:       "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  ig:       "M17.5 2h-11A5.5 5.5 0 0 0 1 7.5v9A5.5 5.5 0 0 0 6.5 22h11a5.5 5.5 0 0 0 5.5-5.5v-9A5.5 5.5 0 0 0 17.5 2z|M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z|M17.5 6.5h.01",
  tt:       "M9 18V5l12-2v13|M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6|M18 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  link:     "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71|M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  box:      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

/* ── Product card ── */
function ProductCard({ product }) {
  const navigate = useNavigate();
  const imgs  = Array.isArray(product.images) ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const price = Number(product.price || 0);
  const cmp   = Number(product.comparePrice || 0);
  const disc  = cmp > price;

  return (
    <button type="button" onClick={() => navigate(`/product/${product.id}`)}
      className="sf-product-card">
      <div className="sf-product-img-wrap">
        {imgs[0]
          ? <img src={imgs[0]} alt={product.name} className="sf-product-img" />
          : <div className="sf-product-img-empty"><Ico d={IC.box} size={24} color="rgba(0,0,0,0.12)" /></div>
        }
        {disc && (
          <div className="sf-discount-badge">
            -{Math.round(((cmp - price) / cmp) * 100)}%
          </div>
        )}
        {product.inStock === false && (
          <div className="sf-out-of-stock">Out of Stock</div>
        )}
      </div>
      <div className="sf-product-info">
        <div className="sf-product-name">{product.name}</div>
        {product.category && <div className="sf-product-cat">{product.category}</div>}
        <div className="sf-product-price-row">
          <span className="sf-product-price">{fmtMoney(price)}</span>
          {disc && <span className="sf-product-compare">{fmtMoney(cmp)}</span>}
        </div>
      </div>
    </button>
  );
}

/* ── Skeleton ── */
function Skel({ h = 16, w = "100%", r = 8, style = {} }) {
  return <div className="sf-skel" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

/* ── Perf row ── */
function PerfRow({ label, value }) {
  const color = value === "Excellent" ? "#22C55E" : value === "Good" ? "#046EF2" : value === "Average" ? "#F59E0B" : "#9CA3AF";
  return (
    <div className="sf-perf-row">
      <div className="sf-perf-dot" style={{ background: color }} />
      <span className="sf-perf-label">{label}</span>
      <strong className="sf-perf-value" style={{ color }}>{value}</strong>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN
════════════════════════════════════════ */
export default function StoreFront() {
  const { storeSlug } = useParams();
  const navigate      = useNavigate();

  const [shop,        setShop]        = useState(null);
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [prodLoading, setProdLoading] = useState(true);
  const [following,   setFollowing]   = useState(false);
  const [fwLoading,   setFwLoading]   = useState(false);
  const [follCount,   setFollCount]   = useState(0);
  const [tab,         setTab]         = useState("products");
  const [currentUser, setCurrentUser] = useState(null);

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
    (async () => {
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
              const gen  = (data.shopName || "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
              if (gen === storeSlug) { shopData = { id: d.id, ...data }; break; }
            }
          }
        }
        if (shopData) { setShop(shopData); setFollCount(shopData.followersCount || 0); }
      } catch (e) { console.error("[StoreFront]", e); }
      finally { setLoading(false); }
    })();
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
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, "Products"),
          where("shopId",  "==", shop.id),
          where("status",  "==", "active"),
          orderBy("createdAt", "desc"),
          limit(100),
        ));
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        try {
          const snap2 = await getDocs(query(
            collection(db, "Products"),
            where("sellerId", "==", shop.ownerId),
            where("status",   "==", "active"),
            limit(100),
          ));
          setProducts(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
      } finally { setProdLoading(false); }
    })();
  }, [shop?.id, shop?.ownerId]);

  /* Track store visit */
  useEffect(() => {
    if (!shop?.id) return;
    import("../services/analyticsService")
      .then(({ trackStoreVisit }) => trackStoreVisit(shop.id, currentUser?.uid))
      .catch(() => {});
  }, [shop?.id]);

  /* Follow / unfollow */
  const handleFollow = async () => {
    if (!currentUser) { navigate("/login"); return; }
    if (!shop?.id) return;
    setFwLoading(true);
    const was = following;
    setFollowing(!was);
    setFollCount(c => was ? Math.max(0, c - 1) : c + 1);
    try {
      const ref = doc(db, "shops", shop.id, "followers", currentUser.uid);
      if (was) {
        await deleteDoc(ref);
        await updateDoc(doc(db, "shops", shop.id), { followersCount: increment(-1) });
      } else {
        await setDoc(ref, { uid: currentUser.uid, createdAt: serverTimestamp() });
        await updateDoc(doc(db, "shops", shop.id), { followersCount: increment(1) });
      }
      const snap = await getDoc(doc(db, "shops", shop.id));
      if (snap.exists()) setFollCount(Math.max(0, snap.data().followersCount || 0));
    } catch {
      setFollowing(was);
      setFollCount(c => was ? c + 1 : Math.max(0, c - 1));
    } finally { setFwLoading(false); }
  };

  /* Chat */
  const handleChat = () => {
    const pref = shop?.chatPreference || "beme";
    if (pref === "whatsapp" && shop?.whatsapp) {
      window.open(`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}`, "_blank");
    } else if (pref === "website" && shop?.website) {
      window.open(shop.website, "_blank");
    } else {
      if (!currentUser) { navigate(`/login?redirect=/store/${storeSlug}`); return; }
      navigate(`/messages?shop=${shop?.id}&seller=${shop?.ownerId}`);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="sf-wrap">
        <div className="sf-banner sf-skel" style={{ borderRadius: 0 }} />
        <div className="sf-container">
          <div className="sf-profile-card">
            <div className="sf-skel" style={{ width:80, height:80, borderRadius:"50%", marginTop:-40 }} />
            <div style={{ marginTop: 12 }}><Skel h={22} w={160} r={8} /></div>
            <div style={{ marginTop: 6  }}><Skel h={14} w={240} r={6} /></div>
          </div>
        </div>
        <style>{`
          @keyframes sf-shimmer{0%{background-position:-600px 0}100%{background-position:calc(600px + 100%) 0}}
          .sf-skel{background:rgba(0,0,0,0.07);background-image:linear-gradient(90deg,rgba(0,0,0,0.07) 25%,rgba(0,0,0,0.11) 50%,rgba(0,0,0,0.07) 75%);background-size:600px 100%;animation:sf-shimmer 1.4s ease infinite;}
          .sf-banner{height:220px;width:100%;}
          .sf-wrap{font-family:var(--font-main,'DM Sans',sans-serif);background:#f9fafb;min-height:100vh;}
          .sf-container{max-width:1080px;margin:0 auto;padding:0 16px;}
          .sf-profile-card{background:#fff;border:1px solid rgba(0,0,0,0.07);border-radius:0 0 16px 16px;border-top:none;padding:0 24px 20px;}
        `}</style>
      </div>
    );
  }

  /* ── Not found ── */
  if (!shop) {
    return (
      <div className="sf-not-found">
        <Ico d={IC.box} size={48} color="rgba(0,0,0,0.1)" />
        <div className="sf-not-found-title">Store not found</div>
        <div className="sf-not-found-sub">This store may have been removed.</div>
        <button onClick={() => navigate("/shop")} className="sf-btn sf-btn--primary">Browse Products</button>
        <style>{`.sf-not-found{min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;font-family:var(--font-main,'DM Sans',sans-serif);text-align:center;}.sf-not-found-title{font-size:18px;font-weight:800;color:#111;}.sf-not-found-sub{font-size:14px;color:#9CA3AF;margin-bottom:16px;}.sf-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 24px;border-radius:100px;border:none;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;transition:all 0.15s;}.sf-btn--primary{background:#111;color:#fff;}`}</style>
      </div>
    );
  }

  const isOwnStore = !!(currentUser?.uid && shop?.ownerId && currentUser.uid === shop.ownerId);
  const basicPlan  = !shop.planId || shop.planId === "basic";
  const canSocial  = !basicPlan;
  const perf       = shop.performance || {};
  const hasPerf    = perf.shippingSpeed || perf.qualityScore || perf.customerRating;
  const initials   = (shop.shopName || "S").charAt(0).toUpperCase();

  const socialLinks = canSocial ? [
    shop.whatsapp  && { icon: IC.wp,   href: `https://wa.me/${shop.whatsapp.replace(/\D/g,"")}`,       label: "WhatsApp",  color: "#25D366" },
    shop.instagram && { icon: IC.ig,   href: `https://instagram.com/${shop.instagram.replace("@","")}`, label: "Instagram", color: "#E1306C" },
    shop.tiktok    && { icon: IC.tt,   href: `https://tiktok.com/@${shop.tiktok.replace("@","")}`,      label: "TikTok",    color: "#111"    },
    shop.website   && { icon: IC.link, href: shop.website,                                               label: "Website",   color: "#046EF2" },
  ].filter(Boolean) : [];

  return (
    <div className="sf-page">

      {/* ════ BANNER ════ */}
      <div className="sf-banner">
        {shop.bannerUrl
          ? <img src={shop.bannerUrl} alt="" className="sf-banner-img" />
          : <div className="sf-banner-fallback" />
        }
        <div className="sf-banner-fade" />
      </div>

      <div className="sf-container">

        {/* ════ PROFILE CARD ════ */}
        <div className="sf-profile-card">

          {/* Logo */}
          <div className="sf-logo">
            {shop.logoUrl
              ? <img src={shop.logoUrl} alt={shop.shopName} className="sf-logo-img" />
              : <span className="sf-logo-letter">{initials}</span>
            }
          </div>

          {/* Name + badges + meta */}
          <div className="sf-profile-body">
            <div className="sf-profile-left">
              <div className="sf-name-row">
                <h1 className="sf-shop-name">{shop.shopName || "Store"}</h1>
                {shop.verified && (
                  <div className="sf-badge sf-badge--verified">
                    <Ico d={IC.verified} size={11} color="#046EF2" /> Verified
                  </div>
                )}
                {shop.status === "active" && (
                  <div className="sf-active-pill">
                    <div className="sf-active-dot" /> Active
                  </div>
                )}
              </div>

              {shop.description && (
                <p className="sf-description">{shop.description}</p>
              )}

              {/* Stats */}
              <div className="sf-stats">
                <div className="sf-stat">
                  <div className="sf-stat-val">{products.length}</div>
                  <div className="sf-stat-lbl">Products</div>
                </div>
                <div className="sf-stat-divider" />
                <div className="sf-stat">
                  <div className="sf-stat-val">{follCount.toLocaleString()}</div>
                  <div className="sf-stat-lbl">Followers</div>
                </div>
                {shop.sellerScore > 0 && (
                  <>
                    <div className="sf-stat-divider" />
                    <div className="sf-stat">
                      <div className="sf-stat-val">{shop.sellerScore}%</div>
                      <div className="sf-stat-lbl">Score</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="sf-profile-actions">
              {!isOwnStore && (
                <button type="button" onClick={handleFollow} disabled={fwLoading}
                  className={`sf-btn${following ? " sf-btn--following" : " sf-btn--follow"}`}>
                  {fwLoading ? "…" : following ? "✓ Following" : "Follow"}
                </button>
              )}
              {!isOwnStore && (
                <button type="button" onClick={handleChat} className="sf-btn sf-btn--outline">
                  <Ico d={IC.chat} size={14} color="currentColor" /> Chat
                </button>
              )}
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                  className="sf-btn sf-btn--social">
                  <Ico d={s.icon} size={14} color={s.color} />
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ════ TABS ════ */}
        <div className="sf-tabs-bar">
          {["products", "about"].map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`sf-tab${tab === t ? " sf-tab--active" : ""}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "products" && !prodLoading && (
                <span className={`sf-tab-count${tab === "products" ? " sf-tab-count--active" : ""}`}>
                  {products.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════ TAB CONTENT ════ */}
        <div className="sf-tab-content">

          {/* Products */}
          {tab === "products" && (
            prodLoading
              ? <div className="sf-product-grid">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="sf-product-skel">
                      <div className="sf-skel" style={{ aspectRatio:"1", borderRadius:"10px 10px 0 0" }} />
                      <div style={{ padding:"10px 12px 14px" }}>
                        <Skel h={12} r={6} style={{ marginBottom:6 }} />
                        <Skel h={14} w="55%" r={6} />
                      </div>
                    </div>
                  ))}
                </div>
              : products.length === 0
                ? <div className="sf-empty">
                    <Ico d={IC.box} size={40} color="rgba(0,0,0,0.1)" />
                    <div className="sf-empty-title">No products yet</div>
                    <div className="sf-empty-sub">Check back soon!</div>
                  </div>
                : <div className="sf-product-grid">
                    {products.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>
          )}

          {/* About */}
          {tab === "about" && (
            <div className="sf-about">
              {shop.description && (
                <div className="sf-about-card">
                  <div className="sf-about-label">About this store</div>
                  <p className="sf-about-text">{shop.description}</p>
                </div>
              )}
              <div className="sf-about-card">
                <div className="sf-about-label">Seller Information</div>
                {[
                  shop.city && shop.region && { label: "Location", value: `${shop.city}, ${shop.region}` },
                  shop.successfulSales     && { label: "Successful Sales", value: `${Number(shop.successfulSales).toLocaleString()}+` },
                  { label: "Plan", value: (shop.planId || "basic").charAt(0).toUpperCase() + (shop.planId || "basic").slice(1) },
                ].filter(Boolean).map(row => (
                  <div key={row.label} className="sf-about-row">
                    <span className="sf-about-row-label">{row.label}</span>
                    <span className="sf-about-row-val">{row.value}</span>
                  </div>
                ))}
              </div>
              {hasPerf && (
                <div className="sf-about-card">
                  <div className="sf-about-label">Seller Performance</div>
                  {perf.shippingSpeed  && <PerfRow label="Shipping Speed"  value={perf.shippingSpeed}  />}
                  {perf.qualityScore   && <PerfRow label="Quality Score"   value={perf.qualityScore}   />}
                  {perf.customerRating && <PerfRow label="Customer Rating" value={perf.customerRating} />}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes sf-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: calc(600px + 100%) 0; }
        }
        @keyframes sf-pulse {
          0%,100% { opacity:.45; }
          50%      { opacity:.85; }
        }

        /* ── Root ── */
        .sf-page {
          background: #f9fafb;
          min-height: 100vh;
          font-family: var(--font-main,'DM Sans',system-ui,sans-serif);
          padding-bottom: 72px;
        }

        /* ── Banner ── */
        /* Reduced height, max-width constrained, no quality loss */
        .sf-banner {
          position: relative;
          width: 100%;
          height: 220px;
          overflow: hidden;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        }
        .sf-banner-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center 30%;
          display: block;
        }
        .sf-banner-fallback {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #1e1b4b 0%, #7c3aed 60%, #a78bfa 100%);
        }
        .sf-banner-fade {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%);
        }

        /* ── Container ── */
        .sf-container {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 16px;
        }

        /* ── Profile card ── */
        .sf-profile-card {
          background: #fff;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 0 0 20px 20px;
          border-top: none;
          padding: 0 24px 22px;
          margin-bottom: 14px;
          position: relative;
        }

        /* Logo — overlaps banner */
        .sf-logo {
          width: 82px; height: 82px;
          border-radius: 50%;
          border: 3.5px solid #fff;
          overflow: hidden;
          background: #7c3aed;
          margin-top: -41px;
          margin-bottom: 14px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          flex-shrink: 0;
        }
        .sf-logo-img    { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sf-logo-letter { font-size: 30px; font-weight: 900; color: #fff; line-height: 1; }

        .sf-profile-body {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 16px; flex-wrap: wrap;
        }
        .sf-profile-left { flex: 1; min-width: 200px; }

        .sf-name-row {
          display: flex; align-items: center; gap: 8px;
          flex-wrap: wrap; margin-bottom: 6px;
        }
        .sf-shop-name {
          font-size: 22px; font-weight: 900; color: #111;
          letter-spacing: -0.03em; margin: 0; line-height: 1.1;
        }

        .sf-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 100px;
          font-size: 11px; font-weight: 800; white-space: nowrap;
        }
        .sf-badge--verified {
          background: rgba(4,110,242,0.08);
          border: 1px solid rgba(4,110,242,0.2);
          color: #046EF2;
        }

        .sf-active-pill {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 700; color: #22C55E;
        }
        .sf-active-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #22C55E;
        }

        .sf-description {
          font-size: 13px; color: #6B7280; margin: 0 0 12px;
          line-height: 1.65; max-width: 480px;
        }

        /* Stats */
        .sf-stats {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
        }
        .sf-stat { text-align: left; }
        .sf-stat-val {
          font-size: 18px; font-weight: 900; color: #111;
          letter-spacing: -0.02em; line-height: 1.1;
        }
        .sf-stat-lbl { font-size: 11px; color: #9CA3AF; font-weight: 600; margin-top: 1px; }
        .sf-stat-divider { width: 1px; height: 28px; background: rgba(0,0,0,0.08); }

        /* Action buttons */
        .sf-profile-actions {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding-top: 4px;
        }
        .sf-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 20px; border-radius: 100px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          font-family: inherit; text-decoration: none;
          border: 1.5px solid transparent; transition: all 0.15s; white-space: nowrap;
        }
        .sf-btn--follow {
          background: #111; color: #fff; border-color: #111;
        }
        .sf-btn--follow:hover:not(:disabled) { background: #333; }
        .sf-btn--following {
          background: #046EF2; color: #fff; border-color: #046EF2;
          box-shadow: 0 4px 14px rgba(4,110,242,0.25);
        }
        .sf-btn--outline {
          background: #fff; color: #111; border-color: rgba(0,0,0,0.12);
        }
        .sf-btn--outline:hover { border-color: #111; }
        .sf-btn--social {
          background: #fff; color: #333; border-color: rgba(0,0,0,0.1);
          font-size: 12px;
        }
        .sf-btn--social:hover { border-color: rgba(0,0,0,0.3); }
        .sf-btn:disabled { opacity: 0.6; cursor: default; }

        /* ── Tabs bar ── */
        .sf-tabs-bar {
          display: flex;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 14px 14px 0 0;
          overflow: hidden;
          border-bottom: none;
          margin-bottom: 0;
        }
        .sf-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 14px 24px; border: none; background: transparent;
          cursor: pointer; font-size: 14px; font-weight: 700;
          font-family: inherit; color: #9CA3AF;
          border-bottom: 2px solid transparent; margin-bottom: -1px;
          transition: all 0.15s;
        }
        .sf-tab--active { color: #046EF2; border-bottom-color: #046EF2; }
        .sf-tab-count {
          font-size: 11px; font-weight: 700; padding: 2px 7px;
          border-radius: 100px; background: #f0f0f0; color: #9CA3AF;
        }
        .sf-tab-count--active { background: #046EF2; color: #fff; }

        /* ── Tab content ── */
        .sf-tab-content {
          background: #fff;
          border: 1px solid rgba(0,0,0,0.07);
          border-top: none;
          border-radius: 0 0 20px 20px;
          padding: 20px;
          min-height: 200px;
        }

        /* ── Product grid ── */
        .sf-product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }
        .sf-product-card {
          background: #fff; border: 1px solid rgba(0,0,0,0.07);
          border-radius: 14px; overflow: hidden; cursor: pointer;
          text-align: left; padding: 0;
          transition: transform 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .sf-product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .sf-product-img-wrap {
          aspect-ratio: 1; background: #f5f5f5;
          position: relative; overflow: hidden;
        }
        .sf-product-img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .sf-product-img-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
        .sf-discount-badge {
          position: absolute; top: 8px; left: 8px;
          background: #EF4444; color: #fff;
          font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 100px;
        }
        .sf-out-of-stock {
          position: absolute; inset: 0; background: rgba(255,255,255,0.75);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #9CA3AF;
        }
        .sf-product-info { padding: 10px 12px 14px; }
        .sf-product-name {
          font-size: 13px; font-weight: 700; color: #111;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;
        }
        .sf-product-cat { font-size: 10px; color: #9CA3AF; margin-bottom: 6px; }
        .sf-product-price-row { display: flex; align-items: baseline; gap: 6px; }
        .sf-product-price { font-size: 14px; font-weight: 900; color: #111; letter-spacing: -0.02em; }
        .sf-product-compare { font-size: 11px; color: #9CA3AF; text-decoration: line-through; }

        /* Skeleton product card */
        .sf-product-skel {
          border-radius: 14px; overflow: hidden;
          background: #fff; border: 1px solid rgba(0,0,0,0.07);
        }

        /* ── Empty state ── */
        .sf-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 48px 24px; text-align: center;
        }
        .sf-empty-title { font-size: 15px; font-weight: 800; color: #111; margin-top: 4px; }
        .sf-empty-sub   { font-size: 13px; color: #9CA3AF; }

        /* ── About tab ── */
        .sf-about { max-width: 640px; display: flex; flex-direction: column; gap: 12px; }
        .sf-about-card {
          background: #f8f9fb; border-radius: 12px; padding: 16px 18px;
          border: 1px solid rgba(0,0,0,0.05);
        }
        .sf-about-label {
          font-size: 11px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.07em; color: #9CA3AF; margin-bottom: 12px;
        }
        .sf-about-text {
          font-size: 14px; color: #374151; line-height: 1.7; margin: 0;
        }
        .sf-about-row {
          display: flex; justify-content: space-between;
          padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);
          font-size: 13px;
        }
        .sf-about-row:last-child { border-bottom: none; }
        .sf-about-row-label { color: #9CA3AF; font-weight: 600; }
        .sf-about-row-val   { color: #111; font-weight: 700; }

        /* ── Performance ── */
        .sf-perf-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .sf-perf-row:last-child { border-bottom: none; }
        .sf-perf-dot   { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .sf-perf-label { flex: 1; font-size: 13px; color: #6B7280; }
        .sf-perf-value { font-size: 13px; }

        /* ── Skeleton ── */
        .sf-skel {
          background: rgba(0,0,0,0.06);
          background-image: linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.06) 75%);
          background-size: 600px 100%;
          animation: sf-shimmer 1.4s ease infinite;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .sf-banner { height: 160px; }
          .sf-logo   { width: 68px; height: 68px; margin-top: -34px; }
          .sf-logo-letter { font-size: 24px; }
          .sf-shop-name   { font-size: 18px; }
          .sf-profile-card { padding: 0 16px 18px; }
          .sf-profile-body { flex-direction: column; gap: 14px; }
          .sf-profile-actions { width: 100%; }
          .sf-btn { padding: 8px 16px; font-size: 12px; }
          .sf-product-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
          .sf-tab-content { padding: 14px; }
          .sf-tabs-bar { border-radius: 10px 10px 0 0; }
        }

        @media (min-width: 1080px) {
          .sf-banner { height: 260px; }
        }
      `}</style>
    </div>
  );
}
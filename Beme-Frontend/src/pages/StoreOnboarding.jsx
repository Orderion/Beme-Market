import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "../hooks/useSellerAuth";
import { saveApplicationStep } from "../services/storeService";

const CAT_PATHS = {
  fashion:     "M9 3L3 7l3 2v12h12V9l3-2-6-4c0 1.66-1.34 3-3 3S9 4.66 9 3z",
  sneakers:    "M2 16s1-1 4-1 5 2 8 2 6-2 8-2v3s-2 2-8 2-8-2-8-2H2v-2z|M6 15V9l4-4h4",
  jewelry:     "M12 2l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z",
  cosmetics:   "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  hair:        "M12 2a5 5 0 015 5c0 5-5 9-5 9S7 12 7 7a5 5 0 015-5z|M12 11v10",
  food:        "M18 8h1a4 4 0 010 8h-1|M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z|M6 1v3|M10 1v3|M14 1v3",
  electronics: "M12 2l9 4.5V12a9 9 0 01-9 8 9 9 0 01-9-8V6.5L12 2z|M12 8v4|M12 14h.01",
  home:        "M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5Z|M9 21V12h6v9",
  arts:        "M12 19l7-7 3 3-7 7-3-3z|M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z",
  digital:     "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z|M8 11h8|M8 15h5",
  services:    "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  health:      "M22 12h-4l-3 9L9 3l-3 9H2",
  handmade:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  other:       "M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z|M12 11a1 1 0 100 2 1 1 0 000-2z|M12 7h.01",
};

const TYPES = [
  { id:"fashion",     label:"Fashion & Clothing",   desc:"Clothes, outfits, accessories"    },
  { id:"sneakers",    label:"Sneakers & Footwear",   desc:"Shoes, boots, sandals"            },
  { id:"jewelry",     label:"Jewelry & Accessories", desc:"Rings, necklaces, bracelets"      },
  { id:"cosmetics",   label:"Perfumes & Cosmetics",  desc:"Makeup, fragrance, skincare"      },
  { id:"hair",        label:"Hair & Beauty",          desc:"Wigs, extensions, salons"         },
  { id:"food",        label:"Food & Bakery",          desc:"Meals, snacks, pastries, drinks"  },
  { id:"electronics", label:"Phones & Electronics",  desc:"Gadgets, accessories, tech"       },
  { id:"home",        label:"Home & Living",          desc:"Furniture, decor, kitchenware"    },
  { id:"arts",        label:"Creative Arts",          desc:"Paintings, crafts, photography"   },
  { id:"digital",     label:"Digital Products",       desc:"Templates, ebooks, courses"       },
  { id:"services",    label:"Services",               desc:"Repairs, cleaning, consulting"    },
  { id:"health",      label:"Health & Fitness",       desc:"Supplements, equipment, wellness" },
  { id:"handmade",    label:"Handmade Goods",         desc:"Kente, weaving, artisan crafts"   },
  { id:"other",       label:"Other",                   desc:"Anything else you sell"           },
];

function CatSvg({ id, size=22, color="#9CA3AF" }) {
  const d = CAT_PATHS[id] || CAT_PATHS.other;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

export default function StoreOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shop, isSeller } = useSellerAuth();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  // Block if already has store
  const appliedUid = typeof window !== "undefined" ? localStorage.getItem("beme_seller_applied") : null;
  const hasStore = !!(shop?.id || isSeller || (appliedUid && user && appliedUid === user?.uid));
  if (user && hasStore) {
    navigate("/get-a-store", { replace: true });
    return null;
  }

  const handleContinue = async () => {
    if (!selected) { alert("Please choose a category."); return; }
    if (!user) { navigate("/login?redirect=/store-onboarding"); return; }
    setSaving(true);
    try {
      await saveApplicationStep(user.uid, 1, { businessType: selected });
      navigate("/store-survey");
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg,#F7F8FA)", fontFamily:"var(--font-main,'Nunito',sans-serif)" }}>

      {/* Sticky top bar */}
      <div style={{ background:"var(--card,#fff)", borderBottom:"1px solid rgba(0,0,0,0.07)",
        padding:"14px 20px", display:"flex", alignItems:"center", gap:16,
        position:"sticky", top:0, zIndex:50 }}>
        <button type="button" onClick={() => navigate("/get-a-store")}
          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text,#333)",
            fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:5,
            padding:0, fontFamily:"inherit", flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <div style={{ flex:1, height:4, background:"rgba(0,0,0,0.08)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:"25%", background:"#046EF2", borderRadius:2 }}/>
        </div>
        <span style={{ fontSize:12, fontWeight:700, color:"var(--muted,#9CA3AF)", flexShrink:0 }}>Step 1 of 4</span>
      </div>

      {/* Blue hero */}
      <div style={{ background:"#046EF2", padding:"32px 20px 28px" }}>
        <div style={{ maxWidth:560, margin:"0 auto" }}>
          <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", margin:"0 0 8px", letterSpacing:"-0.03em", lineHeight:1.1 }}>
            What do you sell?
          </h1>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.8)", margin:0, lineHeight:1.5 }}>
            Choose the category that best describes your business.
            You can sell across multiple categories after setup.
          </p>
        </div>
      </div>

      {/* Category list */}
      <div style={{ maxWidth:560, margin:"0 auto", padding:"20px 16px 120px" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {TYPES.map(bt => {
            const sel = selected === bt.id;
            return (
              <button key={bt.id} type="button" onClick={() => setSelected(bt.id)}
                style={{
                  display:"flex", alignItems:"center", gap:14, padding:"14px 16px",
                  borderRadius:14, border:`1.5px solid ${sel ? "#046EF2" : "rgba(0,0,0,0.08)"}`,
                  background: sel ? "rgba(4,110,242,0.05)" : "var(--card,#fff)",
                  cursor:"pointer", textAlign:"left", transition:"all 0.15s",
                  boxShadow: sel ? "0 0 0 1px #046EF2" : "none",
                }}>
                <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: sel ? "rgba(4,110,242,0.12)" : "rgba(0,0,0,0.05)",
                  transition:"background 0.15s" }}>
                  <CatSvg id={bt.id} size={22} color={sel ? "#046EF2" : "#9CA3AF"} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, color: sel ? "#046EF2" : "var(--text,#111)",
                    letterSpacing:"-0.01em", marginBottom:2 }}>
                    {bt.label}
                  </div>
                  <div style={{ fontSize:12, color:"var(--muted,#9CA3AF)", fontWeight:500,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {bt.desc}
                  </div>
                </div>
                {sel && (
                  <div style={{ width:22, height:22, borderRadius:"50%", background:"#046EF2",
                    flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0,
        background:"var(--card,#fff)", borderTop:"1px solid rgba(0,0,0,0.07)",
        padding:"14px 20px", boxSizing:"border-box" }}>
        <button type="button" onClick={handleContinue} disabled={!selected || saving}
          style={{ width:"100%", height:52, borderRadius:12, border:"none",
            background: selected ? "#046EF2" : "rgba(0,0,0,0.08)",
            color: selected ? "#fff" : "var(--muted,#9CA3AF)",
            fontSize:15, fontWeight:800, cursor: selected ? "pointer" : "not-allowed",
            fontFamily:"inherit", transition:"all 0.2s",
            boxShadow: selected ? "0 4px 14px rgba(4,110,242,0.35)" : "none",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {saving ? "Saving…" : "Continue"}
          {!saving && selected && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          )}
        </button>
        {selected && (
          <p style={{ textAlign:"center", fontSize:12, color:"var(--muted,#9CA3AF)", margin:"8px 0 0", fontWeight:500 }}>
            Selected: <strong style={{ color:"#046EF2" }}>{TYPES.find(b=>b.id===selected)?.label}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
#!/usr/bin/env bash
# ============================================================
# Beme Market — Install SVG Icon Updates (no more emojis)
# Run from: C:\Users\user\Documents\Beme Project
# ============================================================
set -e
GREEN="\033[0;32m"; BLUE="\033[0;34m"; NC="\033[0m"
echo -e "${BLUE}🔄 Installing SVG icon updates...${NC}"

# Safety check
if [ ! -d "Beme-Frontend" ]; then echo "Run from Beme Project root."; exit 1; fi

# Create icons directory
mkdir -p Beme-Frontend/src/components/icons

echo "  Writing Beme-Frontend/src/components/icons/SellerIcons.jsx..."
mkdir -p "Beme-Frontend/src/components/icons"
cat > 'Beme-Frontend/src/components/icons/SellerIcons.jsx' << 'BEME_SVG_EOF'
// src/components/icons/SellerIcons.jsx
// All SVG icons used across seller pages — no emojis anywhere
// Usage: import { IconFashion, IconZap, ... } from "../components/icons/SellerIcons";

const def = {
  fill: "none",
  strokeWidth: "1.6",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ size = 24, color = "currentColor", children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...def}>
      {children}
    </svg>
  );
}

/* ── Business type icons ─────────────────────────────────────────────────── */
export function IconFashion({ size, color }) {
  return <Svg size={size} color={color}><path d="M9 3L3 7l3 2v12h12V9l3-2-6-4c0 1.66-1.34 3-3 3S9 4.66 9 3z"/></Svg>;
}
export function IconSneakers({ size, color }) {
  return <Svg size={size} color={color}><path d="M2 16s1-1 4-1 5 2 8 2 6-2 8-2v3s-2 2-8 2-8-2-8-2H2v-2z"/><path d="M6 15V9l4-4h4"/></Svg>;
}
export function IconJewelry({ size, color }) {
  return <Svg size={size} color={color}><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3L8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></Svg>;
}
export function IconCosmetics({ size, color }) {
  return <Svg size={size} color={color}><path d="M12 22s4-2 4-7V8l-4-6-4 6v7c0 5 4 7 4 7z"/><path d="M8 8h8"/></Svg>;
}
export function IconHair({ size, color }) {
  return <Svg size={size} color={color}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></Svg>;
}
export function IconFood({ size, color }) {
  return <Svg size={size} color={color}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></Svg>;
}
export function IconElectronics({ size, color }) {
  return <Svg size={size} color={color}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></Svg>;
}
export function IconHome({ size, color }) {
  return <Svg size={size} color={color}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/></Svg>;
}
export function IconArts({ size, color }) {
  return <Svg size={size} color={color}><circle cx="13.5" cy="6.5" r=".5" fill={color}/><circle cx="17.5" cy="10.5" r=".5" fill={color}/><circle cx="8.5" cy="7.5" r=".5" fill={color}/><circle cx="6.5" cy="12.5" r=".5" fill={color}/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></Svg>;
}
export function IconDigital({ size, color }) {
  return <Svg size={size} color={color}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Svg>;
}
export function IconServices({ size, color }) {
  return <Svg size={size} color={color}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Svg>;
}
export function IconHealth({ size, color }) {
  return <Svg size={size} color={color}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Svg>;
}
export function IconHandmade({ size, color }) {
  return <Svg size={size} color={color}><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></Svg>;
}
export function IconOther({ size, color }) {
  return <Svg size={size} color={color}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Svg>;
}

/* ── Marketing / dashboard tool icons ────────────────────────────────────── */
export function IconZap({ size, color }) {
  return <Svg size={size} color={color}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Svg>;
}
export function IconTag({ size, color }) {
  return <Svg size={size} color={color}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></Svg>;
}
export function IconRocket({ size, color }) {
  return <Svg size={size} color={color}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></Svg>;
}
export function IconBrain({ size, color }) {
  return <Svg size={size} color={color}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></Svg>;
}
export function IconUsers({ size, color }) {
  return <Svg size={size} color={color}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Svg>;
}
export function IconStar({ size, color }) {
  return <Svg size={size} color={color}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>;
}

/* ── Status / badge icons ────────────────────────────────────────────────── */
export function IconLock({ size, color }) {
  return <Svg size={size} color={color}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>;
}
export function IconUnlock({ size, color }) {
  return <Svg size={size} color={color}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></Svg>;
}
export function IconShield({ size, color }) {
  return <Svg size={size} color={color}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>;
}
export function IconShieldCheck({ size, color }) {
  return <Svg size={size} color={color}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></Svg>;
}
export function IconCheck({ size, color }) {
  return <Svg size={size} color={color}><polyline points="20 6 9 17 4 12"/></Svg>;
}
export function IconCheckCircle({ size, color }) {
  return <Svg size={size} color={color}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Svg>;
}
export function IconAlertTriangle({ size, color }) {
  return <Svg size={size} color={color}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>;
}
export function IconBell({ size, color }) {
  return <Svg size={size} color={color}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Svg>;
}
export function IconInfo({ size, color }) {
  return <Svg size={size} color={color}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Svg>;
}

/* ── File / upload icons ─────────────────────────────────────────────────── */
export function IconUpload({ size, color }) {
  return <Svg size={size} color={color}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></Svg>;
}
export function IconImage({ size, color }) {
  return <Svg size={size} color={color}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></Svg>;
}
export function IconFile({ size, color }) {
  return <Svg size={size} color={color}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></Svg>;
}
export function IconPaperclip({ size, color }) {
  return <Svg size={size} color={color}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Svg>;
}

/* ── Commerce icons ──────────────────────────────────────────────────────── */
export function IconPackage({ size, color }) {
  return <Svg size={size} color={color}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Svg>;
}
export function IconShoppingBag({ size, color }) {
  return <Svg size={size} color={color}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></Svg>;
}
export function IconChat({ size, color }) {
  return <Svg size={size} color={color}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>;
}
export function IconWallet({ size, color }) {
  return <Svg size={size} color={color}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12h.01"/></Svg>;
}
export function IconStore({ size, color }) {
  return <Svg size={size} color={color}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/></Svg>;
}
export function IconChart({ size, color }) {
  return <Svg size={size} color={color}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></Svg>;
}
export function IconTrendingUp({ size, color }) {
  return <Svg size={size} color={color}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Svg>;
}
export function IconTrendingDown({ size, color }) {
  return <Svg size={size} color={color}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></Svg>;
}
export function IconDollar({ size, color }) {
  return <Svg size={size} color={color}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Svg>;
}

/* ── Convenience: icon map by id ─────────────────────────────────────────── */
export const BUSINESS_ICONS = {
  fashion:     IconFashion,
  sneakers:    IconSneakers,
  jewelry:     IconJewelry,
  cosmetics:   IconCosmetics,
  hair:        IconHair,
  food:        IconFood,
  electronics: IconElectronics,
  home:        IconHome,
  arts:        IconArts,
  digital:     IconDigital,
  services:    IconServices,
  health:      IconHealth,
  handmade:    IconHandmade,
  other:       IconOther,
};

export const MARKETING_ICONS = {
  flash:    IconZap,
  discount: IconTag,
  boost:    IconRocket,
  ai:       IconBrain,
  referral: IconUsers,
  loyalty:  IconStar,
};

BEME_SVG_EOF

echo "  Writing Beme-Frontend/src/pages/StoreOnboarding.jsx..."
mkdir -p "Beme-Frontend/src/pages"
cat > 'Beme-Frontend/src/pages/StoreOnboarding.jsx' << 'BEME_SVG_EOF'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveApplicationStep } from "../services/storeService";
import { BUSINESS_ICONS } from "../components/icons/SellerIcons";
import "./StoreOnboarding.css";

const BUSINESS_TYPES = [
  { id: "fashion",     label: "Fashion & Clothing",   desc: "Clothes, outfits, accessories"    },
  { id: "sneakers",    label: "Sneakers & Footwear",   desc: "Shoes, boots, sandals"            },
  { id: "jewelry",     label: "Jewelry & Accessories", desc: "Rings, necklaces, bracelets"      },
  { id: "cosmetics",   label: "Perfumes & Cosmetics",  desc: "Makeup, fragrance, skincare"      },
  { id: "hair",        label: "Hair & Beauty",          desc: "Wigs, extensions, salons"         },
  { id: "food",        label: "Food & Bakery",          desc: "Meals, snacks, pastries, drinks"  },
  { id: "electronics", label: "Phones & Electronics",  desc: "Gadgets, accessories, tech"       },
  { id: "home",        label: "Home & Living",          desc: "Furniture, decor, kitchenware"    },
  { id: "arts",        label: "Creative Arts",          desc: "Paintings, crafts, photography"   },
  { id: "digital",     label: "Digital Products",       desc: "Templates, ebooks, courses"       },
  { id: "services",    label: "Services",               desc: "Repairs, cleaning, consulting"    },
  { id: "health",      label: "Health & Fitness",       desc: "Supplements, equipment, wellness" },
  { id: "handmade",    label: "Handmade Goods",         desc: "Kente, weaving, artisan crafts"   },
  { id: "other",       label: "Other",                   desc: "Anything else you sell"           },
];

export default function StoreOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    if (!user) { navigate("/login?redirect=/store-onboarding"); return; }
    setSaving(true);
    try {
      await saveApplicationStep(user.uid, 1, { businessType: selected });
      navigate("/store-survey");
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="so-root">
      <div className="so-header">
        <button className="so-back" onClick={() => navigate("/get-a-store")}>← Back</button>
        <div className="so-progress-bar">
          <div className="so-progress-fill" style={{ width: "25%" }} />
        </div>
        <div className="so-step-label">Step 1 of 4</div>
      </div>

      <div className="so-content">
        <div className="so-intro">
          <h1 className="so-title">What do you sell?</h1>
          <p className="so-sub">Choose the category that best describes your business. You can sell across multiple categories after setup.</p>
        </div>

        <div className="so-grid">
          {BUSINESS_TYPES.map((bt) => {
            const IconComp = BUSINESS_ICONS[bt.id];
            const isSelected = selected === bt.id;
            return (
              <button
                key={bt.id}
                className={`so-card ${isSelected ? "so-card-selected" : ""}`}
                onClick={() => setSelected(bt.id)}
              >
                <div className="so-card-icon-wrap" style={{
                  color: isSelected ? "#046EF2" : "#6B7280",
                  background: isSelected ? "rgba(4,110,242,0.1)" : "rgba(0,0,0,0.05)",
                }}>
                  <IconComp size={26} color={isSelected ? "#046EF2" : "#6B7280"} />
                </div>
                <div className="so-card-label">{bt.label}</div>
                <div className="so-card-desc">{bt.desc}</div>
                {isSelected && (
                  <div className="so-card-check">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="#fff" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="so-footer">
          <button
            className="so-continue-btn"
            disabled={!selected || saving}
            onClick={handleContinue}
          >
            {saving ? "Saving…" : "Continue →"}
          </button>
          {selected && (
            <div className="so-selected-label">
              Selected: {BUSINESS_TYPES.find((b) => b.id === selected)?.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

BEME_SVG_EOF

echo "  Writing Beme-Frontend/src/pages/SubscriptionSuccess.jsx..."
mkdir -p "Beme-Frontend/src/pages"
cat > 'Beme-Frontend/src/pages/SubscriptionSuccess.jsx' << 'BEME_SVG_EOF'
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifySubscriptionPayment } from "../services/subscriptionService";
import "./SubscriptionSuccess.css";

function SpinnerIcon() {
  return <div className="succ-spinner" />;
}

function SuccessIcon() {
  return (
    <div className="succ-icon-wrap">
      <div className="succ-icon-circle">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="succ-icon-wrap">
      <div className="succ-icon-circle" style={{ background:"#EF4444" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
    </div>
  );
}

function StepDot({ delay = 0 }) {
  return (
    <div className="succ-step-dot succ-step-loading"
      style={{ animationDelay: `${delay}s` }} />
  );
}

function CheckItem({ label }) {
  return (
    <div className="succ-check-item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      {label}
    </div>
  );
}

export default function SubscriptionSuccess() {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const { user, refreshProfile } = useAuth();

  const reference = params.get("reference") || params.get("trxref");
  const status    = params.get("status");

  const [phase,     setPhase]     = useState("verifying");
  const [message,   setMessage]   = useState("Verifying your payment…");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    let mounted = true;
    const process = async () => {
      if (status === "free") {
        setPhase("success");
        setMessage("Your free store is ready!");
        await refreshProfile?.();
        return;
      }
      if (!reference) {
        setPhase("error");
        setMessage("No payment reference found. Please contact support.");
        return;
      }
      setMessage("Confirming payment with Paystack…");
      try {
        const result = await verifySubscriptionPayment(reference);
        if (!mounted) return;
        if (result?.success) {
          setStoreName(result.shopName || "Your Store");
          setPhase("success");
          await refreshProfile?.();
        } else {
          throw new Error(result?.error || "Verification failed.");
        }
      } catch (err) {
        if (!mounted) return;
        setPhase("error");
        setMessage(err.message || "Something went wrong. Please contact support.");
      }
    };
    process();
    return () => { mounted = false; };
  }, [reference, status]);

  return (
    <div className="succ-root">
      {/* CSS confetti (no emojis) */}
      {phase === "success" && (
        <div className="succ-confetti">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="succ-confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              background: ["#046EF2","#22C55E","#F59E0B","#7C3AED","#EF4444"][i % 5],
            }} />
          ))}
        </div>
      )}

      <div className="succ-card">
        {/* Verifying */}
        {phase === "verifying" && (
          <>
            <SpinnerIcon />
            <h2 className="succ-title">Setting Up Your Store</h2>
            <p className="succ-sub">{message}</p>
            <div className="succ-steps">
              {["Confirming payment", "Creating your storefront", "Activating your account"].map((s, i) => (
                <div key={s} className="succ-step-item">
                  <StepDot delay={i * 0.3} />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Success */}
        {phase === "success" && (
          <>
            <SuccessIcon />
            <h2 className="succ-title">Welcome to Beme Market!</h2>
            <p className="succ-sub">
              {storeName ? `${storeName} is now live!` : "Your store is live!"}{" "}
              Start adding products and sharing your store link with customers.
            </p>
            <div className="succ-checklist">
              <CheckItem label="Store created and activated" />
              <CheckItem label="Payment confirmed" />
              <CheckItem label="Seller dashboard ready" />
              <CheckItem label="Products can be listed now" />
            </div>
            <button className="succ-cta-btn" onClick={() => navigate("/seller-dashboard", { replace:true })}>
              Go to My Dashboard →
            </button>
            <div className="succ-support">
              Need help?{" "}
              <a href="/support" style={{ color:"#046EF2" }}>Contact support</a>
            </div>
          </>
        )}

        {/* Error */}
        {phase === "error" && (
          <>
            <ErrorIcon />
            <h2 className="succ-title">Something Went Wrong</h2>
            <p className="succ-sub">{message}</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", marginTop:24 }}>
              <button className="succ-cta-btn" style={{ background:"#EF4444" }} onClick={() => navigate("/store-plans")}>
                Try Again
              </button>
              <button className="succ-cta-btn" style={{ background:"rgba(0,0,0,0.08)", color:"#111" }} onClick={() => navigate("/support")}>
                Contact Support
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

BEME_SVG_EOF

echo "  Writing Beme-Frontend/src/pages/dashboard/DashboardMarketing.jsx..."
mkdir -p "Beme-Frontend/src/pages/dashboard"
cat > 'Beme-Frontend/src/pages/dashboard/DashboardMarketing.jsx' << 'BEME_SVG_EOF'
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { MARKETING_ICONS } from "../../components/icons/SellerIcons";

const TOOLS = [
  { id: "flash",    label: "Flash Sales",    desc: "Create time-limited sales with a countdown timer.",               plan: "standard" },
  { id: "discount", label: "Discount Codes",  desc: "Generate discount codes for promotions.",                         plan: "standard" },
  { id: "boost",    label: "Product Boosts",  desc: "Feature your products on the marketplace homepage.",              plan: "standard" },
  { id: "ai",       label: "AI Captions",     desc: "Generate marketing captions for your products with AI.",          plan: "pro"      },
  { id: "referral", label: "Referral System", desc: "Earn rewards for every new seller you refer.",                    plan: "pro"      },
  { id: "loyalty",  label: "Loyalty Rewards", desc: "Reward repeat customers with points.",                            plan: "pro"      },
];

const PLAN_TIER = { basic: 0, standard: 1, pro: 2 };

const ICON_COLORS = {
  flash:    "#F59E0B",
  discount: "#046EF2",
  boost:    "#7C3AED",
  ai:       "#22C55E",
  referral: "#EF4444",
  loyalty:  "#EC4899",
};

export default function DashboardMarketing() {
  const { subscriptionPlan } = useSellerAuth();

  const canAccess = (plan) =>
    (PLAN_TIER[subscriptionPlan] || 0) >= (PLAN_TIER[plan] || 0);

  return (
    <div>
      <div className="sd-page-head">
        <div className="sd-page-title">Marketing</div>
        <div className="sd-page-sub">Grow your store with promotional tools</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {TOOLS.map((t) => {
          const locked    = !canAccess(t.plan);
          const IconComp  = MARKETING_ICONS[t.id];
          const iconColor = ICON_COLORS[t.id] || "#046EF2";

          return (
            <div
              key={t.id}
              className="sd-panel"
              style={{ opacity: locked ? 0.6 : 1, position: "relative" }}
            >
              {locked && (
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  <span className="sd-badge sd-badge-purple" style={{ fontSize: 10 }}>
                    {t.plan.charAt(0).toUpperCase() + t.plan.slice(1)}+
                  </span>
                </div>
              )}

              {/* SVG icon in colored circle */}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${iconColor}18`,
                border: `1px solid ${iconColor}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <IconComp size={22} color={iconColor} />
              </div>

              <div className="sd-panel-title" style={{ marginBottom: 6 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: "#8B8FA8", lineHeight: 1.5, marginBottom: 16 }}>
                {t.desc}
              </div>

              <button
                className={`sd-btn ${locked ? "sd-btn-ghost" : "sd-btn-primary"} sd-btn-sm`}
                onClick={() =>
                  locked && alert(`This feature requires the ${t.plan} plan. Upgrade in the Subscription section.`)
                }
              >
                {locked
                  ? <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Upgrade to Access
                    </>
                  : "Configure →"
                }
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

BEME_SVG_EOF

echo "  Writing Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx..."
mkdir -p "Beme-Frontend/src/pages/dashboard"
cat > 'Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx' << 'BEME_SVG_EOF'
// ============================================================
// DashboardOrders.jsx — SVG empty state instead of emoji
// ============================================================
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getSellerOrders } from "../../services/storeService";

const STATUS_TABS = ["all","pending","processing","delivered","cancelled"];
const BADGE = { delivered:"sd-badge-green", processing:"sd-badge-blue", pending:"sd-badge-yellow", cancelled:"sd-badge-red" };

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

function EmptyOrders() {
  return (
    <div className="sd-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.4" strokeLinecap="round" style={{ marginBottom: 12 }}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
      <div className="sd-empty-title">No orders yet</div>
      <div className="sd-empty-text">Orders from customers will appear here.</div>
    </div>
  );
}

export default function DashboardOrders() {
  const { storeId } = useSellerAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (!storeId) return;
    getSellerOrders(storeId).then((d) => { setOrders(d); setLoading(false); }).catch(() => setLoading(false));
  }, [storeId]);

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status === tab || o.fulfillmentStatus === tab);

  return (
    <div>
      <div className="sd-page-head">
        <div><div className="sd-page-title">Orders</div><div className="sd-page-sub">{orders.length} total orders</div></div>
      </div>
      <div className="sd-tabs">
        {STATUS_TABS.map((t) => (
          <button key={t} className={`sd-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="sd-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : filtered.length === 0 ? <EmptyOrders />
          : (
            <div className="sd-table-wrap">
              <table className="sd-table">
                <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map((o) => {
                    const total = o.pricing?.total || 0;
                    const cust  = o.customer;
                    const items = Array.isArray(o.items) ? o.items.length : 0;
                    return (
                      <tr key={o.id}>
                        <td style={{ fontSize:12, color:"#8B8FA8", fontFamily:"monospace" }}>#{o.id?.slice(0,8).toUpperCase()}</td>
                        <td style={{ fontWeight:600 }}>{cust?.firstName || ""} {cust?.lastName || ""}</td>
                        <td style={{ color:"#8B8FA8" }}>{items} item{items !== 1 ? "s" : ""}</td>
                        <td style={{ fontWeight:700 }}>GHS {Number(total).toFixed(2)}</td>
                        <td style={{ color:"#8B8FA8", fontSize:12 }}>{fmtDate(o.createdAt)}</td>
                        <td><span className={`sd-badge ${BADGE[o.status] || "sd-badge-gray"}`}>{o.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}

BEME_SVG_EOF

echo "  Writing Beme-Frontend/src/pages/dashboard/DashboardCustomers.jsx..."
mkdir -p "Beme-Frontend/src/pages/dashboard"
cat > 'Beme-Frontend/src/pages/dashboard/DashboardCustomers.jsx' << 'BEME_SVG_EOF'
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getSellerOrders } from "../../services/storeService";

export default function DashboardCustomers() {
  const { storeId } = useSellerAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!storeId) return;
    getSellerOrders(storeId, 200).then((orders) => {
      const map = {};
      orders.forEach((o) => {
        const id = o.userId || o.customer?.email || "anon";
        if (!map[id]) {
          map[id] = {
            id, name: `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim(),
            phone: o.customer?.phone || "—", orders: 0, spent: 0, lastOrder: o.createdAt,
          };
        }
        map[id].orders++;
        map[id].spent += Number(o.pricing?.total || 0);
      });
      setCustomers(Object.values(map).sort((a,b) => b.spent - a.spent));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [storeId]);

  return (
    <div>
      <div className="sd-page-head">
        <div><div className="sd-page-title">Customers</div><div className="sd-page-sub">{customers.length} unique customers</div></div>
      </div>
      <div className="sd-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : customers.length === 0
            ? (
              <div className="sd-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.4" strokeLinecap="round" style={{ marginBottom:12 }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <div className="sd-empty-title">No customers yet</div>
                <div className="sd-empty-text">Customers who purchase from your store will appear here.</div>
              </div>
            ) : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Type</th></tr></thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(4,110,242,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:"#046EF2", flexShrink:0 }}>
                              {(c.name || "?")[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight:600 }}>{c.name || "Anonymous"}</span>
                          </div>
                        </td>
                        <td style={{ color:"#8B8FA8", fontSize:12 }}>{c.phone}</td>
                        <td style={{ fontWeight:600 }}>{c.orders}</td>
                        <td style={{ fontWeight:700 }}>GHS {Number(c.spent).toFixed(2)}</td>
                        <td><span className={`sd-badge ${c.orders > 1 ? "sd-badge-blue" : "sd-badge-gray"}`}>{c.orders > 1 ? "Repeat" : "New"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}

BEME_SVG_EOF

echo "  Writing Beme-Frontend/src/pages/dashboard/DashboardChat.jsx..."
mkdir -p "Beme-Frontend/src/pages/dashboard"
cat > 'Beme-Frontend/src/pages/dashboard/DashboardChat.jsx' << 'BEME_SVG_EOF'
import { useState } from "react";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour:"2-digit", minute:"2-digit" });
}

function ChatGateIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.3" strokeLinecap="round" style={{ marginBottom:12 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function EmptyConversations() {
  return (
    <div style={{ padding:24, textAlign:"center", color:"#8B8FA8", fontSize:12 }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.4" strokeLinecap="round" style={{ display:"block", margin:"0 auto 8px" }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      No conversations yet
    </div>
  );
}

function SelectConversationIcon() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.3" strokeLinecap="round" style={{ marginBottom:10 }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <div className="sd-empty-title">Select a conversation</div>
    </div>
  );
}

export default function DashboardChat() {
  const { user }       = useAuth();
  const { planLimits } = useSellerAuth();
  const {
    conversations, activeChat, setActiveChat, messages,
    loading, sending, totalUnread, sendMessage, markRead,
  } = useChat();

  const [text, setText] = useState("");

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    try { await sendMessage(text); setText(""); }
    catch { alert("Failed to send message."); }
  };

  const handleSelectChat = (chatId) => { setActiveChat(chatId); markRead(chatId); };
  const activeChatData  = conversations.find((c) => c.id === activeChat);

  if (!planLimits?.hasChat) {
    return (
      <div className="sd-empty" style={{ padding:64 }}>
        <ChatGateIcon />
        <div className="sd-empty-title">Live Chat requires Standard or Pro</div>
        <div className="sd-empty-text">Upgrade your plan to chat with customers in real time, send images, and set auto-replies.</div>
        <button className="sd-btn sd-btn-primary">Upgrade Plan</button>
      </div>
    );
  }

  return (
    <div>
      <div className="sd-page-head" style={{ marginBottom:14 }}>
        <div>
          <div className="sd-page-title">Messages</div>
          <div className="sd-page-sub">{conversations.length} conversations{totalUnread > 0 ? ` · ${totalUnread} unread` : ""}</div>
        </div>
      </div>

      <div style={{ height:"calc(100vh - 180px)", minHeight:480 }}>
        <div className="sd-chat-root" style={{ height:"100%" }}>
          {/* Conversation list */}
          <div className="sd-chat-list">
            <div className="sd-chat-list-head">Conversations</div>
            {loading
              ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:58, margin:8, borderRadius:8 }} />)
              : conversations.length === 0
                ? <EmptyConversations />
                : conversations.map((c) => (
                  <div key={c.id} className={`sd-chat-item ${activeChat === c.id ? "active" : ""}`} onClick={() => handleSelectChat(c.id)}>
                    <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(4,110,242,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:"#046EF2", flexShrink:0 }}>
                      {(c.customerName || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div className="sd-chat-item-name">{c.customerName || "Customer"}</div>
                      <div className="sd-chat-item-preview">{c.lastMessage || "No messages yet"}</div>
                    </div>
                    {c.unreadBySeller > 0 && (
                      <div style={{ background:"#046EF2", color:"#fff", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0 }}>
                        {c.unreadBySeller}
                      </div>
                    )}
                  </div>
                ))
            }
          </div>

          {/* Chat area */}
          <div className="sd-chat-main">
            {!activeChat
              ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}><SelectConversationIcon /></div>
              : (
                <>
                  <div className="sd-chat-header">
                    <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(4,110,242,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:"#046EF2" }}>
                      {(activeChatData?.customerName || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1A1D3B" }}>{activeChatData?.customerName || "Customer"}</div>
                      <div style={{ fontSize:11, color:"#22C55E", display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:"#22C55E" }} />
                        Online
                      </div>
                    </div>
                  </div>

                  <div className="sd-chat-messages">
                    {messages.map((m) => (
                      <div key={m.id}>
                        <div className={`sd-msg ${m.senderRole === "seller" ? "sd-msg-seller" : "sd-msg-customer"}`}>
                          {m.text}
                          {m.imageUrl && <img src={m.imageUrl} alt="attachment" style={{ maxWidth:"100%", borderRadius:6, marginTop:6 }} />}
                        </div>
                        <div style={{ fontSize:10, color:"#8B8FA8", textAlign: m.senderRole === "seller" ? "right" : "left", marginTop:2 }}>
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="sd-chat-input-row">
                    <input className="sd-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} />
                    <button className="sd-btn sd-btn-primary" onClick={handleSend} disabled={sending || !text.trim()}>
                      {sending ? "…" : "Send"}
                    </button>
                  </div>
                </>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}

BEME_SVG_EOF

echo "  Writing Beme-Frontend/src/pages/dashboard/DashboardWithdrawals.jsx..."
mkdir -p "Beme-Frontend/src/pages/dashboard"
cat > 'Beme-Frontend/src/pages/dashboard/DashboardWithdrawals.jsx' << 'BEME_SVG_EOF'
// src/pages/dashboard/DashboardWithdrawals.jsx
import { useState } from "react";
import { useWithdrawals } from "../../hooks/useWithdrawals";
import { PAYOUT_METHODS, MIN_WITHDRAWAL } from "../../services/payoutService";
import { IconWallet, IconInfo, IconAlertTriangle } from "../../components/icons/SellerIcons";

const STATUS_BADGE = { pending:"sd-badge-yellow", processing:"sd-badge-blue", approved:"sd-badge-blue", completed:"sd-badge-green", rejected:"sd-badge-red" };

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

function EmptyWithdrawals() {
  return (
    <div className="sd-empty">
      <IconWallet size={40} color="#D1D5DB" />
      <div className="sd-empty-title" style={{ marginTop:12 }}>No withdrawals yet</div>
      <div className="sd-empty-text">Your payout requests will appear here once submitted.</div>
    </div>
  );
}

export default function DashboardWithdrawals() {
  const { withdrawals, loading, submitting, error, pendingTotal, completedTotal, requestWithdrawal } = useWithdrawals();

  const [showForm, setShowForm] = useState(false);
  const [agreed,   setAgreed]   = useState(false);
  const [form, setForm]         = useState({ amount:"", method:"momo", momoNumber:"", momoNetwork:"MTN", accountName:"", bankName:"", bankAccount:"" });
  const [formError, setFormError] = useState(null);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setFormError("Please agree to the payout terms."); return; }
    setFormError(null);
    try {
      await requestWithdrawal(form);
      setShowForm(false);
      setForm({ amount:"", method:"momo", momoNumber:"", momoNetwork:"MTN", accountName:"", bankName:"", bankAccount:"" });
      setAgreed(false);
    } catch (err) { setFormError(err.message || "Failed to submit request."); }
  };

  return (
    <div>
      <div className="sd-page-head">
        <div><div className="sd-page-title">Withdrawals</div><div className="sd-page-sub">Request payouts to your MoMo or bank account</div></div>
        <button className="sd-btn sd-btn-primary" onClick={() => setShowForm(true)}>+ Request Withdrawal</button>
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:14, marginBottom:14 }}>
        {[
          { label:"Available Balance", value:"GHS 0.00",                         note:"Contact support to check",  color:"#22C55E" },
          { label:"Pending Payouts",   value:`GHS ${pendingTotal.toFixed(2)}`,   note:"Awaiting admin review",     color:"#F59E0B" },
          { label:"Total Withdrawn",   value:`GHS ${completedTotal.toFixed(2)}`, note:"All time completed",        color:"#046EF2" },
        ].map((c) => (
          <div key={c.label} className="sd-stat-card">
            <div className="sd-stat-label">{c.label}</div>
            <div className="sd-stat-value" style={{ fontSize:22, color:c.color }}>{c.value}</div>
            <div style={{ fontSize:11, color:"#8B8FA8", marginTop:4 }}>{c.note}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="sd-info-panel info" style={{ marginBottom:14 }}>
        <InfoIcon />
        <div className="sd-info-text">
          <strong>Payout Policy:</strong> Minimum withdrawal is GHS {MIN_WITHDRAWAL}. Payouts are processed within 1–3 business days. Ensure your details are accurate — Beme Market is not responsible for payments to wrong accounts.
        </div>
      </div>

      {/* History table */}
      <div className="sd-panel">
        <div className="sd-panel-head"><span className="sd-panel-title">Withdrawal History</span></div>
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : withdrawals.length === 0 ? <EmptyWithdrawals />
          : (
            <div className="sd-table-wrap">
              <table className="sd-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Account</th><th>Status</th><th>Note</th></tr></thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td style={{ color:"#8B8FA8", fontSize:12 }}>{fmtDate(w.createdAt)}</td>
                      <td style={{ fontWeight:700 }}>GHS {Number(w.amount || 0).toFixed(2)}</td>
                      <td style={{ fontSize:12 }}>{w.method === "momo" ? `MoMo (${w.momoNetwork})` : `Bank (${w.bankName})`}</td>
                      <td style={{ fontSize:12, color:"#8B8FA8" }}>{w.method === "momo" ? w.momoNumber : w.bankAccount}</td>
                      <td><span className={`sd-badge ${STATUS_BADGE[w.status] || "sd-badge-gray"}`}>{w.status}</span></td>
                      <td style={{ fontSize:12, color:"#8B8FA8" }}>{w.adminNote || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"var(--card,#fff)", borderRadius:16, padding:28, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:17, fontWeight:700, color:"#1A1D3B" }}>Request Withdrawal</h3>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#8B8FA8", fontSize:20 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sd-form-group">
                <label className="sd-label">Amount (GHS)</label>
                <input className="sd-input" type="number" min={MIN_WITHDRAWAL} step="0.01" value={form.amount} onChange={upd("amount")} placeholder={`Minimum GHS ${MIN_WITHDRAWAL}`} required />
              </div>
              <div className="sd-form-group">
                <label className="sd-label">Payout Method</label>
                <div style={{ display:"flex", gap:10 }}>
                  {Object.entries(PAYOUT_METHODS).map(([key, m]) => (
                    <label key={key} style={{ flex:1, padding:"10px 14px", borderRadius:8, border:`2px solid ${form.method === key ? "#046EF2" : "rgba(0,0,0,0.1)"}`, cursor:"pointer", display:"flex", alignItems:"center", gap:8, background: form.method === key ? "rgba(4,110,242,0.05)" : "transparent" }}>
                      <input type="radio" name="method" value={key} checked={form.method === key} onChange={upd("method")} style={{ display:"none" }} />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={form.method === key ? "#046EF2" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round">
                        {key === "momo"
                          ? <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>
                          : <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>
                        }
                      </svg>
                      <span style={{ fontSize:13, fontWeight:600, color: form.method === key ? "#046EF2" : "#1A1D3B" }}>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.method === "momo" ? (
                <>
                  <div className="sd-form-group">
                    <label className="sd-label">MoMo Network</label>
                    <select className="sd-select sd-input" value={form.momoNetwork} onChange={upd("momoNetwork")}>
                      {PAYOUT_METHODS.momo.networks.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="sd-form-group">
                    <label className="sd-label">MoMo Number</label>
                    <input className="sd-input" value={form.momoNumber} onChange={upd("momoNumber")} placeholder="0XX XXX XXXX" required={form.method === "momo"} />
                  </div>
                </>
              ) : (
                <>
                  <div className="sd-form-group">
                    <label className="sd-label">Bank Name</label>
                    <select className="sd-select sd-input" value={form.bankName} onChange={upd("bankName")}>
                      <option value="">Select bank</option>
                      {PAYOUT_METHODS.bank.banks.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="sd-form-group">
                    <label className="sd-label">Account Number</label>
                    <input className="sd-input" value={form.bankAccount} onChange={upd("bankAccount")} placeholder="Account number" required={form.method === "bank"} />
                  </div>
                </>
              )}
              <div className="sd-form-group">
                <label className="sd-label">Account Name *</label>
                <input className="sd-input" value={form.accountName} onChange={upd("accountName")} placeholder="Name registered to the account" required />
              </div>
              {/* Payout terms */}
              <div style={{ padding:"12px 14px", background:"rgba(245,158,11,0.07)", borderRadius:8, marginBottom:14, fontSize:12, color:"#6B7280", lineHeight:1.6, border:"1px solid rgba(245,158,11,0.2)" }}>
                By submitting, I confirm that account details are accurate. Beme Market is not liable for payments to incorrect accounts. Withdrawals may be held if there are pending disputes or policy violations.
              </div>
              <label style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:18, cursor:"pointer" }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop:2 }} />
                <span style={{ fontSize:13 }}>I agree to the payout terms and confirm my account details are correct.</span>
              </label>
              {(formError || error) && <div style={{ color:"#DC2626", fontSize:13, marginBottom:14 }}>{formError || error}</div>}
              <div style={{ display:"flex", gap:10 }}>
                <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowForm(false)} style={{ flex:1 }}>Cancel</button>
                <button type="submit" className="sd-btn sd-btn-primary" disabled={submitting} style={{ flex:2 }}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#046EF2" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  );
}

BEME_SVG_EOF

echo ""
echo -e "${GREEN}Done! 8 files updated — all emojis replaced with SVGs.${NC}"
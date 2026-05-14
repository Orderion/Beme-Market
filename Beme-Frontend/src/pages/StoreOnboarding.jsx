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


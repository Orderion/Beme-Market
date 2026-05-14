import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveApplicationStep } from "../services/storeService";
import "./StoreOnboarding.css";

const BUSINESS_TYPES = [
  { id: "fashion",     icon: "👗", label: "Fashion & Clothing",  desc: "Clothes, outfits, accessories"  },
  { id: "sneakers",    icon: "👟", label: "Sneakers & Footwear",  desc: "Shoes, boots, sandals"          },
  { id: "jewelry",     icon: "💍", label: "Jewelry & Accessories", desc: "Rings, necklaces, bracelets"   },
  { id: "cosmetics",   icon: "💄", label: "Perfumes & Cosmetics",  desc: "Makeup, fragrance, skincare"   },
  { id: "hair",        icon: "💇", label: "Hair & Beauty",          desc: "Wigs, extensions, salons"      },
  { id: "food",        icon: "🍔", label: "Food & Bakery",          desc: "Meals, snacks, pastries, drinks" },
  { id: "electronics", icon: "📱", label: "Phones & Electronics",  desc: "Gadgets, accessories, tech"    },
  { id: "home",        icon: "🏠", label: "Home & Living",          desc: "Furniture, decor, kitchenware" },
  { id: "arts",        icon: "🎨", label: "Creative Arts",          desc: "Paintings, crafts, photography" },
  { id: "digital",     icon: "💻", label: "Digital Products",       desc: "Templates, ebooks, courses"    },
  { id: "services",    icon: "🔧", label: "Services",               desc: "Repairs, cleaning, consulting" },
  { id: "health",      icon: "💪", label: "Health & Fitness",       desc: "Supplements, equipment, wellness" },
  { id: "handmade",    icon: "🧶", label: "Handmade Goods",         desc: "Kente, weaving, artisan crafts" },
  { id: "other",       icon: "📦", label: "Other",                   desc: "Anything else you sell"        },
];

export default function StoreOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);

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
      {/* Header */}
      <div className="so-header">
        <button className="so-back" onClick={() => navigate("/get-a-store")}>
          ← Back
        </button>
        <div className="so-progress-bar">
          <div className="so-progress-fill" style={{ width: "25%" }} />
        </div>
        <div className="so-step-label">Step 1 of 4</div>
      </div>

      {/* Content */}
      <div className="so-content">
        <div className="so-intro">
          <h1 className="so-title">What do you sell?</h1>
          <p className="so-sub">Choose the category that best describes your business. You can sell across multiple categories after setup.</p>
        </div>

        <div className="so-grid">
          {BUSINESS_TYPES.map((bt) => (
            <button
              key={bt.id}
              className={`so-card ${selected === bt.id ? "so-card-selected" : ""}`}
              onClick={() => setSelected(bt.id)}
            >
              <div className="so-card-icon">{bt.icon}</div>
              <div className="so-card-label">{bt.label}</div>
              <div className="so-card-desc">{bt.desc}</div>
              {selected === bt.id && <div className="so-card-check">✓</div>}
            </button>
          ))}
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


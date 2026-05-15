/**
 * catalog.js — Beme Market Ghana
 * These are BROWSE / SEO categories only.
 * Sellers pick a category when listing a product.
 * NOT specific product names or brands.
 */

// ─────────────────────────────────────────────────────────────
// PRIMARY MARKETPLACE CATEGORIES
// ─────────────────────────────────────────────────────────────
export const MARKETPLACE_CATEGORIES = [
  {
    key: "fashion-clothing",
    label: "Fashion & Clothing",
    emoji: "👗",
    subcategories: [
      "Men's Clothing",
      "Women's Clothing",
      "Kids' Clothing",
      "Traditional Wear (Kente, Ankara)",
      "Underwear & Nightwear",
      "Workwear & Uniforms",
      "Sportswear & Activewear",
      "Plus Size Clothing",
      "Maternity Wear",
      "Swimwear",
    ],
  },
  {
    key: "shoes-footwear",
    label: "Shoes & Footwear",
    emoji: "👟",
    subcategories: [
      "Sneakers & Trainers",
      "Men's Shoes",
      "Women's Shoes",
      "Kids' Shoes",
      "Sandals & Slippers",
      "Heels & Wedges",
      "Boots",
      "Loafers & Moccasins",
      "Sports Shoes",
      "Traditional Footwear",
    ],
  },
  {
    key: "phones-tablets",
    label: "Phones & Tablets",
    emoji: "📱",
    subcategories: [
      "Smartphones",
      "Feature Phones",
      "Tablets",
      "Phone Cases & Covers",
      "Screen Protectors",
      "Chargers & Cables",
      "Power Banks",
      "Earphones & Headsets",
      "Smartwatches",
      "Phone Accessories",
    ],
  },
  {
    key: "electronics-gadgets",
    label: "Electronics & Gadgets",
    emoji: "💻",
    subcategories: [
      "Laptops & Computers",
      "Televisions",
      "Audio & Speakers",
      "Cameras & Photography",
      "Gaming & Consoles",
      "Smart Home Devices",
      "Printers & Scanners",
      "Networking & WiFi",
      "Storage & Memory",
      "Electronic Accessories",
    ],
  },
  {
    key: "beauty-skincare",
    label: "Beauty & Skincare",
    emoji: "✨",
    subcategories: [
      "Skincare & Moisturisers",
      "Face Makeup",
      "Eye Makeup",
      "Lip Products",
      "Nail Care & Polish",
      "Body Lotion & Cream",
      "Sunscreen & SPF",
      "Men's Grooming",
      "Beauty Tools & Devices",
      "Natural & Organic Beauty",
    ],
  },
  {
    key: "perfumes-fragrance",
    label: "Perfumes & Fragrance",
    emoji: "🌸",
    subcategories: [
      "Women's Perfumes",
      "Men's Cologne",
      "Unisex Fragrances",
      "Body Spray & Mist",
      "Roll-on Perfume",
      "Arabian & Oud",
      "Travel Size Perfume",
      "Perfume Gift Sets",
    ],
  },
  {
    key: "hair-care",
    label: "Hair & Hair Care",
    emoji: "💇",
    subcategories: [
      "Natural Hair Products",
      "Weaves & Extensions",
      "Wigs",
      "Braiding Hair",
      "Shampoo & Conditioner",
      "Hair Oils & Serums",
      "Hair Styling Tools",
      "Bonnets & Hair Accessories",
      "Locs & Dreadlock Products",
      "Hair Relaxers",
    ],
  },
  {
    key: "jewellery-accessories",
    label: "Jewellery & Accessories",
    emoji: "💍",
    subcategories: [
      "Necklaces & Chains",
      "Bracelets & Bangles",
      "Earrings",
      "Rings",
      "Anklets",
      "African Beads & Traditional",
      "Men's Jewellery",
      "Watches",
      "Bags & Purses",
      "Belts & Wallets",
    ],
  },
  {
    key: "food-drinks",
    label: "Food & Drinks",
    emoji: "🍱",
    subcategories: [
      "Ghanaian Food & Snacks",
      "Baked Goods & Pastries",
      "Beverages & Juices",
      "Health Foods & Supplements",
      "Spices & Seasonings",
      "Packaged & Processed Food",
      "Fresh Produce",
      "Dairy & Eggs",
      "Cooking Oils & Sauces",
      "Cakes & Desserts",
    ],
  },
  {
    key: "home-living",
    label: "Home & Living",
    emoji: "🏠",
    subcategories: [
      "Bedding & Pillows",
      "Curtains & Blinds",
      "Kitchen & Cookware",
      "Dining & Tableware",
      "Storage & Organisation",
      "Cleaning Products",
      "Bathroom Accessories",
      "Wall Art & Decor",
      "Candles & Lighting",
      "African Home Decor",
    ],
  },
  {
    key: "health-fitness",
    label: "Health & Fitness",
    emoji: "💪",
    subcategories: [
      "Vitamins & Supplements",
      "Fitness Equipment",
      "Yoga & Pilates",
      "Protein & Sports Nutrition",
      "Personal Care & Hygiene",
      "Medical Supplies",
      "Herbal & Traditional Medicine",
      "Weight Loss Products",
      "First Aid",
      "Sexual Health",
    ],
  },
  {
    key: "baby-kids",
    label: "Baby & Kids",
    emoji: "👶",
    subcategories: [
      "Baby Clothing",
      "Baby Feeding",
      "Diapers & Wipes",
      "Baby Skincare",
      "Toys & Games",
      "Baby Furniture",
      "School Supplies",
      "Kids' Bags & Backpacks",
      "Educational Materials",
      "Kids' Accessories",
    ],
  },
  {
    key: "sports-outdoor",
    label: "Sports & Outdoor",
    emoji: "⚽",
    subcategories: [
      "Football & Soccer",
      "Basketball",
      "Boxing & Martial Arts",
      "Cycling",
      "Swimming",
      "Running & Athletics",
      "Gym Equipment",
      "Outdoor & Camping",
      "Sports Wear",
      "Sports Accessories",
    ],
  },
  {
    key: "automotive",
    label: "Automotive",
    emoji: "🚗",
    subcategories: [
      "Car Accessories",
      "Car Care & Cleaning",
      "Motorbike Accessories",
      "Car Electronics",
      "Car Fragrances",
      "Tyres & Rims",
      "Engine Parts",
    ],
  },
  {
    key: "handmade-crafts",
    label: "Handmade & Crafts",
    emoji: "🎨",
    subcategories: [
      "African Art & Paintings",
      "Handmade Jewellery",
      "Woven & Textile Crafts",
      "Pottery & Ceramics",
      "Wood Carvings",
      "Bead Work",
      "Leather Goods",
      "Handmade Clothing",
      "Craft Supplies",
    ],
  },
  {
    key: "digital-products",
    label: "Digital Products",
    emoji: "💾",
    subcategories: [
      "E-books & Guides",
      "Online Courses",
      "Templates & Designs",
      "Software & Apps",
      "Music & Beats",
      "Photography & Videos",
      "Digital Art",
      "Social Media Resources",
    ],
  },
  {
    key: "services",
    label: "Services",
    emoji: "🛠️",
    subcategories: [
      "Photography & Videography",
      "Graphic Design",
      "Web Development",
      "Social Media Marketing",
      "Event Planning",
      "Catering",
      "Tutoring & Education",
      "Hair & Beauty Services",
      "Fashion & Tailoring",
      "Delivery & Logistics",
    ],
  },
  {
    key: "other",
    label: "Other",
    emoji: "📦",
    subcategories: [],
  },
];

/** Flat list of category labels — for simple <select> dropdowns */
export const CATEGORY_LABELS = MARKETPLACE_CATEGORIES.map((c) => c.label);

/** key → label lookup */
export const CATEGORY_MAP = Object.fromEntries(
  MARKETPLACE_CATEGORIES.map((c) => [c.key, c.label])
);

// ─────────────────────────────────────────────────────────────
// LEGACY EXPORTS — kept 100% intact for ProductDetails.jsx,
// Shop.jsx, and any other existing page that imports these.
// ─────────────────────────────────────────────────────────────

export const DEPARTMENTS = [
  { key: "men",         label: "Men"         },
  { key: "women",       label: "Women"       },
  { key: "unisex",      label: "Unisex"      },
  { key: "kids",        label: "Kids"        },
  { key: "accessories", label: "Accessories" },
];

export const KINDS = [
  { key: "fashion",  label: "Fashion"  },
  { key: "tech",     label: "Tech"     },
  { key: "perfumes", label: "Perfumes" },
  { key: "extras",   label: "Other"    },
];

export const SHOPS = [
  { key: "fashion", label: "Fashion Shop"    },
  { key: "main",    label: "Main Store"      },
  { key: "kente",   label: "Mintah's Kente"  },
  { key: "perfume", label: "Perfume Shop"    },
  { key: "tech",    label: "Tech Shop"       },
];

export const HOME_FILTER_OPTIONS = [
  { key: "iphones",        label: "iPhones"        },
  { key: "laptops",        label: "Laptops"         },
  { key: "shoes",          label: "Shoes"           },
  { key: "clothing",       label: "Clothing"        },
  { key: "kids",           label: "Kids"            },
  { key: "others",         label: "Others"          },
  { key: "home_appliances",label: "Home Appliances" },
  { key: "game",           label: "Game Shop"       },
];

export const DEFAULT_KIND_BY_DEPT = {
  men:         "fashion",
  women:       "fashion",
  unisex:      "fashion",
  kids:        "fashion",
  accessories: "tech",
};

export function normalizeDept(raw) {
  const v = String(raw || "").toLowerCase().trim();
  return DEPARTMENTS.some((d) => d.key === v) ? v : null;
}

export function normalizeKind(raw) {
  const v = String(raw || "").toLowerCase().trim();
  return KINDS.some((k) => k.key === v) ? v : null;
}

export function normalizeShop(raw) {
  const v = String(raw || "").toLowerCase().trim();
  return SHOPS.some((s) => s.key === v) ? v : null;
}

export function normalizeHomeFilter(raw) {
  const v = String(raw || "").toLowerCase().trim();
  return HOME_FILTER_OPTIONS.some((item) => item.key === v) ? v : "others";
}
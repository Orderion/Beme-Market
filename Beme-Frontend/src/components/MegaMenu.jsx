/**
 * MegaMenu.jsx — Jumia / Amazon-style category mega menu
 * Left rail: all categories with icons
 * Right panel: sub-sections in columns (hover-activated)
 *
 * Usage in Header.jsx:
 *   import MegaMenu from "./MegaMenu";
 *   ...
 *   {catMenuOpen && <MegaMenu onClose={() => setCatMenuOpen(false)} />}
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ─── SVG icons for left rail ─── */
const ICONS = {
  supermarket: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
    </svg>
  ),
  phones: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2.5"/>
      <circle cx="12" cy="17.5" r="0.8" fill="currentColor" stroke="none"/>
    </svg>
  ),
  beauty: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  ),
  fashion: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3L3 7l3 2v12h12V9l3-2-6-4c0 1.66-1.34 3-3 3S9 4.66 9 3z"/>
    </svg>
  ),
  electronics: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  computing: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="12" rx="1.5"/>
      <path d="M1 19h22"/>
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5Z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  appliances: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <circle cx="7" cy="6" r=".8" fill="currentColor" stroke="none"/>
      <circle cx="11" cy="6" r=".8" fill="currentColor" stroke="none"/>
    </svg>
  ),
  sporting: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/>
    </svg>
  ),
  baby: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4"/>
      <path d="M8 21v-2a4 4 0 018 0v2"/>
    </svg>
  ),
  gaming: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="12" rx="4"/>
      <path d="M8 11v4M6 13h4M15 12h2M15 14h2"/>
    </svg>
  ),
  automobile: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h14l4 4v4a2 2 0 01-2 2h-2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
    </svg>
  ),
};

/* ─── Category data ─── */
const CATEGORIES = [
  {
    key: "supermarket",
    label: "Supermarket",
    icon: ICONS.supermarket,
    panels: [
      {
        title: "FOOD & STAPLES",
        links: ["Rice & Grains", "Cooking Oil", "Sugar & Salt", "Flour & Baking", "Canned Food", "Noodles & Pasta", "Tomato Paste & Sauces"],
      },
      {
        title: "DRINKS & BEVERAGES",
        links: ["Water & Soft Drinks", "Malt & Energy Drinks", "Fruit Juices", "Tea & Coffee", "Alcoholic Beverages", "Milk & Dairy Drinks"],
      },
      {
        title: "SNACKS & CONFECTIONERY",
        links: ["Biscuits & Cookies", "Chocolates & Sweets", "Chips & Crisps", "Nuts & Dried Fruits", "Popcorn & Peanuts"],
      },
      {
        title: "HOUSEHOLD ESSENTIALS",
        links: ["Soaps & Detergents", "Toothpaste & Oral Care", "Sanitary Products", "Air Fresheners", "Insecticides & Mosquito Repellents"],
      },
    ],
  },
  {
    key: "phones",
    label: "Phones & Tablets",
    icon: ICONS.phones,
    panels: [
      {
        title: "MOBILE PHONES",
        links: ["Smartphones", "Android Phones", "iOS Phones (iPhone)", "Basic & Feature Phones", "5G Phones"],
      },
      {
        title: "MOBILE ACCESSORIES",
        links: ["Phone Cases & Covers", "Screen Protectors", "Chargers & Cables", "Power Banks", "Earphones & Headsets", "Wireless Earphones", "Smartwatches", "Memory Cards", "Selfie Sticks", "Phone Replacement Parts"],
      },
      {
        title: "TOP PHONE BRANDS",
        links: ["Samsung", "Apple", "Tecno", "Infinix", "Motorola", "Xiaomi", "iTel", "Nokia", "Oraimo"],
      },
      {
        title: "TABLETS",
        links: ["Tablets", "Educational & Kids Tablets", "Samsung Tablets", "iPad", "Tablet Cases & Accessories", "Tablet Earphone & Headsets"],
      },
    ],
  },
  {
    key: "beauty",
    label: "Health & Beauty",
    icon: ICONS.beauty,
    panels: [
      {
        title: "SKINCARE",
        links: ["Face Creams & Moisturisers", "Serums & Oils", "Sunscreen & SPF", "Body Lotion & Cream", "Cleansers & Toners", "Natural & Organic Skincare"],
      },
      {
        title: "MAKEUP",
        links: ["Foundation & Concealer", "Lipstick & Lip Gloss", "Mascara & Eyeliner", "Eyeshadow", "Blush & Bronzer", "Makeup Brushes & Tools", "Nail Polish & Care"],
      },
      {
        title: "HAIR CARE",
        links: ["Shampoo & Conditioner", "Hair Oils & Serums", "Natural Hair Products", "Wigs & Extensions", "Braiding Hair", "Hair Styling Tools", "Locs & Dreadlock Products"],
      },
      {
        title: "FRAGRANCES",
        links: ["Women's Perfume", "Men's Cologne", "Body Spray & Mist", "Unisex Perfume", "Arabian & Oud", "Roll-on Perfume", "Gift Sets"],
      },
      {
        title: "HEALTH ESSENTIALS",
        links: ["Vitamins & Supplements", "Medical Supplies", "Herbal & Traditional Medicine", "Pain Relief", "Sexual Health", "First Aid"],
      },
    ],
  },
  {
    key: "fashion",
    label: "Fashion",
    icon: ICONS.fashion,
    panels: [
      {
        title: "WOMEN'S FASHION",
        links: ["Dresses", "Tops & Blouses", "Trousers & Jeans", "Skirts", "Suits & Blazers", "Jumpsuits & Playsuits", "Lingerie & Nightwear", "Maternity Wear"],
      },
      {
        title: "MEN'S FASHION",
        links: ["Shirts & T-Shirts", "Trousers & Chinos", "Suits & Blazers", "Shorts", "Polo Shirts", "Hoodies & Sweatshirts", "Underwear & Socks"],
      },
      {
        title: "TRADITIONAL WEAR",
        links: ["Kente Clothing", "Ankara & African Print", "Kaba & Slit", "Agbada & Dashiki", "Smock (Batakari)", "Traditional Accessories"],
      },
      {
        title: "SHOES & BAGS",
        links: ["Women's Shoes", "Men's Shoes", "Sneakers & Trainers", "Sandals & Slippers", "Heels & Wedges", "Boots", "Handbags & Purses", "Backpacks & Luggage"],
      },
      {
        title: "ACCESSORIES",
        links: ["Jewellery & Beads", "Watches", "Sunglasses", "Belts & Wallets", "Hats & Caps", "Scarves & Ties"],
      },
    ],
  },
  {
    key: "electronics",
    label: "Electronics",
    icon: ICONS.electronics,
    panels: [
      {
        title: "TV & AUDIO",
        links: ["Televisions", "Soundbars & Speakers", "Home Theatre Systems", "Bluetooth Speakers", "Radios & Hi-Fi", "Headphones"],
      },
      {
        title: "CAMERAS & PHOTOGRAPHY",
        links: ["Digital Cameras", "DSLR & Mirrorless", "Action Cameras", "Drones", "Security Cameras", "Camera Accessories"],
      },
      {
        title: "SMART DEVICES",
        links: ["Smart TVs", "Smart Speakers", "Smart Home Devices", "Projectors", "Security Systems"],
      },
      {
        title: "AUDIO ACCESSORIES",
        links: ["Earphones & Earbuds", "Microphones", "Cables & Adapters", "Remote Controls"],
      },
    ],
  },
  {
    key: "computing",
    label: "Computing",
    icon: ICONS.computing,
    panels: [
      {
        title: "COMPUTERS",
        links: ["Laptops", "Desktop PCs", "All-in-One PCs", "Chromebooks", "Mac & MacBooks"],
      },
      {
        title: "COMPUTER ACCESSORIES",
        links: ["Monitors", "Keyboards & Mice", "Webcams", "USB Hubs & Docking Stations", "Laptop Bags & Sleeves", "Cooling Pads"],
      },
      {
        title: "PRINTERS & OFFICE",
        links: ["Printers & Scanners", "Ink & Toner", "Projectors", "Shredders", "Office Accessories"],
      },
      {
        title: "STORAGE & NETWORKING",
        links: ["Hard Drives & SSDs", "Flash Drives & Memory Cards", "Routers & Modems", "Network Cables", "Surge Protectors & UPS"],
      },
      {
        title: "TOP COMPUTER BRANDS",
        links: ["HP", "Dell", "Lenovo", "Asus", "Acer", "Apple"],
      },
    ],
  },
  {
    key: "home",
    label: "Home & Office",
    icon: ICONS.home,
    panels: [
      {
        title: "FURNITURE",
        links: ["Sofas & Couches", "Beds & Mattresses", "Wardrobes & Shelves", "Dining Tables & Chairs", "Office Furniture", "Kids Furniture"],
      },
      {
        title: "KITCHEN",
        links: ["Pots & Pans", "Plates & Bowls", "Kitchen Appliances", "Blenders & Juicers", "Storage Containers", "Cutlery & Utensils"],
      },
      {
        title: "BEDDING & BATH",
        links: ["Bedsheets & Pillowcases", "Blankets & Duvets", "Pillows & Bolsters", "Towels", "Curtains & Blinds", "Bathroom Accessories"],
      },
      {
        title: "HOME DECOR",
        links: ["Wall Art & Paintings", "Candles & Holders", "Clocks & Mirrors", "Vases & Indoor Plants", "Photo Frames", "African Decor"],
      },
    ],
  },
  {
    key: "appliances",
    label: "Appliances",
    icon: ICONS.appliances,
    panels: [
      {
        title: "COOLING & HEATING",
        links: ["Air Conditioners", "Fans & Ventilators", "Refrigerators & Freezers", "Water Heaters & Boilers"],
      },
      {
        title: "COOKING APPLIANCES",
        links: ["Microwave Ovens", "Gas Cookers & Stoves", "Electric Stoves & Cooktops", "Rice Cookers", "Air Fryers", "Sandwich Makers & Toasters"],
      },
      {
        title: "LAUNDRY",
        links: ["Washing Machines", "Tumble Dryers", "Irons & Steamers", "Washing Powder & Softeners"],
      },
      {
        title: "SMALL APPLIANCES",
        links: ["Vacuum Cleaners", "Electric Kettles", "Hair Dryers & Straighteners", "Generators", "Inverters & UPS", "Solar Equipment"],
      },
    ],
  },
  {
    key: "sporting",
    label: "Sporting Goods",
    icon: ICONS.sporting,
    panels: [
      {
        title: "SPORTS & FITNESS",
        links: ["Gym & Workout Equipment", "Yoga & Pilates Gear", "Running & Athletics", "Swimming", "Cycling", "Boxing & Martial Arts"],
      },
      {
        title: "TEAM SPORTS",
        links: ["Football & Soccer", "Basketball", "Table Tennis", "Volleyball", "Cricket", "Tennis & Badminton"],
      },
      {
        title: "SPORTSWEAR",
        links: ["Football Jerseys", "Sports Shoes & Cleats", "Gym Wear & Leggings", "Sports Bags", "Helmets & Protection"],
      },
      {
        title: "OUTDOOR",
        links: ["Camping & Hiking", "Fishing Equipment", "Outdoor Furniture", "Torches & Lanterns"],
      },
    ],
  },
  {
    key: "baby",
    label: "Baby Products",
    icon: ICONS.baby,
    panels: [
      {
        title: "BABY ESSENTIALS",
        links: ["Diapers & Wipes", "Baby Food & Formula", "Baby Skincare & Lotions", "Baby Feeding Bottles", "Baby Monitors"],
      },
      {
        title: "BABY CLOTHING",
        links: ["Newborn Clothing", "Toddler Clothing (0–5 yrs)", "Baby Shoes & Socks", "Baby Hats & Bibs", "School Uniforms"],
      },
      {
        title: "TOYS & LEARNING",
        links: ["Baby Toys & Rattles", "Educational Toys", "Puzzles & Board Games", "Ride-on Toys", "LEGO & Building Blocks", "Dolls & Action Figures"],
      },
      {
        title: "NURSERY & TRAVEL",
        links: ["Baby Cots & Cribs", "Prams & Strollers", "Baby Carriers", "Car Seats", "Baby Bags & Accessories"],
      },
    ],
  },
  {
    key: "gaming",
    label: "Gaming",
    icon: ICONS.gaming,
    panels: [
      {
        title: "CONSOLES",
        links: ["PlayStation 5 (PS5)", "PlayStation 4 (PS4)", "Xbox Series X/S", "Nintendo Switch", "PC Gaming"],
      },
      {
        title: "GAMES & CREDITS",
        links: ["PS5 & PS4 Games", "Xbox Games", "Nintendo Games", "PC Game Keys", "PSN & Xbox Gift Cards", "Steam Wallet Cards"],
      },
      {
        title: "GAMING ACCESSORIES",
        links: ["Controllers & Gamepads", "Gaming Headsets", "Gaming Keyboards & Mice", "Gaming Monitors", "Gaming Chairs", "VR Headsets"],
      },
    ],
  },
  {
    key: "automobile",
    label: "Automobiles",
    icon: ICONS.automobile,
    panels: [
      {
        title: "CAR ACCESSORIES",
        links: ["Car Covers", "Seat Covers & Cushions", "Dashboard Cameras", "Car Chargers & Inverters", "Floor Mats", "Car Fragrances"],
      },
      {
        title: "CAR CARE",
        links: ["Car Wash & Polish", "Engine Oil & Lubricants", "Car Tools & Equipment", "Jump Starters & Battery Chargers"],
      },
      {
        title: "TYRES & PARTS",
        links: ["Car Tyres", "Rims & Alloys", "Brake Pads & Rotors", "Car Lights & Bulbs", "Exhaust Systems"],
      },
      {
        title: "MOTORBIKE",
        links: ["Motorbike Accessories", "Helmets & Safety Gear", "Motorbike Parts", "Motorbike Tyres"],
      },
    ],
  },
  {
    key: "other",
    label: "Other Categories",
    icon: ICONS.other,
    panels: [
      {
        title: "HANDMADE & CRAFTS",
        links: ["African Art & Paintings", "Handmade Jewellery", "Pottery & Ceramics", "Wood Carvings & Sculptures", "Woven & Textile Crafts", "Beadwork"],
      },
      {
        title: "DIGITAL PRODUCTS",
        links: ["E-books & Guides", "Online Courses", "Templates & Designs", "Music & Beats", "Software & Apps", "Digital Art"],
      },
      {
        title: "SERVICES",
        links: ["Photography & Videography", "Graphic Design", "Web Development", "Event Planning", "Catering & Food Services", "Tailoring & Alterations"],
      },
    ],
  },
];

/* ─── Component ─────────────────────────────────────────────── */
export default function MegaMenu({ onClose }) {
  const navigate  = useNavigate();
  const menuRef   = useRef(null);
  const [activeKey, setActiveKey] = useState(CATEGORIES[1].key); // default: Phones

  /* Close on outside click */
  useEffect(() => {
    const down = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const key = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("touchstart", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("touchstart", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  /* Close on route change */
  useEffect(() => {
    return () => {};
  }, []);

  const activeCat = CATEGORIES.find((c) => c.key === activeKey) || CATEGORIES[0];

  const handleLink = (link) => {
    navigate(`/shop?q=${encodeURIComponent(link)}`);
    onClose();
  };

  const handleCatClick = (cat) => {
    navigate(`/shop?q=${encodeURIComponent(cat.label)}`);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, top: 56,
          background: "rgba(0,0,0,0.45)",
          zIndex: 998,
          backdropFilter: "blur(1px)",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu panel */}
      <div
        ref={menuRef}
        role="dialog"
        aria-label="Browse all categories"
        style={{
          position: "fixed",
          top: 56,
          left: 0,
          right: 0,
          zIndex: 999,
          display: "flex",
          maxHeight: "calc(100vh - 56px)",
          overflow: "hidden",
          background: "var(--card, #fff)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          animation: "mmSlideDown 180ms ease both",
        }}
      >
        {/* ── LEFT RAIL: Category list ── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            overflowY: "auto",
            borderRight: "1px solid rgba(0,0,0,0.08)",
            background: "var(--bg, #F7F8FA)",
            padding: "8px 0",
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = cat.key === activeKey;
            return (
              <button
                key={cat.key}
                type="button"
                onMouseEnter={() => setActiveKey(cat.key)}
                onClick={() => handleCatClick(cat)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  padding: "11px 16px",
                  border: "none",
                  background: isActive ? "var(--card, #fff)" : "transparent",
                  borderLeft: `3px solid ${isActive ? "#046EF2" : "transparent"}`,
                  color: isActive ? "#046EF2" : "var(--text, #333)",
                  fontFamily: "var(--font-main, 'Nunito', system-ui)",
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s, color 0.12s",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0, display: "flex" }}>
                  {cat.icon}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{cat.label}</span>
                {/* Chevron */}
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={isActive ? "#046EF2" : "#CCC"}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            );
          })}

          {/* See all */}
          <div style={{ padding: "8px 16px 12px", borderTop: "1px solid rgba(0,0,0,0.07)", marginTop: 6 }}>
            <button
              type="button"
              onClick={() => { navigate("/shop"); onClose(); }}
              style={{
                background: "#046EF2", color: "#fff", border: "none",
                borderRadius: 8, padding: "9px 14px", width: "100%",
                fontSize: 12, fontWeight: 800, cursor: "pointer",
                fontFamily: "var(--font-main, 'Nunito', system-ui)",
              }}
            >
              See All Products
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL: Sub-sections ── */}
        <div
          key={activeKey}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 28px 24px",
            animation: "mmFadeIn 150ms ease both",
          }}
        >
          {/* Panel heading */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "flex", color: "#046EF2" }}>{activeCat.icon}</span>
              <span style={{
                fontSize: 16, fontWeight: 900, color: "var(--text, #111)",
                fontFamily: "var(--font-main, 'Nunito', system-ui)",
                letterSpacing: "-0.02em",
              }}>
                {activeCat.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCatClick(activeCat)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, color: "#046EF2",
                fontFamily: "var(--font-main, 'Nunito', system-ui)",
              }}
            >
              See all {activeCat.label} →
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(0,0,0,0.07)", marginBottom: 20 }}/>

          {/* Columns grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(activeCat.panels.length, 4)}, 1fr)`,
              gap: "0 32px",
            }}
          >
            {activeCat.panels.map((panel) => (
              <div key={panel.title} style={{ marginBottom: 20 }}>
                {/* Section title */}
                <div style={{
                  fontSize: 11, fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9CA3AF",
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: "1px solid rgba(0,0,0,0.07)",
                  fontFamily: "var(--font-main, 'Nunito', system-ui)",
                }}>
                  {panel.title}
                </div>

                {/* Links */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {panel.links.map((link) => (
                    <button
                      key={link}
                      type="button"
                      onClick={() => handleLink(link)}
                      style={{
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        padding: "5px 8px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text, #374151)",
                        cursor: "pointer",
                        fontFamily: "var(--font-main, 'Nunito', system-ui)",
                        transition: "background 0.1s, color 0.1s",
                        lineHeight: 1.4,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(4,110,242,0.07)";
                        e.currentTarget.style.color = "#046EF2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "none";
                        e.currentTarget.style.color = "var(--text, #374151)";
                      }}
                    >
                      {link}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mmSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
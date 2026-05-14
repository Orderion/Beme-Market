// Footer.jsx — Updated: Added "Seller Hub" links section
// All existing footer content preserved. New column added at the end.
import { Link } from "react-router-dom";

// ─── NOTE TO DEVELOPER ──────────────────────────────────────────────────────
// This file shows the structure of your footer with the new "Seller Hub"
// column added. Merge the new <FooterCol> at the bottom into your existing
// Footer.jsx — your existing columns (About, Help, etc.) stay unchanged.
// Search for "← NEW" comments to find additions.
// ─────────────────────────────────────────────────────────────────────────────

function FooterCol({ title, links }) {
  return (
    <div>
      <div style={{
        fontSize:      "11px",
        fontWeight:    700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color:         "var(--muted, rgba(255,255,255,0.5))",
        marginBottom:  "14px",
      }}>
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
        {links.map(({ label, to, external }) => (
          <li key={label}>
            {external
              ? <a href={to} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "var(--muted, rgba(255,255,255,0.6))", textDecoration: "none", transition: "color 0.15s" }}>{label}</a>
              : <Link to={to} style={{ fontSize: "13px", color: "var(--muted, rgba(255,255,255,0.6))", textDecoration: "none", transition: "color 0.15s" }}>{label}</Link>
            }
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      background:  "#0A0A0A",
      borderTop:   "1px solid rgba(255,255,255,0.06)",
      padding:     "48px 20px 32px",
      marginTop:   "auto",
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Main columns */}
        <div style={{
          display:             "grid",
          gridTemplateColumns: "1.5fr repeat(4, 1fr)",
          gap:                 "40px",
          marginBottom:        "40px",
        }}>
          {/* Brand */}
          <div>
            <Link to="/" style={{
              fontFamily:     "var(--font-display, 'Space Grotesk', sans-serif)",
              fontSize:       "22px",
              fontWeight:     800,
              color:          "var(--grtheme, #046EF2)",
              textDecoration: "none",
              letterSpacing:  "-0.03em",
              display:        "block",
              marginBottom:   "12px",
            }}>
              Beme
            </Link>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: "220px" }}>
              Ghana's premier marketplace for buyers and sellers. Sell anything, anywhere, get paid instantly.
            </p>
            {/* Payment badges */}
            <div style={{ display: "flex", gap: "8px", marginTop: "20px", flexWrap: "wrap" }}>
              {["MoMo", "Visa", "Mastercard", "Paystack"].map((badge) => (
                <span key={badge} style={{
                  padding:      "4px 10px",
                  borderRadius: "4px",
                  background:   "rgba(255,255,255,0.06)",
                  border:       "1px solid rgba(255,255,255,0.08)",
                  fontSize:     "10px",
                  fontWeight:   700,
                  color:        "rgba(255,255,255,0.5)",
                  letterSpacing: "0.04em",
                }}>
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <FooterCol title="Marketplace" links={[
            { label: "Shop All",      to: "/" },
            { label: "Flash Deals",   to: "/offers" },
            { label: "New Arrivals",  to: "/search?sort=newest" },
            { label: "Categories",    to: "/search" },
          ]} />

          {/* Help */}
          <FooterCol title="Help & Support" links={[
            { label: "Help Center",   to: "/support" },
            { label: "Track Order",   to: "/orders" },
            { label: "Returns",       to: "/refund-policy" },
            { label: "Contact Us",    to: "/support" },
          ]} />

          {/* Legal */}
          <FooterCol title="Legal" links={[
            { label: "Terms of Service",  to: "/terms-of-service" },
            { label: "Privacy Policy",    to: "/privacy-policy" },
            { label: "Refund Policy",     to: "/refund-policy" },
          ]} />

          {/* ── NEW: Seller Hub column ← NEW ────────────────────────────────── */}
          <FooterCol title="Sell on Beme" links={[
            { label: "Get a Store",          to: "/get-a-store" },           // ← NEW
            { label: "Pricing Plans",         to: "/store-plans" },           // ← NEW
            { label: "Seller Dashboard",      to: "/seller-dashboard" },      // ← NEW
            { label: "Seller Terms",          to: "/seller-terms" },          // ← NEW
            { label: "Seller Policy",         to: "/seller-policy" },         // ← NEW
            { label: "Community Guidelines",  to: "/community-guidelines" },  // ← NEW
          ]} />
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop:     "1px solid rgba(255,255,255,0.06)",
          paddingTop:    "20px",
          display:       "flex",
          justifyContent: "space-between",
          alignItems:    "center",
          flexWrap:      "wrap",
          gap:           "12px",
        }}>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
            © {year} Beme Market Ghana. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            {/* Social links — add your actual URLs */}
            {[
              { label: "Instagram", href: "https://instagram.com/bememarket" },
              { label: "TikTok",    href: "https://tiktok.com/@bememarket" },
              { label: "WhatsApp",  href: "https://wa.me/233000000000" },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer"
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}


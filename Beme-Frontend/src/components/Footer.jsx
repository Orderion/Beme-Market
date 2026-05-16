import { Link } from "react-router-dom";
import "./Footer.css";

/* ── Beme logo mark (shield + check) ── */
function BemeLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M12 3 4 7v5c0 4.8 3.2 7.8 8 9 4.8-1.2 8-4.2 8-9V7l-8-4Z"/>
      <path d="M9.2 12.2 11 14l3.8-3.8"/>
    </svg>
  );
}

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://instagram.com/bememarket",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@bememarket",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
      </svg>
    ),
  },
  {
    label: "X / Twitter",
    href: "https://x.com/bememarket",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://facebook.com/bememarket",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/233000000000",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@bememarket",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
];

const PAYMENT_BADGES = ["VISA", "Mastercard", "Paystack", "MTN MoMo", "Telecel Cash", "AirtelTigo"];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="ft">

      {/* ── Newsletter bar ── */}
      <div className="ft-newsletter">
        <div className="ft-newsletter-inner">
          <div className="ft-newsletter-text">
            <span className="ft-newsletter-eyebrow">Stay in the loop</span>
            <p className="ft-newsletter-headline">Get deals, drops &amp; updates</p>
          </div>
          <form className="ft-newsletter-form" onSubmit={e => e.preventDefault()}>
            <input
              type="email"
              placeholder="your@email.com"
              className="ft-newsletter-input"
              aria-label="Email for newsletter"
            />
            <button type="submit" className="ft-newsletter-btn">Subscribe</button>
          </form>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="ft-inner">

        {/* Brand column */}
        <div className="ft-brand">

          {/* Logo + wordmark — like Jumia */}
          <div className="ft-logo-row">
            <div className="ft-logo-icon">
              <BemeLogo/>
            </div>
            <span className="ft-logo-text">Beme Market</span>
          </div>

          <p className="ft-tagline">
            Ghana's go-to shop for fashion, beauty, tech, and handmade products — delivered to your door.
          </p>

          {/* Social icons */}
          <div className="ft-social">
            <span className="ft-social-label">Follow us</span>
            <div className="ft-social-row">
              {SOCIAL_LINKS.map(({ label, href, icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="ft-social-btn" aria-label={label} title={label}>
                  {icon}
                </a>
              ))}
            </div>
          </div>

          <div className="ft-ghana-badge">
            <span>🇬🇭</span>
            <span>Made for Ghana</span>
          </div>
        </div>

        {/* Links grid */}
        <div className="ft-grid">
          <div className="ft-col">
            <h4 className="ft-col-head">Shop</h4>
            <Link to="/shop">All Products</Link>
            <Link to="/shop?shop=fashion">Fashion</Link>
            <Link to="/shop?shop=tech">Tech</Link>
            <Link to="/shop?shop=kente">Kente &amp; Culture</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/shipping&returns">Shipping &amp; Returns</Link>
          </div>
          <div className="ft-col">
            <h4 className="ft-col-head">Account</h4>
            <Link to="/login">Log In</Link>
            <Link to="/signup">Sign Up</Link>
            <Link to="/orders">My Orders</Link>
            <Link to="/requests">Product Requests</Link>
            <Link to="/contact">Contact Support</Link>
          </div>
          <div className="ft-col">
            <h4 className="ft-col-head">Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/support">Help Centre</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <Link to="/refund-policy">Refund Policy</Link>
          </div>
        </div>
      </div>

      {/* ── Payment badges ── */}
      <div className="ft-payments">
        <span className="ft-payments-label">We accept</span>
        <div className="ft-payments-row">
          {PAYMENT_BADGES.map(b => (
            <span key={b} className="ft-payment-badge">{b}</span>
          ))}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="ft-bottom">
        <p className="ft-copy">© {year} Beme Market. All rights reserved.</p>
        <div className="ft-bottom-links">
          <Link to="/cookie-policy">Cookies</Link>
          <span aria-hidden="true">·</span>
          <Link to="/sitemap">Sitemap</Link>
          <span aria-hidden="true">·</span>
          <Link to="/accessibility">Accessibility</Link>
        </div>
      </div>
    </footer>
  );
}
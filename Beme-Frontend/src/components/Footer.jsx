import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <div className="site-footer__logo">Beme Market</div>
          <p className="site-footer__text">
            Luxury minimal ecommerce for Ghana-made products, fashion, beauty,
            and technology.
          </p>
        </div>

        <div className="site-footer__grid">
          <div className="site-footer__col">
            <h4>Shop</h4>
            <Link to="/shop">Shop</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/shipping&returns">Shipping & Returns</Link>
          </div>

          <div className="site-footer__col">
            <h4>Company</h4>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/support">Support</Link>
          </div>

          <div className="site-footer__col">
            <h4>Legal</h4>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <Link to="/refund-policy">Refund Policy</Link>
            <Link to="/cookie-policy">Cookie Policy</Link>
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>© {year} Beme Market. All rights reserved.</p>
      </div>
    </footer>
  );
}
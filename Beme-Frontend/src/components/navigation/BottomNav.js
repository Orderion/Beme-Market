import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import "./BottomNav.css";

/* ================= ICONS (MONOCHROME SVG) ================= */

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M4 11l8-7 8 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6 10v10h12V10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M6 7h12l-1 12H7L6 7z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M3 9l1-4h16l1 4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 9h16v10H4z" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M6 4h12v16H6z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 9h6M9 13h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/* ================= COMPONENT ================= */

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const { cartItems } = useCart();
  const { user } = useAuth();

  const count =
    cartItems?.reduce((sum, i) => sum + Number(i.qty || 1), 0) || 0;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bottom-nav">
      
      {/* HOME */}
      <button
        className={`bn-item ${isActive("/") ? "active" : ""}`}
        onClick={() => navigate("/")}
      >
        <IconHome />
        <span>Home</span>
      </button>

      {/* CART */}
      <button
        className={`bn-item ${isActive("/cart") ? "active" : ""}`}
        onClick={() => navigate("/cart")}
      >
        <div className="bn-icon-wrap">
          <IconBag />
          {count > 0 && <span className="bn-badge">{count}</span>}
        </div>
        <span>Cart</span>
      </button>

      {/* CENTER SHOP BUTTON */}
      <button
        className="bn-center"
        onClick={() => navigate("/shop")}
        aria-label="Shop"
      >
        <IconShop />
      </button>

      {/* ORDERS */}
      <button
        className={`bn-item ${isActive("/orders") ? "active" : ""}`}
        onClick={() => navigate("/orders")}
      >
        <IconOrders />
        <span>Orders</span>
      </button>

      {/* ACCOUNT */}
      <button
        className={`bn-item ${isActive("/login") ? "active" : ""}`}
        onClick={() => navigate(user ? "/orders" : "/login")}
      >
        <IconUser />
        <span>{user ? "Account" : "Login"}</span>
      </button>

    </nav>
  );
}
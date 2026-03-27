import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./Header.css";

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBag() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path
        d="M6 7h12l-1 12H7L6 7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a3 3 0 0 1 6 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Header({ onMenu, onCart }) {
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const actionLockRef = useRef(false);

  const count =
    cartItems?.reduce((sum, i) => sum + Number(i.qty || 1), 0) || 0;

  const pulseLock = () => {
    actionLockRef.current = true;
    window.setTimeout(() => {
      actionLockRef.current = false;
    }, 220);
  };

  const handleMenuOpen = () => {
    if (actionLockRef.current) return;
    pulseLock();
    onMenu?.();
  };

  const handleCartOpen = () => {
    if (actionLockRef.current) return;
    pulseLock();
    onCart?.();
  };

  return (
    <header className="hdr">
      {/* MENU BUTTON */}
      <button
        className="hdr-icon"
        onClick={handleMenuOpen}
        aria-label="Open menu"
        type="button"
      >
        <IconMenu />
      </button>

      <div className="hdr-right">
        {/* CART BUTTON */}
        <button
          className="hdr-icon hdr-bag"
          onClick={handleCartOpen}
          aria-label="Open cart"
          type="button"
        >
          <IconBag />
          {count > 0 && <span className="hdr-badge">{count}</span>}
        </button>
      </div>
    </header>
  );
}
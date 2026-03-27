import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
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

export default function Header({ onMenu, onCart }) {
  const navigate = useNavigate();

  const count =
    cartItems?.reduce((sum, i) => sum + Number(i.qty || 1), 0) || 0;

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

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showLogoutConfirm, logoutConfirmMounted]);

  return (
    <header className="hdr">
      <button
        className="hdr-icon"
        onClick={handleMenuOpen}
        aria-label="Open menu"
        type="button"
      >
        <IconMenu />
      </button>

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
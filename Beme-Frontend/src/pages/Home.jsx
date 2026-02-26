// src/pages/Home.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Dropdown({ label, open, onToggle, onClose, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });

  useEffect(() => {
    if (!open) return;
    if (!ref.current) return;

    const r = ref.current.getBoundingClientRect();
    setPos({
      top: r.bottom + 10,
      left: r.left,
      width: Math.max(200, r.width),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClose();
    };

    const onEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onClose, true); // close on scroll
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose]);

  return (
    <div className="dd" ref={ref}>
      <button type="button" className="filter-btn dd-btn" onClick={onToggle}>
        {label} <span className="dd-caret">▾</span>
      </button>

      {open && (
        <div
          className="dd-menu dd-menu--fixed"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="home">
      {/* ✅ SEARCH BAR */}
      <div className="search-container">
        <svg
          className="search-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>

        <input
          type="text"
          placeholder="Search products"
          className="search-input"
          onFocus={() => setOpenMenu(null)}
        />
      </div>

      {/* ✅ FILTER BAR (Working dropdowns) */}
      <div className="filter-bar">
        <Dropdown
          label="Categories"
          open={openMenu === "cat"}
          onToggle={() => setOpenMenu((v) => (v === "cat" ? null : "cat"))}
          onClose={() => setOpenMenu(null)}
        >
          <button className="dd-item" type="button" onClick={() => goCategory("tech")}>
            Tech
          </button>
          <button className="dd-item" type="button" onClick={() => goCategory("fashion")}>
            Fashion
          </button>
          <button className="dd-item" type="button" onClick={() => goCategory("accessories")}>
            Accessories
          </button>
        </Dropdown>

        <Dropdown
          label="More"
          open={openMenu === "more"}
          onToggle={() => setOpenMenu((v) => (v === "more" ? null : "more"))}
          onClose={() => setOpenMenu(null)}
        >
          <button className="dd-item" type="button" onClick={() => goPage("/about")}>
            About us
          </button>
          <button className="dd-item" type="button" onClick={() => goPage("/support")}>
            Support us
          </button>
          <button className="dd-item" type="button" onClick={() => goPage("/contact")}>
            Contact
          </button>
          <button className="dd-item" type="button" onClick={() => goPage("/faq")}>
            FAQ
          </button>
          <button className="dd-item" type="button" onClick={() => goPage("/shipping-returns")}>
            Shipping & Returns
          </button>
        </Dropdown>

        <button className="filter-btn" type="button" onClick={onOffersClick}>
          Offers
        </button>
      </div>

      {/* ✅ HERO CARD */}
      <section className="hero">
        <div className="hero-overlay">
          <span className="badge">Lowest price</span>
          <h2>New Arriaval 2026</h2>
          <button className="primary-btn" onClick={goToShop}>
            View product
          </button>
        </div>
      </section>

      {/* XMAS COLLECTION */}
      <section className="section">
        <div className="xmas-card">
          <div className="xmas-overlay">
            <h2>Mintah&apos;s Kente</h2>
            <button className="primary-btn" onClick={goToShop}>
              View collection
            </button>
          </div>
        </div>
      </section>

      {/* CONTINUE SHOPPING */}
      <section className="section">
        <div className="section-header">
          <h3>Continue shopping</h3>
          <span className="see-all" onClick={goToShop}>
            See all
          </span>
        </div>

        <div className="product-scroll">
          <div className="product-card" onClick={goToShop}>
            <img src="https://placehold.co/300x350" alt="" />
            <p className="product-name">Electronics</p>
          </div>

          <div className="product-card" onClick={goToShop}>
            <img src="https://placehold.co/300x350" alt="" />
            <p className="product-name">Ghana Made</p>
          </div>
        </div>
      </section>
    </div>
  );
}
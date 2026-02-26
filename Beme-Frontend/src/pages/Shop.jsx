// src/pages/Shop.jsx
import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import {
  DEPARTMENTS,
  KINDS,
  DEFAULT_KIND_BY_DEPT,
  normalizeDept,
  normalizeKind,
} from "../constants/catalog";
import "./Shop.css";

const Shop = () => {
  const [params, setParams] = useSearchParams();

  const deptParam = normalizeDept(params.get("dept"));
  const kindParam = normalizeKind(params.get("kind"));

  const [sortBy, setSortBy] = useState("new");

  const title = useMemo(() => {
    if (!deptParam && !kindParam) return "Hot sale";

    const deptLabel = deptParam
      ? DEPARTMENTS.find((d) => d.key === deptParam)?.label
      : null;

    const kindLabel = kindParam
      ? KINDS.find((k) => k.key === kindParam)?.label
      : null;

    if (deptLabel && kindLabel) return `${deptLabel} · ${kindLabel}`;
    return deptLabel || kindLabel || "Shop";
  }, [deptParam, kindParam]);

  const setDept = (dept) => {
    const next = new URLSearchParams(params);

    if (!dept) {
      next.delete("dept");
      next.delete("kind");
      setParams(next);
      return;
    }

    next.set("dept", dept);

    // Apply default kind only when kind is missing or invalid
    const currentKind = normalizeKind(next.get("kind"));
    if (!currentKind) {
      const def = DEFAULT_KIND_BY_DEPT[dept];
      if (def) next.set("kind", def);
    }

    setParams(next);
  };

  const setKind = (kind) => {
    const next = new URLSearchParams(params);

    if (!kind) {
      next.delete("kind");
      setParams(next);
      return;
    }

    next.set("kind", kind);
    setParams(next);
  };

  const filter = useMemo(() => {
    // This is the contract we’ll use in ProductGrid next
    return {
      dept: deptParam || null,
      kind: kindParam || null,
    };
  }, [deptParam, kindParam]);

  return (
    <div className="shop-page">
      {/* Top bar */}
      <div className="shop-topbar">
        <div className="shop-top-spacer" />
        <div className="shop-top-title-wrap">
          <h1 className="shop-title">{title}</h1>
        </div>
        <div className="shop-top-spacer" />
      </div>

      {/* Department chips */}
      <div className="shop-chips">
        <button
          type="button"
          className={!deptParam ? "chip active" : "chip"}
          onClick={() => setDept(null)}
        >
          All
        </button>

        {DEPARTMENTS.map((d) => (
          <button
            key={d.key}
            type="button"
            className={deptParam === d.key ? "chip active" : "chip"}
            onClick={() => setDept(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Kind chips (secondary) */}
      <div className="shop-chips shop-chips-secondary">
        <button
          type="button"
          className={!kindParam ? "chip active" : "chip"}
          onClick={() => setKind(null)}
        >
          All types
        </button>

        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            className={kindParam === k.key ? "chip active" : "chip"}
            onClick={() => setKind(k.key)}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Filter / Sort row */}
      <div className="shop-controls">
        <button className="shop-control-btn" type="button">
          <span className="shop-control-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="shop-svg" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 7h10M18 7h2 M4 17h6M14 17h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M14 5v4M10 15v4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Filter</span>
        </button>

        <div className="shop-divider" />

        <button
          className="shop-control-btn"
          type="button"
          onClick={() => setSortBy((s) => (s === "new" ? "price" : "new"))}
          title="Toggle sort"
        >
          <span className="shop-control-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="shop-svg" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M8 6v12M8 18l-3-3M8 18l3-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 6v12M16 6l-3 3M16 6l3 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Sort</span>
        </button>
      </div>

      {/* Count + grid */}
      <div className="shop-meta">
        <span className="shop-count">
          <ProductGrid filter={filter} sortBy={sortBy} withCount />
        </span>
      </div>

      <ProductGrid filter={filter} sortBy={sortBy} />
    </div>
  );
};

export default Shop;
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

  // URL params
  const deptParam = normalizeDept(params.get("dept"));
  const kindParam = normalizeKind(params.get("kind"));

  const sortParam = (params.get("sort") || "new").toLowerCase(); // new | price-asc | price-desc
  const minParam = params.get("min") ? Number(params.get("min")) : null;
  const maxParam = params.get("max") ? Number(params.get("max")) : null;
  const stockParam = params.get("stock") === "1";

  // UI state (panels)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Draft state for sort panel (so Apply controls when it commits to URL)
  const [draft, setDraft] = useState(() => ({
    sort: sortParam,
    min: minParam ?? "",
    max: maxParam ?? "",
    stock: stockParam,
  }));

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

  const hasActiveFilters = !!deptParam || !!kindParam;
  const hasActiveSort =
    sortParam !== "new" || stockParam || minParam != null || maxParam != null;

  const setDept = (dept) => {
    const next = new URLSearchParams(params);

    if (!dept) {
      next.delete("dept");
      next.delete("kind");
      setParams(next);
      return;
    }

    next.set("dept", dept);

    // default kind only if missing/invalid
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

  const clearFilterPanel = () => {
    const next = new URLSearchParams(params);
    next.delete("dept");
    next.delete("kind");
    setParams(next);
  };

  const openSort = () => {
    // sync draft from current url every time you open
    setDraft({
      sort: sortParam,
      min: minParam ?? "",
      max: maxParam ?? "",
      stock: stockParam,
    });
    setSortOpen(true);
    setFiltersOpen(false);
  };

  const applySort = () => {
    const next = new URLSearchParams(params);

    // sort
    if (!draft.sort || draft.sort === "new") next.delete("sort");
    else next.set("sort", draft.sort);

    // min/max
    const min = draft.min === "" ? null : Number(draft.min);
    const max = draft.max === "" ? null : Number(draft.max);

    if (min != null && !Number.isNaN(min) && min >= 0) next.set("min", String(min));
    else next.delete("min");

    if (max != null && !Number.isNaN(max) && max >= 0) next.set("max", String(max));
    else next.delete("max");

    // stock
    if (draft.stock) next.set("stock", "1");
    else next.delete("stock");

    setParams(next);
    setSortOpen(false);
  };

  const clearSortPanel = () => {
    setDraft({ sort: "new", min: "", max: "", stock: false });
    const next = new URLSearchParams(params);
    next.delete("sort");
    next.delete("min");
    next.delete("max");
    next.delete("stock");
    setParams(next);
    setSortOpen(false);
  };

  const filter = useMemo(() => {
    return {
      dept: deptParam || null,
      kind: kindParam || null,
      priceMin: minParam != null && !Number.isNaN(minParam) ? minParam : null,
      priceMax: maxParam != null && !Number.isNaN(maxParam) ? maxParam : null,
      inStockOnly: stockParam,
      sort: sortParam,
    };
  }, [deptParam, kindParam, minParam, maxParam, stockParam, sortParam]);

  return (
    <div className="shop-page">
      <div className="shop-topbar">
        <div className="shop-top-spacer" />
        <div className="shop-top-title-wrap">
          <h1 className="shop-title">{title}</h1>
        </div>
        <div className="shop-top-spacer" />
      </div>

      {/* FILTER PANEL */}
      <div className={`shop-panel ${filtersOpen ? "open" : ""}`}>
        <div className="shop-panel-inner">
          <div className="shop-panel-head">
            <span className="shop-panel-title">Filters</span>
            {hasActiveFilters && (
              <button type="button" className="shop-panel-action" onClick={clearFilterPanel}>
                Clear
              </button>
            )}
          </div>

          <div className="shop-panel-section">
            <div className="shop-panel-label">Department</div>
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
          </div>

          <div className="shop-panel-section">
            <div className="shop-panel-label">Type</div>
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
          </div>
        </div>
      </div>

      {/* SORT PANEL */}
      <div className={`shop-panel ${sortOpen ? "open" : ""}`}>
        <div className="shop-panel-inner">
          <div className="shop-panel-head">
            <span className="shop-panel-title">Sort & Price</span>
            {hasActiveSort && (
              <button type="button" className="shop-panel-action" onClick={clearSortPanel}>
                Reset
              </button>
            )}
          </div>

          <div className="shop-panel-section">
            <div className="shop-panel-label">Sort</div>
            <div className="shop-radio">
              <label className="shop-radio-item">
                <input
                  type="radio"
                  name="sort"
                  checked={draft.sort === "new"}
                  onChange={() => setDraft((p) => ({ ...p, sort: "new" }))}
                />
                Newest
              </label>

              <label className="shop-radio-item">
                <input
                  type="radio"
                  name="sort"
                  checked={draft.sort === "price-asc"}
                  onChange={() => setDraft((p) => ({ ...p, sort: "price-asc" }))}
                />
                Price: Low to High
              </label>

              <label className="shop-radio-item">
                <input
                  type="radio"
                  name="sort"
                  checked={draft.sort === "price-desc"}
                  onChange={() => setDraft((p) => ({ ...p, sort: "price-desc" }))}
                />
                Price: High to Low
              </label>
            </div>
          </div>

          <div className="shop-panel-section">
            <div className="shop-panel-label">Price range (GHS)</div>
            <div className="shop-range">
              <input
                inputMode="numeric"
                placeholder="Min"
                value={draft.min}
                onChange={(e) => setDraft((p) => ({ ...p, min: e.target.value }))}
              />
              <span className="shop-range-dash">—</span>
              <input
                inputMode="numeric"
                placeholder="Max"
                value={draft.max}
                onChange={(e) => setDraft((p) => ({ ...p, max: e.target.value }))}
              />
            </div>

            <label className="shop-toggle">
              <input
                type="checkbox"
                checked={draft.stock}
                onChange={(e) => setDraft((p) => ({ ...p, stock: e.target.checked }))}
              />
              In stock only
            </label>
          </div>

          <div className="shop-panel-actions">
            <button type="button" className="shop-btn ghost" onClick={() => setSortOpen(false)}>
              Cancel
            </button>
            <button type="button" className="shop-btn solid" onClick={applySort}>
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="shop-controls">
        <button
          className="shop-control-btn"
          type="button"
          onClick={() => {
            setFiltersOpen((v) => !v);
            setSortOpen(false);
          }}
          aria-expanded={filtersOpen}
        >
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
          <span>
            Filter {hasActiveFilters ? <span className="shop-dot" /> : null}
          </span>
        </button>

        <div className="shop-divider" />

        <button
          className="shop-control-btn"
          type="button"
          onClick={openSort}
          aria-expanded={sortOpen}
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
          <span>
            Sort {hasActiveSort ? <span className="shop-dot" /> : null}
          </span>
        </button>
      </div>

      {/* count + grid */}
      <div className="shop-meta">
        <span className="shop-count">
          <ProductGrid filter={filter} sortBy={filter.sort} withCount />
        </span>
      </div>

      <ProductGrid filter={filter} sortBy={filter.sort} />
    </div>
  );
};

export default Shop;
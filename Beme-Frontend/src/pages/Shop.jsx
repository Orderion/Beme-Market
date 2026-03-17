import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import {
  DEPARTMENTS,
  KINDS,
  SHOPS,
  HOME_FILTER_OPTIONS,
  DEFAULT_KIND_BY_DEPT,
  normalizeDept,
  normalizeKind,
  normalizeShop,
  normalizeHomeFilter,
} from "../constants/catalog";
import "./Shop.css";

const SHOP_TITLE_MAP = {
  fashion: "Fashion Shop",
  main: "Main Store",
  kente: "Mintah's Kente",
  perfume: "Perfume Shop",
  tech: "Tech Shop",
};

const SHOP_FILTER_OPTIONS = SHOPS.map((shop) => ({ ...shop }));
const HOME_SLOT_OPTIONS = HOME_FILTER_OPTIONS.map((item) => ({ ...item }));

function getLabel(list, key) {
  return list.find((item) => item.key === key)?.label || null;
}

const Shop = () => {
  const [params, setParams] = useSearchParams();

  const deptParam = normalizeDept(params.get("dept"));
  const kindParam = normalizeKind(params.get("kind"));
  const shopParam = normalizeShop(params.get("shop"));
  const slotRaw = params.get("slot");
  const slotParam = slotRaw ? normalizeHomeFilter(slotRaw) : null;
  const qParam = (params.get("q") || "").trim();

  const sortParam = (params.get("sort") || "new").toLowerCase();
  const minParam = params.get("min") ? Number(params.get("min")) : null;
  const maxParam = params.get("max") ? Number(params.get("max")) : null;
  const stockParam = params.get("stock") === "1";
  const featuredParam = params.get("featured") === "1";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const anyOpen = filtersOpen || sortOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [filtersOpen, sortOpen]);

  const [draft, setDraft] = useState(() => ({
    sort: sortParam,
    min: minParam ?? "",
    max: maxParam ?? "",
    stock: stockParam,
    featured: featuredParam,
  }));

  useEffect(() => {
    setDraft({
      sort: sortParam,
      min: minParam ?? "",
      max: maxParam ?? "",
      stock: stockParam,
      featured: featuredParam,
    });
  }, [sortParam, minParam, maxParam, stockParam, featuredParam]);

  const closePanels = () => {
    setFiltersOpen(false);
    setSortOpen(false);
  };

  const title = useMemo(() => {
    if (qParam) return `Search: "${qParam}"`;

    const deptLabel = deptParam ? getLabel(DEPARTMENTS, deptParam) : null;
    const kindLabel = kindParam ? getLabel(KINDS, kindParam) : null;
    const shopLabel = shopParam ? SHOP_TITLE_MAP[shopParam] || "Shop" : null;
    const slotLabel = slotParam ? getLabel(HOME_FILTER_OPTIONS, slotParam) : null;

    if (shopLabel && slotLabel && deptLabel && kindLabel) {
      return `${shopLabel} · ${slotLabel} · ${deptLabel} · ${kindLabel}`;
    }

    if (shopLabel && slotLabel && deptLabel) {
      return `${shopLabel} · ${slotLabel} · ${deptLabel}`;
    }

    if (shopLabel && slotLabel && kindLabel) {
      return `${shopLabel} · ${slotLabel} · ${kindLabel}`;
    }

    if (slotLabel && deptLabel && kindLabel) {
      return `${slotLabel} · ${deptLabel} · ${kindLabel}`;
    }

    if (shopLabel && slotLabel) {
      return `${shopLabel} · ${slotLabel}`;
    }

    if (slotLabel && deptLabel) {
      return `${slotLabel} · ${deptLabel}`;
    }

    if (slotLabel && kindLabel) {
      return `${slotLabel} · ${kindLabel}`;
    }

    if (shopLabel && deptLabel && kindLabel) {
      return `${shopLabel} · ${deptLabel} · ${kindLabel}`;
    }

    if (shopLabel && deptLabel) {
      return `${shopLabel} · ${deptLabel}`;
    }

    if (shopLabel && kindLabel) {
      return `${shopLabel} · ${kindLabel}`;
    }

    if (deptLabel && kindLabel) {
      return `${deptLabel} · ${kindLabel}`;
    }

    return slotLabel || shopLabel || deptLabel || kindLabel || "Hot sale";
  }, [deptParam, kindParam, shopParam, slotParam, qParam]);

  const hasActiveFilters =
    !!deptParam || !!kindParam || !!shopParam || !!slotParam || !!qParam;

  const hasActiveSort =
    sortParam !== "new" ||
    stockParam ||
    featuredParam ||
    minParam != null ||
    maxParam != null;

  const setDept = (dept) => {
    const next = new URLSearchParams(params);

    if (!dept) {
      next.delete("dept");
      next.delete("kind");
      setParams(next);
      return;
    }

    next.set("dept", dept);

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

  const setShop = (shop) => {
    const next = new URLSearchParams(params);

    if (!shop) {
      next.delete("shop");
      setParams(next);
      return;
    }

    next.set("shop", shop);
    setParams(next);
  };

  const setSlot = (slot) => {
    const next = new URLSearchParams(params);

    if (!slot) {
      next.delete("slot");
      setParams(next);
      return;
    }

    next.set("slot", slot);
    setParams(next);
  };

  const clearSearch = () => {
    const next = new URLSearchParams(params);
    next.delete("q");
    setParams(next);
  };

  const resetSortOnly = () => {
    const next = new URLSearchParams(params);
    next.delete("sort");
    setParams(next);
  };

  const resetPriceOnly = () => {
    const next = new URLSearchParams(params);
    next.delete("min");
    next.delete("max");
    setParams(next);
  };

  const toggleStock = (value) => {
    const next = new URLSearchParams(params);

    if (value) next.set("stock", "1");
    else next.delete("stock");

    setParams(next);
  };

  const toggleFeatured = (value) => {
    const next = new URLSearchParams(params);

    if (value) next.set("featured", "1");
    else next.delete("featured");

    setParams(next);
  };

  const clearFilterPanel = () => {
    const next = new URLSearchParams(params);
    next.delete("dept");
    next.delete("kind");
    next.delete("shop");
    next.delete("slot");
    next.delete("q");
    setParams(next);
  };

  const clearAll = () => {
    const next = new URLSearchParams(params);

    [
      "dept",
      "kind",
      "shop",
      "slot",
      "sort",
      "min",
      "max",
      "stock",
      "featured",
      "q",
    ].forEach((key) => next.delete(key));

    setParams(next);
    closePanels();
  };

  const openSort = () => {
    setDraft({
      sort: sortParam,
      min: minParam ?? "",
      max: maxParam ?? "",
      stock: stockParam,
      featured: featuredParam,
    });
    setSortOpen(true);
    setFiltersOpen(false);
  };

  const applySort = () => {
    const next = new URLSearchParams(params);

    if (!draft.sort || draft.sort === "new") next.delete("sort");
    else next.set("sort", draft.sort);

    const min = draft.min === "" ? null : Number(draft.min);
    const max = draft.max === "" ? null : Number(draft.max);

    if (min != null && !Number.isNaN(min) && min >= 0) {
      next.set("min", String(min));
    } else {
      next.delete("min");
    }

    if (max != null && !Number.isNaN(max) && max >= 0) {
      next.set("max", String(max));
    } else {
      next.delete("max");
    }

    if (draft.stock) next.set("stock", "1");
    else next.delete("stock");

    if (draft.featured) next.set("featured", "1");
    else next.delete("featured");

    setParams(next);
    setSortOpen(false);
  };

  const clearSortPanel = () => {
    setDraft({
      sort: "new",
      min: "",
      max: "",
      stock: false,
      featured: false,
    });

    const next = new URLSearchParams(params);
    next.delete("sort");
    next.delete("min");
    next.delete("max");
    next.delete("stock");
    next.delete("featured");

    setParams(next);
    setSortOpen(false);
  };

  const activePills = useMemo(() => {
    const pills = [];

    if (shopParam) {
      pills.push({
        key: `shop:${shopParam}`,
        label: SHOP_TITLE_MAP[shopParam] || getLabel(SHOPS, shopParam) || "Shop",
        onRemove: () => setShop(null),
      });
    }

    if (slotParam) {
      pills.push({
        key: `slot:${slotParam}`,
        label: getLabel(HOME_FILTER_OPTIONS, slotParam) || slotParam,
        onRemove: () => setSlot(null),
      });
    }

    if (deptParam) {
      pills.push({
        key: `dept:${deptParam}`,
        label: getLabel(DEPARTMENTS, deptParam) || deptParam,
        onRemove: () => setDept(null),
      });
    }

    if (kindParam) {
      pills.push({
        key: `kind:${kindParam}`,
        label: getLabel(KINDS, kindParam) || kindParam,
        onRemove: () => setKind(null),
      });
    }

    if (qParam) {
      pills.push({
        key: `q:${qParam}`,
        label: `Search: ${qParam}`,
        onRemove: () => clearSearch(),
      });
    }

    if (sortParam !== "new") {
      pills.push({
        key: `sort:${sortParam}`,
        label:
          sortParam === "price-asc"
            ? "Price: Low to High"
            : sortParam === "price-desc"
            ? "Price: High to Low"
            : "Newest",
        onRemove: () => resetSortOnly(),
      });
    }

    if (minParam != null || maxParam != null) {
      pills.push({
        key: "price-range",
        label: `GHS ${minParam ?? 0} - ${maxParam ?? "∞"}`,
        onRemove: () => resetPriceOnly(),
      });
    }

    if (stockParam) {
      pills.push({
        key: "stock",
        label: "In stock",
        onRemove: () => toggleStock(false),
      });
    }

    if (featuredParam) {
      pills.push({
        key: "featured",
        label: "Featured",
        onRemove: () => toggleFeatured(false),
      });
    }

    return pills;
  }, [
    shopParam,
    slotParam,
    deptParam,
    kindParam,
    qParam,
    sortParam,
    minParam,
    maxParam,
    stockParam,
    featuredParam,
  ]);

  const filter = useMemo(() => {
    return {
      dept: deptParam || null,
      kind: kindParam || null,
      shop: shopParam || null,
      slot: slotParam || null,
      q: qParam || "",
      priceMin: minParam != null && !Number.isNaN(minParam) ? minParam : null,
      priceMax: maxParam != null && !Number.isNaN(maxParam) ? maxParam : null,
      inStockOnly: stockParam,
      featuredOnly: featuredParam,
      sort: sortParam,
    };
  }, [
    deptParam,
    kindParam,
    shopParam,
    slotParam,
    qParam,
    minParam,
    maxParam,
    stockParam,
    featuredParam,
    sortParam,
  ]);

  return (
    <div className="shop-page">
      {filtersOpen || sortOpen ? (
        <button
          type="button"
          className="shop-panel-overlay"
          aria-label="Close panel"
          onClick={closePanels}
        />
      ) : null}

      <div className="shop-topbar">
        <div className="shop-top-spacer" />
        <div className="shop-top-title-wrap">
          <h1 className="shop-title">{title}</h1>
        </div>
        <div className="shop-top-spacer" />
      </div>

      <div className="shop-quick-store-bar">
        <div className="shop-quick-store-head">
          <span className="shop-quick-store-label">Browse by store</span>
          {shopParam ? (
            <button
              type="button"
              className="shop-quick-store-clear"
              onClick={() => setShop(null)}
            >
              Show all
            </button>
          ) : null}
        </div>

        <div className="shop-quick-store-row">
          <button
            type="button"
            className={!shopParam ? "shop-store-chip active" : "shop-store-chip"}
            onClick={() => setShop(null)}
          >
            All stores
          </button>

          {SHOP_FILTER_OPTIONS.map((shop) => (
            <button
              key={shop.key}
              type="button"
              className={
                shopParam === shop.key
                  ? "shop-store-chip active"
                  : "shop-store-chip"
              }
              onClick={() => setShop(shop.key)}
            >
              {shop.label}
            </button>
          ))}
        </div>
      </div>

      <div className="shop-quick-store-bar">
        <div className="shop-quick-store-head">
          <span className="shop-quick-store-label">Browse by category</span>
          {slotParam ? (
            <button
              type="button"
              className="shop-quick-store-clear"
              onClick={() => setSlot(null)}
            >
              Show all
            </button>
          ) : null}
        </div>

        <div className="shop-quick-store-row">
          <button
            type="button"
            className={!slotParam ? "shop-store-chip active" : "shop-store-chip"}
            onClick={() => setSlot(null)}
          >
            All categories
          </button>

          {HOME_SLOT_OPTIONS.map((slot) => (
            <button
              key={slot.key}
              type="button"
              className={
                slotParam === slot.key
                  ? "shop-store-chip active"
                  : "shop-store-chip"
              }
              onClick={() => setSlot(slot.key)}
            >
              {slot.label}
            </button>
          ))}
        </div>
      </div>

      {activePills.length ? (
        <div className="shop-active-pills-wrap">
          <div className="shop-active-pills">
            {activePills.map((pill) => (
              <button
                key={pill.key}
                type="button"
                className="shop-active-pill"
                onClick={pill.onRemove}
                aria-label={`Remove ${pill.label}`}
              >
                <span>{pill.label}</span>
                <span className="shop-active-pill-x">×</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="shop-active-clearall"
            onClick={clearAll}
          >
            Clear all
          </button>
        </div>
      ) : null}

      <div
        className={`shop-panel shop-panel--filters ${filtersOpen ? "open" : ""}`}
        aria-hidden={!filtersOpen}
      >
        <div className="shop-panel-inner">
          <div className="shop-panel-head">
            <span className="shop-panel-title">Filters</span>

            <div className="shop-panel-head-actions">
              {hasActiveFilters || hasActiveSort ? (
                <button
                  type="button"
                  className="shop-panel-action"
                  onClick={clearAll}
                >
                  Clear all
                </button>
              ) : null}

              {hasActiveFilters ? (
                <button
                  type="button"
                  className="shop-panel-action"
                  onClick={clearFilterPanel}
                >
                  Clear
                </button>
              ) : null}

              <button
                type="button"
                className="shop-panel-action"
                onClick={() => setFiltersOpen(false)}
              >
                Close
              </button>
            </div>
          </div>

          <div className="shop-panel-scroll">
            <div className="shop-panel-section">
              <div className="shop-panel-label">Shop</div>
              <div className="shop-chips">
                <button
                  type="button"
                  className={!shopParam ? "chip active" : "chip"}
                  onClick={() => setShop(null)}
                >
                  All shops
                </button>

                {SHOP_FILTER_OPTIONS.map((shop) => (
                  <button
                    key={shop.key}
                    type="button"
                    className={shopParam === shop.key ? "chip active" : "chip"}
                    onClick={() => setShop(shop.key)}
                  >
                    {shop.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="shop-panel-section">
              <div className="shop-panel-label">Category</div>
              <div className="shop-chips">
                <button
                  type="button"
                  className={!slotParam ? "chip active" : "chip"}
                  onClick={() => setSlot(null)}
                >
                  All categories
                </button>

                {HOME_SLOT_OPTIONS.map((slot) => (
                  <button
                    key={slot.key}
                    type="button"
                    className={slotParam === slot.key ? "chip active" : "chip"}
                    onClick={() => setSlot(slot.key)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
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

                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept.key}
                    type="button"
                    className={deptParam === dept.key ? "chip active" : "chip"}
                    onClick={() => setDept(dept.key)}
                  >
                    {dept.label}
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

                {KINDS.map((kind) => (
                  <button
                    key={kind.key}
                    type="button"
                    className={kindParam === kind.key ? "chip active" : "chip"}
                    onClick={() => setKind(kind.key)}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`shop-panel shop-panel--sort ${sortOpen ? "open" : ""}`}
        aria-hidden={!sortOpen}
      >
        <div className="shop-panel-inner">
          <div className="shop-panel-head">
            <span className="shop-panel-title">Sort & Price</span>

            <div className="shop-panel-head-actions">
              {hasActiveSort ? (
                <button
                  type="button"
                  className="shop-panel-action"
                  onClick={clearSortPanel}
                >
                  Reset
                </button>
              ) : null}

              <button
                type="button"
                className="shop-panel-action"
                onClick={() => setSortOpen(false)}
              >
                Close
              </button>
            </div>
          </div>

          <div className="shop-panel-scroll">
            <div className="shop-panel-section">
              <div className="shop-panel-label">Sort</div>

              <div className="shop-radio">
                <label className="shop-radio-item">
                  <input
                    type="radio"
                    name="sort"
                    checked={draft.sort === "new"}
                    onChange={() => setDraft((prev) => ({ ...prev, sort: "new" }))}
                  />
                  Dynamic
                </label>

                <label className="shop-radio-item">
                  <input
                    type="radio"
                    name="sort"
                    checked={draft.sort === "price-asc"}
                    onChange={() =>
                      setDraft((prev) => ({ ...prev, sort: "price-asc" }))
                    }
                  />
                  Price: Low to High
                </label>

                <label className="shop-radio-item">
                  <input
                    type="radio"
                    name="sort"
                    checked={draft.sort === "price-desc"}
                    onChange={() =>
                      setDraft((prev) => ({ ...prev, sort: "price-desc" }))
                    }
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
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, min: e.target.value }))
                  }
                />
                <span className="shop-range-dash">—</span>
                <input
                  inputMode="numeric"
                  placeholder="Max"
                  value={draft.max}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, max: e.target.value }))
                  }
                />
              </div>

              <label className="shop-toggle">
                <input
                  type="checkbox"
                  checked={draft.stock}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, stock: e.target.checked }))
                  }
                />
                In stock only
              </label>

              <label className="shop-toggle">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, featured: e.target.checked }))
                  }
                />
                Featured only
              </label>
            </div>
          </div>

          <div className="shop-panel-actions">
            <button
              type="button"
              className="shop-btn ghost"
              onClick={() => setSortOpen(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="shop-btn solid"
              onClick={applySort}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="shop-controls">
        <button
          className="shop-control-btn"
          type="button"
          onClick={() => {
            setFiltersOpen((open) => !open);
            setSortOpen(false);
          }}
          aria-expanded={filtersOpen}
        >
          <span className="shop-control-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              className="shop-svg"
              xmlns="http://www.w3.org/2000/svg"
            >
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
            <svg
              viewBox="0 0 24 24"
              className="shop-svg"
              xmlns="http://www.w3.org/2000/svg"
            >
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
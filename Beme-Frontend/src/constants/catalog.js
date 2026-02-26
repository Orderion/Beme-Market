// src/constants/catalog.js

export const DEPARTMENTS = [
  { key: "men", label: "Men" },
  { key: "women", label: "Women" },
  { key: "kids", label: "Kids" },
  { key: "accessories", label: "Accessories" },
];

// Use "extras" instead of "accessories" to avoid name collision with dept=accessories
export const KINDS = [
  { key: "fashion", label: "Fashion" },
  { key: "tech", label: "Tech" },
  { key: "extras", label: "Other" },
];

// Defaults for better UX when user clicks top-level menu
export const DEFAULT_KIND_BY_DEPT = {
  men: "fashion",
  women: "fashion",
  kids: "fashion",
  accessories: "tech",
};

export function normalizeDept(raw) {
  const v = String(raw || "").toLowerCase();
  return DEPARTMENTS.some((d) => d.key === v) ? v : null;
}

export function normalizeKind(raw) {
  const v = String(raw || "").toLowerCase();
  return KINDS.some((k) => k.key === v) ? v : null;
}
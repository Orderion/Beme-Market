export const DEPARTMENTS = [
  { key: "men", label: "Men" },
  { key: "women", label: "Women" },
  { key: "kids", label: "Kids" },
  { key: "accessories", label: "Accessories" },
];

export const KINDS = [
  { key: "fashion", label: "Fashion" },
  { key: "tech", label: "Tech" },
  { key: "extras", label: "Other" },
];

export const SHOPS = [
  { key: "fashion", label: "Fashion Shop" },
  { key: "main", label: "Main Store" },
  { key: "kente", label: "Mintah's Kente" },
  { key: "perfume", label: "Perfume Shop" },
  { key: "tech", label: "Tech Shop" },
];

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

export function normalizeShop(raw) {
  const v = String(raw || "").toLowerCase();
  return SHOPS.some((s) => s.key === v) ? v : null;
}
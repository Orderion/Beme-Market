import BaseAdapter from "./adapters/baseAdapter.js";
import CJAdapter from "./adapters/cjAdapter.js";
import DSersAdapter from "./adapters/dsersAdapter.js";
import CustomAdapter from "./adapters/customAdapter.js";

function safeTrim(value) {
  return String(value ?? "").trim();
}

function normalizeSupplierType(value) {
  return safeTrim(value).toLowerCase();
}

const registry = {
  base: BaseAdapter,
  cj: CJAdapter,
  cjdropshipping: CJAdapter,
  dsers: DSersAdapter,
  aliexpress: DSersAdapter,
  custom: CustomAdapter,
};

export function getSupplierAdapter(type) {
  const normalized = normalizeSupplierType(type);

  if (!normalized) {
    return new BaseAdapter();
  }

  const AdapterClass = registry[normalized] || BaseAdapter;
  return new AdapterClass();
}

export function getSupplierAdapterForOrder(order = {}) {
  const explicitType =
    order?.supplierApiType ||
    order?.supplier?.apiType ||
    order?.supplier?.type ||
    "";

  if (explicitType) {
    return getSupplierAdapter(explicitType);
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  const itemType =
    items.find((item) => safeTrim(item?.supplierApiType))?.supplierApiType || "";

  return getSupplierAdapter(itemType);
}

export function listSupportedSuppliers() {
  return [
    {
      key: "cj",
      aliases: ["cjdropshipping"],
      label: "CJ Dropshipping",
    },
    {
      key: "dsers",
      aliases: ["aliexpress"],
      label: "DSers / AliExpress",
    },
    {
      key: "custom",
      aliases: [],
      label: "Custom Supplier API",
    },
  ];
}
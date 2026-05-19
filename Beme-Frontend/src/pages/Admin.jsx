import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, getDocs,
  orderBy, query, serverTimestamp, updateDoc, writeBatch,
} from "firebase/firestore";
import {
  getAuth, reauthenticateWithCredential, EmailAuthProvider,
} from "firebase/auth";
import { db } from "../firebase";
import { DEPARTMENTS, KINDS, SHOPS, HOME_FILTER_OPTIONS } from "../constants/catalog";
import { useAuth } from "../context/AuthContext";
import { uploadImagesToCloudinary, validateImageFiles } from "../lib/cloudinary";
import "./Admin.css";

const COLLECTION_NAME  = "Products";
const OFFERS_COLLECTION = "WeeklyOffers";
const FLASH_COLLECTION  = "FlashDeals";

const SIDEBAR_TABS = [
  { key: "products", label: "Products" },
  { key: "manual",   label: "Add Product" },
  { key: "csv",      label: "CSV Imports" },
  { key: "offers",   label: "Offers of the Week" },
  { key: "flash",    label: "Flash Deals" },
];

function SidebarIcon({ tabKey }) {
  const icons = {
    products: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    manual: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    csv: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    offers: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
        <line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
      </svg>
    ),
    flash: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  };
  return icons[tabKey] || null;
}

const CSV_IMPORT_TABS = [
  { key: "standard", label: "Standard CSV Imports" },
  { key: "cj",       label: "CJ Imports" },
];

const DURATION_OPTIONS = [
  { label: "1 hour",   value: 1  },
  { label: "3 hours",  value: 3  },
  { label: "6 hours",  value: 6  },
  { label: "12 hours", value: 12 },
  { label: "24 hours", value: 24 },
  { label: "48 hours", value: 48 },
  { label: "72 hours", value: 72 },
];

const STANDARD_IMPORT_REQUIRED_HEADERS = ["title","category","price"];
const STANDARD_IMPORT_ALLOWED_HEADERS = [
  "title","category","brand","price","stock","abroadDeliveryFee",
  "key_features","target_customer","customizations","description",
  "oldPrice","image","images","featured","inStock","shipsFromAbroad",
];
const CJ_IMPORT_REQUIRED_HEADERS = ["product_name","category","price_ghs","stock"];
const CJ_IMPORT_ALLOWED_HEADERS = [
  "product_name","category","brand","price_ghs","stock","abroad_delivery_fee",
  "key_features","target_customer","customization_options","short_description",
  "ships_from_abroad","in_stock","featured","image","images","old_price",
  "product_sku","cj_product_id","variant",
];
const STANDARD_IMPORT_SAMPLE = `product_name,category,brand,price_ghs,stock,abroad_delivery_fee,key_features,target_customer,customization_options,short_description,ships_from_abroad,in_stock,featured
Samsung Galaxy S24,Phone,Samsung,7500,12,45,"8GB RAM, 128GB–256GB storage","Smartphone users","Storage: 128GB(+0)|256GB(+600); Color: Black(+0)|Green(+0)","Samsung Galaxy S24 flagship.",yes,yes,no`;
const CJ_IMPORT_SAMPLE = `product_name,category,brand,price_ghs,stock,abroad_delivery_fee,key_features,target_customer,customization_options,short_description,ships_from_abroad,in_stock,featured,cj_product_id,product_sku,variant,image
iPhone 15 Pro Max,Phone,Apple,13500,5,120,"A17 Pro chip","Premium buyers","Storage: 256GB(+0)|512GB(+1800)","CJ product.",yes,yes,yes,CJ-APPLE-15PM,APL-15PM-256,256GB Brand New,https://example.com/img.jpg`;

const makeOptionValue = () => ({ id: crypto.randomUUID(), label: "", priceBump: "" });
const makeOptionGroup = () => ({
  id: crypto.randomUUID(), name: "", type: "buttons", required: true,
  values: [makeOptionValue(), makeOptionValue()],
});

const initial = {
  name:"", brand:"", price:"", oldPrice:"", description:"",
  dept:"men", kind:"fashion", shop:"fashion", homeSlot:"others",
  inStock:true, featured:false, shipsFromAbroad:false, stock:"", abroadDeliveryFee:"",
  customizations:[],
};
const initialImportMeta = { sourceType:"standard", totalRows:0, validRows:0, skippedRows:0, headerErrors:[], rowErrors:[] };
const initialOfferForm = { title:"", description:"", price:"", oldPrice:"", mediaUrl:"", mediaType:"image", shopChip:"", productId:"", shopKey:"", order:"" };
const initialFlashForm = { title:"", dealPrice:"", originalPrice:"", discountPercent:"", durationHours:"24", productId:"", shopKey:"", image:"", order:"" };

// ── Helper functions (all original) ──────────────────────────────────

function makeEditableValuesFromLegacy(values) {
  const safeValues = Array.isArray(values) ? values : [];
  const mapped = safeValues.map((value) => {
    if (value && typeof value === "object") {
      return { id: value.id || crypto.randomUUID(), label: String(value.label || value.value || "").trim(), priceBump: value.priceBump !== undefined && value.priceBump !== null && value.priceBump !== "" ? String(Number(value.priceBump) || 0) : "" };
    }
    const label = String(value || "").trim();
    if (!label) return null;
    return { id: crypto.randomUUID(), label, priceBump: "" };
  }).filter(Boolean);
  if (mapped.length >= 2) return mapped;
  if (mapped.length === 1) return [...mapped, makeOptionValue()];
  return [makeOptionValue(), makeOptionValue()];
}

function normalizeCustomizationGroups(groups) {
  return groups.map((group) => {
    const normalizedValues = Array.isArray(group.values) ? group.values.map((value) => {
      const label = String(value?.label || "").trim();
      const rawBump = String(value?.priceBump ?? "").trim();
      const priceBump = rawBump === "" ? 0 : Number.isFinite(Number(rawBump)) ? Number(rawBump) : 0;
      if (!label) return null;
      return { id: value?.id || crypto.randomUUID(), label, priceBump };
    }).filter(Boolean) : [];
    return { id: group.id || crypto.randomUUID(), name: String(group.name || "").trim(), type: group.type === "select" ? "select" : "buttons", required: !!group.required, values: normalizedValues };
  }).filter((g) => g.name && g.values.length > 0);
}

function toEditableCustomizationGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map((group, index) => ({
    id: group?.id || `option-${index}-${crypto.randomUUID()}`,
    name: String(group?.name || "").trim(),
    type: group?.type === "select" ? "select" : "buttons",
    required: group?.required !== false,
    values: makeEditableValuesFromLegacy(group?.values),
  }));
}

function formatMoney(value) { return `GHS ${(Number(value) || 0).toFixed(2)}`; }

function titleize(value) {
  return String(value || "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeShopKey(value) { return String(value || "").trim().toLowerCase(); }

function formatShopLabel(value) {
  const key = normalizeShopKey(value);
  const match = SHOPS.find((s) => s.key === key);
  if (match?.label) return match.label;
  return titleize(value);
}

function normalizeAdminProduct(snapshotDoc) {
  const d = snapshotDoc.data() || {};
  const images = Array.isArray(d.images) ? d.images.map((i) => String(i || "").trim()).filter(Boolean) : [];
  const cover = String(d.image || images[0] || "").trim();
  return {
    id: snapshotDoc.id, name: String(d.name || "").trim(), brand: String(d.brand || "").trim(),
    description: String(d.description || "").trim(), price: Number(d.price || 0),
    oldPrice: d.oldPrice !== undefined && d.oldPrice !== null && d.oldPrice !== "" ? Number(d.oldPrice || 0) : null,
    image: cover, images: images.length ? images : cover ? [cover] : [],
    imageMeta: d.imageMeta || null, imageMetaList: Array.isArray(d.imageMetaList) ? d.imageMetaList : [],
    dept: String(d.dept || "").trim().toLowerCase(), kind: String(d.kind || "").trim().toLowerCase(),
    shop: normalizeShopKey(d.shop || "fashion"), homeSlot: String(d.homeSlot || "others").trim().toLowerCase(),
    ownerId: String(d.ownerId || "").trim(), ownerName: String(d.ownerName || d.sellerName || "").trim(),
    ownerEmail: String(d.ownerEmail || "").trim(), featured: !!d.featured, inStock: d.inStock !== false,
    shipsFromAbroad: !!d.shipsFromAbroad,
    stock: d.stock !== undefined && d.stock !== null && d.stock !== "" ? Number(d.stock) : null,
    abroadDeliveryFee: d.abroadDeliveryFee !== undefined && d.abroadDeliveryFee !== null && d.abroadDeliveryFee !== "" ? Number(d.abroadDeliveryFee) : 0,
    customizations: Array.isArray(d.customizations) ? d.customizations : [],
    createdAt: d.createdAt || null, updatedAt: d.updatedAt || null,
  };
}

function normalizeOffer(docSnap) {
  const d = docSnap.data() || {};
  return {
    id: docSnap.id, title: String(d.title || "").trim(), description: String(d.description || "").trim(),
    price: Number(d.price || 0), oldPrice: d.oldPrice ? Number(d.oldPrice) : "",
    mediaUrl: String(d.mediaUrl || d.image || "").trim(), mediaType: String(d.mediaType || "image").trim(),
    shopChip: String(d.shopChip || "").trim(), productId: String(d.productId || "").trim(),
    shopKey: String(d.shopKey || "").trim(), order: Number(d.order || 0), createdAt: d.createdAt || null,
  };
}

function normalizeFlashDeal(docSnap) {
  const d = docSnap.data() || {};
  return {
    id: docSnap.id, title: String(d.title || "").trim(), image: String(d.image || d.mediaUrl || "").trim(),
    dealPrice: Number(d.dealPrice || 0), originalPrice: Number(d.originalPrice || 0),
    discountPercent: Number(d.discountPercent || 0), durationHours: Number(d.durationHours || 24),
    productId: String(d.productId || "").trim(), shopKey: String(d.shopKey || "").trim(),
    order: Number(d.order || 0), endsAt: d.endsAt || null, createdAt: d.createdAt || null,
  };
}

function getFileKey(file) { return `${file.name}-${file.size}-${file.lastModified}`; }
function sortByCreatedAtDesc(rows) {
  return [...rows].sort((a, b) => {
    const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bt - at;
  });
}
function getEmailName(email) { return titleize(String(email || "").trim().split("@")[0] || ""); }

function resolveCurrentSellerName(user, profile) {
  const direct = [profile?.sellerName, profile?.displayName, profile?.fullName, profile?.name, profile?.username, profile?.shopAdminName, profile?.ownerName];
  for (const c of direct) { const v = String(c || "").trim(); if (v) return v; }
  const fn = String(profile?.firstName || "").trim();
  const ln = String(profile?.lastName || "").trim();
  const joined = `${fn} ${ln}`.trim();
  if (joined) return joined;
  if (profile?.email) { const en = getEmailName(profile.email); if (en) return en; }
  if (user?.displayName) { const dn = String(user.displayName || "").trim(); if (dn) return dn; }
  if (user?.email) { const en = getEmailName(user.email); if (en) return en; }
  return "Beme Seller";
}

function parseCsvLine(line) {
  const result = []; let current = ""; let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i]; const next = line[i + 1];
    if (char === '"') { if (insideQuotes && next === '"') { current += '"'; i++; } else { insideQuotes = !insideQuotes; } }
    else if (char === "," && !insideQuotes) { result.push(current.trim()); current = ""; }
    else { current += char; }
  }
  result.push(current.trim()); return result;
}

function normalizeImportHeader(header) {
  const key = String(header || "").trim().toLowerCase();
  const map = { title:"title", name:"title", product_name:"title", product:"title", category:"category", brand:"brand", price:"price", price_ghs:"price", priceghs:"price", stock:"stock", quantity:"stock", abroad_delivery_fee:"abroadDeliveryFee", abroaddeliveryfee:"abroadDeliveryFee", delivery_fee_abroad:"abroadDeliveryFee", description:"description", short_description:"description", shortdescription:"description", key_features:"key_features", keyfeatures:"key_features", target_customer:"target_customer", targetcustomer:"target_customer", customization_options:"customizations", customizations:"customizations", oldprice:"oldPrice", old_price:"oldPrice", image:"image", imageurl:"image", image_url:"image", images:"images", featured:"featured", instock:"inStock", in_stock:"inStock", ships_from_abroad:"shipsFromAbroad", shipsfromabroad:"shipsFromAbroad", imported:"shipsFromAbroad", cj_product_id:"cj_product_id", product_sku:"product_sku", sku:"product_sku", variant:"variant" };
  return map[key] || key;
}

function rawHeaderKey(header) { return String(header || "").trim().toLowerCase().replace(/\s+/g, "_"); }

function getCsvHeaders(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const firstLine = raw.split(/\r?\n/).find((l) => String(l).trim());
  if (!firstLine) return [];
  return parseCsvLine(firstLine).map((h) => String(h || "").trim());
}

function parseCsvText(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => normalizeImportHeader(h));
  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const row = { __rowNumber: rowIndex + 2 };
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    return row;
  });
}

function parseBooleanish(value, fallback = false) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["true","yes","1","in stock","instock","imported","abroad"].includes(raw)) return true;
  if (["false","no","0","out of stock","outofstock","local"].includes(raw)) return false;
  return fallback;
}

function parseNumberish(value, fallback = 0) {
  const cleaned = String(value || "").replace(/[^\d.-]/g, "").trim();
  if (!cleaned) return fallback;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function parseOptionValueToken(token, fallbackIndex = 0) {
  const raw = String(token || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(.*?)\s*\(\s*([+-]?\d+(?:\.\d+)?)\s*\)\s*$/);
  if (match) return { id: `bulk-option-value-${fallbackIndex}-${crypto.randomUUID()}`, label: String(match[1] || "").trim(), priceBump: Number(match[2] || 0) };
  return { id: `bulk-option-value-${fallbackIndex}-${crypto.randomUUID()}`, label: raw, priceBump: 0 };
}

function parseCustomizationsFromText(input) {
  const raw = String(input || "").trim();
  if (!raw) return [];
  return raw.split(";").map((groupText, index) => {
    const [namePart, valuesPart] = groupText.split(":");
    const name = String(namePart || "").trim();
    const values = String(valuesPart || "").split("|").map((v, vi) => parseOptionValueToken(v, index * 100 + vi)).filter(Boolean);
    if (!name || values.length < 1) return null;
    return { id: `bulk-option-${index}-${crypto.randomUUID()}`, name, type: "buttons", required: true, values };
  }).filter(Boolean);
}

function parseImageList(row) {
  const image = String(row.image || row.imageUrl || "").trim();
  const imagesRaw = String(row.images || "").trim();
  const images = imagesRaw ? imagesRaw.split("|").map((i) => i.trim()).filter(Boolean) : [];
  if (image && !images.includes(image)) images.unshift(image);
  return images;
}

function findShopByKeyword(shops, keywords = []) {
  return shops.find((s) => { const key = String(s.key || "").toLowerCase(); const label = String(s.label || "").toLowerCase(); return keywords.some((w) => key.includes(w) || label.includes(w)); })?.key || "";
}

function inferShopFromCategory(category, shops, fallbackShop) {
  const raw = String(category || "").trim().toLowerCase();
  if (["iphones","phone","phones","laptop","laptops","gaming","accessory","accessories","tablet","tv","electronics","technology"].includes(raw)) return findShopByKeyword(shops, ["tech","technology","electronics"]) || fallbackShop;
  if (["perfume","perfumes","fragrance","fragrances"].includes(raw)) return findShopByKeyword(shops, ["perfume","fragrance"]) || fallbackShop;
  if (["fashion","clothing","dress","shirt","hoodie","shoes","bag"].includes(raw)) return findShopByKeyword(shops, ["fashion","cloth"]) || fallbackShop;
  return fallbackShop;
}

function buildImportDescription(row) {
  const direct = String(row.description || "").trim();
  if (direct) return direct;
  return [String(row.key_features || "").trim(), String(row.target_customer || "").trim()].filter(Boolean).join(". ");
}

function findValidKind(category, kindOptions, fallback) {
  const raw = String(category || "").trim().toLowerCase();
  const preferred = [raw, ["iphones","phone","phones","laptop","laptops","gaming","accessory","accessories","tablet","electronics","technology"].includes(raw) ? "technology" : "", ["perfume","perfumes","fragrance","fragrances"].includes(raw) ? "perfumes" : "", ["fashion","clothing","dress","shirt","hoodie","shoes","bag"].includes(raw) ? "fashion" : ""].filter(Boolean);
  return preferred.find((i) => kindOptions.includes(i)) || fallback || kindOptions[0] || "fashion";
}

function findValidDept(category, deptOptions, fallback) {
  const raw = String(category || "").trim().toLowerCase();
  const preferred = [raw === "men" ? "men" : "", raw === "women" ? "women" : "", raw === "unisex" ? "unisex" : "", "unisex"].filter(Boolean);
  return preferred.find((i) => deptOptions.includes(i)) || fallback || deptOptions[0] || "men";
}

function productMatchesSearch(product, term) {
  const q = String(term || "").trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.brand, product.description, product.shop, product.ownerName, product.ownerEmail, product.kind, product.dept, product.inStock ? "in stock" : "out of stock", product.featured ? "featured" : "", product.shipsFromAbroad ? "ships from abroad imported" : "local"].filter(Boolean).join(" ").toLowerCase().includes(q);
}

function importRowMatchesSearch(row, term) {
  const q = String(term || "").trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.brand, row.description, row.shop, row.kind, row.dept, row.inStock ? "in stock" : "out of stock", row.featured ? "featured" : "", row.shipsFromAbroad ? "ships from abroad imported" : "local"].filter(Boolean).join(" ").toLowerCase().includes(q);
}

function getHeaderValidation(sourceType, headers) {
  const normalizedHeaders = sourceType === "cj" ? headers.map((h) => rawHeaderKey(h)) : headers.map((h) => normalizeImportHeader(h));
  const requiredHeaders = sourceType === "cj" ? CJ_IMPORT_REQUIRED_HEADERS : STANDARD_IMPORT_REQUIRED_HEADERS;
  const allowedHeaders = sourceType === "cj" ? CJ_IMPORT_ALLOWED_HEADERS : STANDARD_IMPORT_ALLOWED_HEADERS;
  const missingRequired = requiredHeaders.filter((h) => !normalizedHeaders.includes(h));
  const unsupportedHeaders = normalizedHeaders.filter((h) => !allowedHeaders.includes(h));
  return { normalizedHeaders, missingRequired, unsupportedHeaders, isValid: !missingRequired.length && !unsupportedHeaders.length };
}

function validateStandardImportRows(rows) {
  const rowErrors = [];
  rows.forEach((row) => {
    const rn = row.__rowNumber || "?";
    if (!String(row.title || "").trim()) rowErrors.push(`Row ${rn}: product name is required.`);
    if (!String(row.category || "").trim()) rowErrors.push(`Row ${rn}: category is required.`);
    const rawPrice = String(row.price || "").trim();
    if (!rawPrice) rowErrors.push(`Row ${rn}: price is required.`);
    else if (!Number.isFinite(parseNumberish(rawPrice, NaN))) rowErrors.push(`Row ${rn}: price format is invalid.`);
  });
  return rowErrors;
}

function validateCjImportRows(rows) {
  const rowErrors = [];
  rows.forEach((row) => {
    const rn = row.__rowNumber || "?";
    if (!String(row.product_name || row.title || "").trim()) rowErrors.push(`Row ${rn}: CJ product_name is required.`);
    if (!String(row.category || "").trim()) rowErrors.push(`Row ${rn}: CJ category is required.`);
    const rawPrice = String(row.price_ghs || "").trim();
    if (!rawPrice) rowErrors.push(`Row ${rn}: CJ price_ghs is required.`);
    else if (!Number.isFinite(parseNumberish(rawPrice, NaN))) rowErrors.push(`Row ${rn}: CJ price_ghs format is invalid.`);
    const rawStock = String(row.stock || "").trim();
    if (!rawStock) rowErrors.push(`Row ${rn}: CJ stock is required.`);
    else if (!Number.isFinite(parseNumberish(rawStock, NaN))) rowErrors.push(`Row ${rn}: CJ stock format is invalid.`);
  });
  return rowErrors;
}

function getEndsAtMillis(deal) {
  if (!deal.endsAt) return null;
  if (deal.endsAt?.toMillis) return deal.endsAt.toMillis();
  return Number(deal.endsAt);
}

function formatCountdown(endsAtMs) {
  if (!endsAtMs) return null;
  const diff = endsAtMs - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function calcAutoDiscount(original, deal) {
  const o = Number(original); const d = Number(deal);
  if (!o || !d || d >= o) return "";
  return String(Math.round(((o - d) / o) * 100));
}

// ── Sub-components ────────────────────────────────────────────────────

function StatusFlags({ inStock, featured, shipsFromAbroad }) {
  return (
    <div className="admin-product-flags">
      <span className={`admin-flag ${inStock ? "admin-flag--success" : "admin-flag--danger"}`}>{inStock ? "In stock" : "Out of stock"}</span>
      {featured && <span className="admin-flag admin-flag--featured">Featured</span>}
      {shipsFromAbroad && <span className="admin-flag admin-flag--imported">Ships from abroad</span>}
    </div>
  );
}

function ProductImagePreview({ image, images, name, emptyLabel = "No image", compact = false }) {
  const safeImages = Array.isArray(images) ? images.map((i) => String(i || "").trim()).filter(Boolean) : [];
  const cover = String(image || safeImages[0] || "").trim();
  if (!cover) return <div className={`admin-product-image admin-product-image--empty${compact ? " admin-product-image--compact" : ""}`}>{emptyLabel}</div>;
  return (
    <div className="admin-product-cover-wrap">
      <img src={cover} alt={name} className="admin-product-image" />
      {safeImages.length > 1 && <span className="admin-product-gallery-badge">+{safeImages.length - 1} more</span>}
    </div>
  );
}

function OptionValuesEditor({ values, onChange, onAdd, onRemove, compact = false }) {
  return (
    <div className={`admin-option-values${compact ? " admin-option-values--compact" : ""}`}>
      {values.map((value, index) => (
        <div className="admin-option-value-row" key={value.id}>
          <label className="admin-field">
            <span>Option value {index + 1}</span>
            <input value={value.label} onChange={(e) => onChange(value.id, "label", e.target.value)} placeholder="e.g. 256GB" />
          </label>
          <label className="admin-field">
            <span>Price bump (GHS)</span>
            <input value={value.priceBump} onChange={(e) => onChange(value.id, "priceBump", e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
          <button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={() => onRemove(value.id)} disabled={values.length <= 1}>Remove</button>
        </div>
      ))}
      <button type="button" className="admin-secondary-btn" onClick={onAdd}>+ Add value</button>
    </div>
  );
}

// ── FlashDealsManager ─────────────────────────────────────────────────

function FlashDealsManager() {
  const [deals, setDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [flashForm, setFlashForm] = useState(initialFlashForm);
  const [flashMsg, setFlashMsg] = useState("");
  const [flashSubmitting, setFlashSubmitting] = useState(false);
  const [editingFlash, setEditingFlash] = useState(null);
  const [deletingFlashId, setDeletingFlashId] = useState("");
  const [flashImageFile, setFlashImageFile] = useState(null);
  const [flashImagePreview, setFlashImagePreview] = useState("");
  const [flashUploading, setFlashUploading] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  const loadDeals = async () => {
    setLoadingDeals(true);
    try {
      const snap = await getDocs(query(collection(db, FLASH_COLLECTION), orderBy("order", "asc")));
      setDeals(snap.docs.map(normalizeFlashDeal));
    } catch {
      try { const fb = await getDocs(collection(db, FLASH_COLLECTION)); setDeals(fb.docs.map(normalizeFlashDeal).sort((a,b) => a.order-b.order)); }
      catch (err) { console.error("Load flash deals error:", err); setDeals([]); }
    } finally { setLoadingDeals(false); }
  };
  useEffect(() => { loadDeals(); }, []);

  const setFlashField = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFlashForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "dealPrice" || key === "originalPrice") {
        const orig = key === "originalPrice" ? value : prev.originalPrice;
        const deal = key === "dealPrice" ? value : prev.dealPrice;
        const auto = calcAutoDiscount(orig, deal);
        if (auto !== "") next.discountPercent = auto;
      }
      return next;
    });
  };

  const handleFlashImageChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setFlashImageFile(file); setFlashImagePreview(URL.createObjectURL(file)); e.target.value = "";
  };

  const handleFlashImageUpload = async () => {
    if (!flashImageFile) { setFlashMsg("❌ Please choose an image first."); return null; }
    setFlashUploading(true); setFlashMsg("");
    try {
      validateImageFiles([flashImageFile]);
      const results = await uploadImagesToCloudinary([flashImageFile]);
      const url = results[0]?.url || "";
      if (!url) throw new Error("Image upload failed.");
      setFlashForm((prev) => ({ ...prev, image: url }));
      setFlashMsg("✅ Image uploaded successfully."); return url;
    } catch (err) { setFlashMsg(`❌ ${err.message || "Upload failed."}`); return null; }
    finally { setFlashUploading(false); }
  };

  const validateFlashForm = () => {
    if (!flashForm.title.trim()) return "Title is required.";
    if (!flashForm.dealPrice || isNaN(Number(flashForm.dealPrice))) return "Valid deal price is required.";
    if (!flashForm.originalPrice || isNaN(Number(flashForm.originalPrice))) return "Valid original price is required.";
    if (Number(flashForm.dealPrice) >= Number(flashForm.originalPrice)) return "Deal price must be lower than original price.";
    if (!flashForm.durationHours) return "Duration is required.";
    return "";
  };

  const buildFlashPayload = async (isEdit = false) => {
    let image = flashForm.image.trim();
    if (!image && flashImageFile) { image = await handleFlashImageUpload(); if (!image) return null; }
    const durationHours = Number(flashForm.durationHours) || 24;
    const endsAt = isEdit && editingFlash?.endsAt && Number(flashForm.durationHours) === editingFlash.durationHours ? editingFlash.endsAt : new Date(Date.now() + durationHours * 3600000);
    const discount = flashForm.discountPercent ? Number(flashForm.discountPercent) : calcAutoDiscount(flashForm.originalPrice, flashForm.dealPrice) ? Number(calcAutoDiscount(flashForm.originalPrice, flashForm.dealPrice)) : 0;
    return { title: flashForm.title.trim(), dealPrice: Number(flashForm.dealPrice), originalPrice: Number(flashForm.originalPrice), discountPercent: discount, durationHours, endsAt, image, productId: flashForm.productId.trim(), shopKey: flashForm.shopKey.trim(), order: flashForm.order !== "" ? Number(flashForm.order) : deals.length };
  };

  const handleAddFlashDeal = async () => {
    const err = validateFlashForm(); if (err) { setFlashMsg(`❌ ${err}`); return; }
    setFlashSubmitting(true); setFlashMsg("");
    try {
      const payload = await buildFlashPayload(false); if (!payload) { setFlashSubmitting(false); return; }
      await addDoc(collection(db, FLASH_COLLECTION), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setFlashMsg("✅ Flash deal added successfully."); setFlashForm(initialFlashForm); setFlashImageFile(null); setFlashImagePreview(""); await loadDeals();
    } catch (err) { setFlashMsg(`❌ ${err.message || "Failed to add flash deal."}`); }
    finally { setFlashSubmitting(false); }
  };

  const handleUpdateFlashDeal = async () => {
    if (!editingFlash?.id) return;
    const err = validateFlashForm(); if (err) { setFlashMsg(`❌ ${err}`); return; }
    setFlashSubmitting(true); setFlashMsg("");
    try {
      const payload = await buildFlashPayload(true); if (!payload) { setFlashSubmitting(false); return; }
      await updateDoc(doc(db, FLASH_COLLECTION, editingFlash.id), { ...payload, updatedAt: serverTimestamp() });
      setFlashMsg("✅ Flash deal updated."); setEditingFlash(null); setFlashForm(initialFlashForm); setFlashImageFile(null); setFlashImagePreview(""); await loadDeals();
    } catch (err) { setFlashMsg(`❌ ${err.message || "Failed to update flash deal."}`); }
    finally { setFlashSubmitting(false); }
  };

  const handleDeleteFlashDeal = async (dealId) => {
    setDeletingFlashId(dealId);
    try { await deleteDoc(doc(db, FLASH_COLLECTION, dealId)); setDeals((prev) => prev.filter((d) => d.id !== dealId)); }
    catch (err) { setFlashMsg(`❌ ${err.message || "Failed to delete flash deal."}`); }
    finally { setDeletingFlashId(""); }
  };

  const startEditFlashDeal = (deal) => {
    setEditingFlash(deal);
    setFlashForm({ title: deal.title, dealPrice: String(deal.dealPrice), originalPrice: String(deal.originalPrice), discountPercent: String(deal.discountPercent), durationHours: String(deal.durationHours), productId: deal.productId, shopKey: deal.shopKey, image: deal.image, order: String(deal.order) });
    setFlashImageFile(null); setFlashImagePreview(""); setFlashMsg(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelFlashEdit = () => { setEditingFlash(null); setFlashForm(initialFlashForm); setFlashImageFile(null); setFlashImagePreview(""); setFlashMsg(""); };

  const activeDeals = deals.filter((d) => { const ms = getEndsAtMillis(d); return !ms || ms > Date.now(); });
  const expiredDeals = deals.filter((d) => { const ms = getEndsAtMillis(d); return ms && ms <= Date.now(); });

  return (
    <div className="admin-offers-shell">
      <div className="admin-upload-card">
        <div className="admin-upload-head">
          <div>
            <h3 className="admin-upload-title">{editingFlash ? "Edit Flash Deal" : "Add Flash Deal"}</h3>
            <p className="admin-upload-sub">Set a deal price, original price, and duration. Timer starts when you save.</p>
          </div>
          {editingFlash && <button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={cancelFlashEdit}>Cancel edit</button>}
        </div>
        <div className="admin-form admin-form--compact">
          <label className="admin-field"><span>Title *</span><input value={flashForm.title} onChange={setFlashField("title")} placeholder="e.g. Nike Air Force 1 Flash Sale" autoComplete="off" /></label>
          <div className="admin-row">
            <label className="admin-field"><span>Deal price (GHS) *</span><input value={flashForm.dealPrice} onChange={setFlashField("dealPrice")} inputMode="decimal" placeholder="e.g. 350" /></label>
            <label className="admin-field"><span>Original price (GHS) *</span><input value={flashForm.originalPrice} onChange={setFlashField("originalPrice")} inputMode="decimal" placeholder="e.g. 500" /></label>
          </div>
          <div className="admin-row">
            <label className="admin-field"><span>Discount % (auto-calculated)</span><input value={flashForm.discountPercent} onChange={setFlashField("discountPercent")} inputMode="numeric" placeholder="e.g. 30" /></label>
            <label className="admin-field"><span>Deal duration *</span><select value={flashForm.durationHours} onChange={setFlashField("durationHours")}>{DURATION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
          </div>
          <div className="admin-row">
            <label className="admin-field"><span>Product ID (links to /product/:id)</span><input value={flashForm.productId} onChange={setFlashField("productId")} placeholder="Firestore product doc ID" autoComplete="off" /></label>
            <label className="admin-field"><span>Shop key (fallback link)</span><input value={flashForm.shopKey} onChange={setFlashField("shopKey")} placeholder="e.g. tech" autoComplete="off" /></label>
          </div>
          <label className="admin-field"><span>Display order</span><input value={flashForm.order} onChange={setFlashField("order")} inputMode="numeric" placeholder="e.g. 1" /></label>
          <div className="admin-upload-card" style={{ marginTop: 0 }}>
            <div className="admin-upload-head"><div><h4 className="admin-upload-title">Product image</h4><p className="admin-upload-sub">Upload or paste a Cloudinary URL.</p></div></div>
            <label className="admin-field"><span>Choose image file</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFlashImageChange} /></label>
            {flashImagePreview && <div className="admin-offer-media-preview"><img src={flashImagePreview} alt="Preview" className="admin-offer-media-thumb" /></div>}
            <div className="admin-upload-actions"><button type="button" className="admin-secondary-btn" onClick={handleFlashImageUpload} disabled={!flashImageFile || flashUploading}>{flashUploading ? "Uploading…" : "Upload to Cloudinary"}</button></div>
            <label className="admin-field" style={{ marginTop: 10 }}><span>Or paste image URL directly</span><input value={flashForm.image} onChange={setFlashField("image")} placeholder="https://res.cloudinary.com/..." autoComplete="off" /></label>
          </div>
        </div>
        {flashMsg && <div className="admin-msg" style={{ marginTop: 12 }}>{flashMsg}</div>}
        <div className="admin-upload-actions" style={{ marginTop: 14 }}>
          <button type="button" className="admin-btn" onClick={editingFlash ? handleUpdateFlashDeal : handleAddFlashDeal} disabled={flashSubmitting}>
            {flashSubmitting ? (editingFlash ? "Updating…" : "Adding…") : (editingFlash ? "Update flash deal" : "Add flash deal")}
          </button>
        </div>
      </div>
      <div className="admin-card admin-card--nested" style={{ maxWidth:"100%", marginTop:20 }}>
        <div className="admin-head"><h3 className="admin-title admin-title--small">Active Flash Deals ({activeDeals.length})</h3><p className="admin-sub">These appear on the homepage banner and /flash-deals page.</p></div>
        {loadingDeals ? <div className="admin-products-empty">Loading flash deals…</div> : activeDeals.length === 0 ? <div className="admin-products-empty">No active flash deals.</div> : (
          <div className="admin-offers-list">
            {activeDeals.map((deal) => {
              const endsAtMs = getEndsAtMillis(deal);
              const countdown = formatCountdown(endsAtMs);
              const discount = deal.discountPercent ? deal.discountPercent : deal.originalPrice > deal.dealPrice ? Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100) : 0;
              return (
                <div key={deal.id} className="admin-offer-item">
                  <div className="admin-offer-media-wrap">
                    {deal.image ? <img src={deal.image} alt={deal.title} className="admin-offer-thumb" /> : <div className="admin-offer-thumb admin-offer-thumb--empty">No image</div>}
                    {discount > 0 && <span className="admin-offer-type-badge">-{discount}%</span>}
                  </div>
                  <div className="admin-offer-content">
                    <div className="admin-offer-top">
                      <div><h4 className="admin-offer-title">{deal.title}</h4><div className="admin-offer-meta">{deal.productId && <span>Product: {deal.productId.slice(0,10)}…</span>}{deal.shopKey && <span>Shop: {deal.shopKey}</span>}<span>Order: {deal.order}</span><span>{deal.durationHours}h deal</span></div></div>
                      <div className="admin-product-price">{formatMoney(deal.dealPrice)}<span className="admin-offer-old-price"> / was {formatMoney(deal.originalPrice)}</span></div>
                    </div>
                    {countdown && countdown !== "Expired" && <div className="admin-flash-countdown"><span className="admin-flash-countdown-dot" /><span className="admin-flash-countdown-text">Ends in {countdown}</span></div>}
                    <div className="admin-product-actions">
                      <button type="button" className="admin-secondary-btn" onClick={() => startEditFlashDeal(deal)}>Edit deal</button>
                      <button type="button" className="admin-danger-btn" onClick={() => handleDeleteFlashDeal(deal.id)} disabled={deletingFlashId === deal.id}>{deletingFlashId === deal.id ? "Deleting…" : "Delete"}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {expiredDeals.length > 0 && (
        <div className="admin-card admin-card--nested" style={{ maxWidth:"100%", marginTop:16 }}>
          <div className="admin-head"><h3 className="admin-title admin-title--small">Expired Deals ({expiredDeals.length})</h3><p className="admin-sub">Delete them to clean up.</p></div>
          <div className="admin-offers-list">
            {expiredDeals.map((deal) => (
              <div key={deal.id} className="admin-offer-item" style={{ opacity: 0.7 }}>
                <div className="admin-offer-media-wrap">
                  {deal.image ? <img src={deal.image} alt={deal.title} className="admin-offer-thumb" /> : <div className="admin-offer-thumb admin-offer-thumb--empty">No image</div>}
                  <span className="admin-offer-type-badge">Expired</span>
                </div>
                <div className="admin-offer-content">
                  <div className="admin-offer-top"><div><h4 className="admin-offer-title">{deal.title}</h4><div className="admin-offer-meta">{deal.productId && <span>Product: {deal.productId.slice(0,10)}…</span>}{deal.shopKey && <span>Shop: {deal.shopKey}</span>}</div></div><div className="admin-product-price">{formatMoney(deal.dealPrice)}</div></div>
                  <div className="admin-product-actions">
                    <button type="button" className="admin-secondary-btn" onClick={() => startEditFlashDeal(deal)}>Edit &amp; relaunch</button>
                    <button type="button" className="admin-danger-btn" onClick={() => handleDeleteFlashDeal(deal.id)} disabled={deletingFlashId === deal.id}>{deletingFlashId === deal.id ? "Deleting…" : "Delete"}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── OffersManager ──────────────────────────────────────────────────────

function OffersManager() {
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offerForm, setOfferForm] = useState(initialOfferForm);
  const [offerMsg, setOfferMsg] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState("");
  const [editingOffer, setEditingOffer] = useState(null);
  const [offerMediaFile, setOfferMediaFile] = useState(null);
  const [offerMediaPreview, setOfferMediaPreview] = useState("");
  const [offerUploading, setOfferUploading] = useState(false);

  const loadOffers = async () => {
    setLoadingOffers(true);
    try { const snap = await getDocs(collection(db, OFFERS_COLLECTION)); setOffers(snap.docs.map(normalizeOffer).sort((a,b)=>a.order-b.order)); }
    catch (err) { console.error("Load offers error:", err); setOffers([]); }
    finally { setLoadingOffers(false); }
  };
  useEffect(() => { loadOffers(); }, []);

  const setOfferField = (key) => (e) => { const value = e.target.type === "checkbox" ? e.target.checked : e.target.value; setOfferForm((prev) => ({ ...prev, [key]: value })); };

  const handleOfferMediaChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setOfferMediaFile(file); setOfferMediaPreview(URL.createObjectURL(file));
    if (file.type.startsWith("video/")) setOfferForm((prev) => ({ ...prev, mediaType: "video" }));
    else setOfferForm((prev) => ({ ...prev, mediaType: "image" }));
    e.target.value = "";
  };

  const handleOfferMediaUpload = async () => {
    if (!offerMediaFile) { setOfferMsg("❌ Please choose a media file first."); return null; }
    setOfferUploading(true); setOfferMsg("");
    try {
      const isVideo = offerMediaFile.type.startsWith("video/"); let url = "";
      if (isVideo) {
        const formData = new FormData(); formData.append("file", offerMediaFile); formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "beme_unsigned");
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: "POST", body: formData });
        const data = await res.json(); if (!data.secure_url) throw new Error("Video upload failed."); url = data.secure_url;
      } else { validateImageFiles([offerMediaFile]); const results = await uploadImagesToCloudinary([offerMediaFile]); url = results[0]?.url || ""; if (!url) throw new Error("Image upload failed."); }
      setOfferForm((prev) => ({ ...prev, mediaUrl: url })); setOfferMsg("✅ Media uploaded successfully."); return url;
    } catch (err) { setOfferMsg(`❌ ${err.message || "Upload failed."}`); return null; }
    finally { setOfferUploading(false); }
  };

  const validateOfferForm = () => {
    if (!offerForm.title.trim()) return "Title is required.";
    if (!offerForm.price || isNaN(Number(offerForm.price))) return "Valid price is required.";
    if (!offerForm.mediaUrl.trim() && !offerMediaFile) return "Media URL or uploaded file is required.";
    return "";
  };

  const buildOfferPayload = async () => {
    let mediaUrl = offerForm.mediaUrl.trim();
    if (!mediaUrl && offerMediaFile) { mediaUrl = await handleOfferMediaUpload(); if (!mediaUrl) return null; }
    const payload = { title: offerForm.title.trim(), description: offerForm.description.trim(), price: Number(offerForm.price), oldPrice: offerForm.oldPrice ? Number(offerForm.oldPrice) : null, mediaUrl, mediaType: offerForm.mediaType || "image", shopChip: offerForm.shopChip.trim(), productId: offerForm.productId.trim(), shopKey: offerForm.shopKey.trim(), order: offerForm.order !== "" ? Number(offerForm.order) : offers.length };
    if (!payload.oldPrice) delete payload.oldPrice;
    return payload;
  };

  const handleAddOffer = async () => {
    const err = validateOfferForm(); if (err) { setOfferMsg(`❌ ${err}`); return; }
    setOfferSubmitting(true); setOfferMsg("");
    try {
      const payload = await buildOfferPayload(); if (!payload) { setOfferSubmitting(false); return; }
      await addDoc(collection(db, OFFERS_COLLECTION), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setOfferMsg("✅ Offer added successfully."); setOfferForm(initialOfferForm); setOfferMediaFile(null); setOfferMediaPreview(""); await loadOffers();
    } catch (err) { setOfferMsg(`❌ ${err.message || "Failed to add offer."}`); }
    finally { setOfferSubmitting(false); }
  };

  const handleDeleteOffer = async (offerId) => {
    setDeletingOfferId(offerId);
    try { await deleteDoc(doc(db, OFFERS_COLLECTION, offerId)); setOffers((prev) => prev.filter((o) => o.id !== offerId)); }
    catch (err) { setOfferMsg(`❌ ${err.message || "Failed to delete offer."}`); }
    finally { setDeletingOfferId(""); }
  };

  const startEditOffer = (offer) => {
    setEditingOffer(offer);
    setOfferForm({ title: offer.title, description: offer.description, price: String(offer.price), oldPrice: offer.oldPrice ? String(offer.oldPrice) : "", mediaUrl: offer.mediaUrl, mediaType: offer.mediaType, shopChip: offer.shopChip, productId: offer.productId, shopKey: offer.shopKey, order: String(offer.order) });
    setOfferMediaFile(null); setOfferMediaPreview(""); setOfferMsg(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateOffer = async () => {
    if (!editingOffer?.id) return;
    const err = validateOfferForm(); if (err) { setOfferMsg(`❌ ${err}`); return; }
    setOfferSubmitting(true); setOfferMsg("");
    try {
      const payload = await buildOfferPayload(); if (!payload) { setOfferSubmitting(false); return; }
      await updateDoc(doc(db, OFFERS_COLLECTION, editingOffer.id), { ...payload, updatedAt: serverTimestamp() });
      setOfferMsg("✅ Offer updated successfully."); setEditingOffer(null); setOfferForm(initialOfferForm); setOfferMediaFile(null); setOfferMediaPreview(""); await loadOffers();
    } catch (err) { setOfferMsg(`❌ ${err.message || "Failed to update offer."}`); }
    finally { setOfferSubmitting(false); }
  };

  const cancelOfferEdit = () => { setEditingOffer(null); setOfferForm(initialOfferForm); setOfferMediaFile(null); setOfferMediaPreview(""); setOfferMsg(""); };

  return (
    <div className="admin-offers-shell">
      <div className="admin-upload-card">
        <div className="admin-upload-head">
          <div><h3 className="admin-upload-title">{editingOffer ? "Edit Offer" : "Add Offer of the Week"}</h3><p className="admin-upload-sub">Add images or short videos to showcase this week's picks.</p></div>
          {editingOffer && <button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={cancelOfferEdit}>Cancel edit</button>}
        </div>
        <div className="admin-form admin-form--compact">
          <label className="admin-field"><span>Title *</span><input value={offerForm.title} onChange={setOfferField("title")} placeholder="e.g. Premium Sneakers Drop" autoComplete="off" /></label>
          <label className="admin-field"><span>Description (optional)</span><textarea rows={3} value={offerForm.description} onChange={setOfferField("description")} placeholder="Short description" /></label>
          <div className="admin-row">
            <label className="admin-field"><span>Price (GHS) *</span><input value={offerForm.price} onChange={setOfferField("price")} inputMode="decimal" placeholder="e.g. 450" /></label>
            <label className="admin-field"><span>Old price (GHS, optional)</span><input value={offerForm.oldPrice} onChange={setOfferField("oldPrice")} inputMode="decimal" placeholder="e.g. 600" /></label>
          </div>
          <div className="admin-row">
            <label className="admin-field"><span>Shop chip label (optional)</span><input value={offerForm.shopChip} onChange={setOfferField("shopChip")} placeholder="e.g. Fashion Shop" /></label>
            <label className="admin-field"><span>Display order</span><input value={offerForm.order} onChange={setOfferField("order")} inputMode="numeric" placeholder="e.g. 1" /></label>
          </div>
          <div className="admin-row">
            <label className="admin-field"><span>Product ID (links to /product/:id)</span><input value={offerForm.productId} onChange={setOfferField("productId")} placeholder="Firestore product doc ID" autoComplete="off" /></label>
            <label className="admin-field"><span>Shop key (fallback link)</span><input value={offerForm.shopKey} onChange={setOfferField("shopKey")} placeholder="e.g. fashion" autoComplete="off" /></label>
          </div>
          <div className="admin-upload-card" style={{ marginTop: 0 }}>
            <div className="admin-upload-head"><div><h4 className="admin-upload-title">Media (image or video)</h4><p className="admin-upload-sub">Upload an image or short video, or paste a Cloudinary URL.</p></div></div>
            <label className="admin-field"><span>Choose file</span><input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" onChange={handleOfferMediaChange} /></label>
            {offerMediaPreview && <div className="admin-offer-media-preview">{offerForm.mediaType === "video" ? <video src={offerMediaPreview} className="admin-offer-media-thumb" muted playsInline controls /> : <img src={offerMediaPreview} alt="Preview" className="admin-offer-media-thumb" />}</div>}
            <div className="admin-upload-actions"><button type="button" className="admin-secondary-btn" onClick={handleOfferMediaUpload} disabled={!offerMediaFile || offerUploading}>{offerUploading ? "Uploading…" : "Upload to Cloudinary"}</button></div>
            <label className="admin-field" style={{ marginTop: 10 }}><span>Or paste media URL directly</span><input value={offerForm.mediaUrl} onChange={setOfferField("mediaUrl")} placeholder="https://res.cloudinary.com/..." autoComplete="off" /></label>
            <label className="admin-field"><span>Media type</span><select value={offerForm.mediaType} onChange={setOfferField("mediaType")}><option value="image">Image</option><option value="video">Video</option></select></label>
          </div>
        </div>
        {offerMsg && <div className="admin-msg" style={{ marginTop: 12 }}>{offerMsg}</div>}
        <div className="admin-upload-actions" style={{ marginTop: 14 }}>
          <button type="button" className="admin-btn" onClick={editingOffer ? handleUpdateOffer : handleAddOffer} disabled={offerSubmitting}>{offerSubmitting ? (editingOffer ? "Updating…" : "Adding…") : (editingOffer ? "Update offer" : "Add offer")}</button>
        </div>
      </div>
      <div className="admin-card admin-card--nested" style={{ maxWidth:"100%", marginTop:20 }}>
        <div className="admin-head"><h3 className="admin-title admin-title--small">Current Offers ({offers.length})</h3><p className="admin-sub">These appear on the /offers page.</p></div>
        {loadingOffers ? <div className="admin-products-empty">Loading offers…</div> : offers.length === 0 ? <div className="admin-products-empty">No offers added yet.</div> : (
          <div className="admin-offers-list">
            {offers.map((offer) => (
              <div key={offer.id} className="admin-offer-item">
                <div className="admin-offer-media-wrap">
                  {offer.mediaUrl ? (offer.mediaType === "video" ? <video src={offer.mediaUrl} className="admin-offer-thumb" muted playsInline /> : <img src={offer.mediaUrl} alt={offer.title} className="admin-offer-thumb" />) : <div className="admin-offer-thumb admin-offer-thumb--empty">No media</div>}
                  <span className="admin-offer-type-badge">{offer.mediaType === "video" ? "▶ Video" : "🖼 Image"}</span>
                </div>
                <div className="admin-offer-content">
                  <div className="admin-offer-top"><div><h4 className="admin-offer-title">{offer.title}</h4><div className="admin-offer-meta">{offer.shopChip && <span>{offer.shopChip}</span>}{offer.productId && <span>Product: {offer.productId.slice(0,10)}…</span>}{offer.shopKey && <span>Shop: {offer.shopKey}</span>}<span>Order: {offer.order}</span></div></div><div className="admin-product-price">{formatMoney(offer.price)}{offer.oldPrice && <span className="admin-offer-old-price"> / was {formatMoney(offer.oldPrice)}</span>}</div></div>
                  {offer.description && <p className="admin-import-row-desc">{offer.description}</p>}
                  <div className="admin-product-actions">
                    <button type="button" className="admin-secondary-btn" onClick={() => startEditOffer(offer)}>Edit offer</button>
                    <button type="button" className="admin-danger-btn" onClick={() => handleDeleteOffer(offer.id)} disabled={deletingOfferId === offer.id}>{deletingOfferId === offer.id ? "Deleting…" : "Delete"}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Admin component ──────────────────────────────────────────────

export default function Admin() {
  const { user, profile, role, adminShop, isSuperAdmin, isShopAdmin } = useAuth();

  const [activeMainTab, setActiveMainTab] = useState("products");
  const [activeCsvTab, setActiveCsvTab] = useState("standard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── FIX: Direct Firebase reauthenticate (bypasses broken context method) ──
  const doReauth = async (password) => {
    const auth = getAuth();
    const cu = auth.currentUser;
    if (!cu?.email) throw new Error("Session expired. Please sign in again.");
    const credential = EmailAuthProvider.credential(cu.email, password.trim());
    await reauthenticateWithCredential(cu, credential);
  };

  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [msg, setMsg] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [productToDelete, setProductToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [bulkDeletePassword, setBulkDeletePassword] = useState("");
  const [bulkDeleteError, setBulkDeleteError] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [productToEdit, setProductToEdit] = useState(null);
  const [editForm, setEditForm] = useState(initial);
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [editImagePreviews, setEditImagePreviews] = useState([]);
  const [editUploadedImages, setEditUploadedImages] = useState([]);
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [editMsg, setEditMsg] = useState("");
  const [standardImportText, setStandardImportText] = useState("");
  const [standardImporting, setStandardImporting] = useState(false);
  const [standardImportMsg, setStandardImportMsg] = useState("");
  const [standardImportMeta, setStandardImportMeta] = useState(initialImportMeta);
  const [cjImportText, setCjImportText] = useState("");
  const [cjImportMsg, setCjImportMsg] = useState("");
  const [cjImportMeta, setCjImportMeta] = useState({ ...initialImportMeta, sourceType: "cj" });
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const [importSearchTerm, setImportSearchTerm] = useState("");
  const [importPreviewMsg, setImportPreviewMsg] = useState("");
  const [editingPreviewId, setEditingPreviewId] = useState("");
  const [previewRowToEdit, setPreviewRowToEdit] = useState(null);
  const [previewEditForm, setPreviewEditForm] = useState(initial);
  const [previewEditImageFiles, setPreviewEditImageFiles] = useState([]);
  const [previewEditImagePreviews, setPreviewEditImagePreviews] = useState([]);
  const [previewEditUploadedImages, setPreviewEditUploadedImages] = useState([]);
  const [previewEditUploadingImage, setPreviewEditUploadingImage] = useState(false);
  const [previewEditError, setPreviewEditError] = useState("");
  const [previewEditMsg, setPreviewEditMsg] = useState("");

  const normalizedAdminShop = useMemo(() => normalizeShopKey(adminShop), [adminShop]);
  const deptOptions = useMemo(() => DEPARTMENTS.map((d) => d.key), []);
  const kindOptions = useMemo(() => KINDS.map((k) => k.key), []);
  const allShopOptions = useMemo(() => SHOPS.map((s) => s.key), []);
  const availableShops = useMemo(() => { if (isSuperAdmin) return allShopOptions; if (isShopAdmin && normalizedAdminShop) return [normalizedAdminShop]; return []; }, [isSuperAdmin, isShopAdmin, normalizedAdminShop, allShopOptions]);

  useEffect(() => { if (isShopAdmin && normalizedAdminShop) setForm((prev) => ({ ...prev, shop: normalizedAdminShop })); }, [isShopAdmin, normalizedAdminShop]);

  const canCurrentUserDeleteProduct = (product) => {
    if (!product) return false;
    if (isShopAdmin) return !!normalizedAdminShop && product.shop === normalizedAdminShop;
    if (isSuperAdmin) return product.ownerId && product.ownerId === user?.uid;
    return false;
  };
  const canCurrentUserEditProduct = (product) => {
    if (!product) return false;
    if (isShopAdmin) return !!normalizedAdminShop && product.shop === normalizedAdminShop;
    if (isSuperAdmin) return product.ownerId && product.ownerId === user?.uid;
    return false;
  };

  const loadProducts = async () => {
    setLoadingProducts(true); setProductsError("");
    try {
      const qRef = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
      const snap = await getDocs(qRef);
      let rows = snap.docs.map(normalizeAdminProduct);
      if (isShopAdmin && normalizedAdminShop) rows = rows.filter((p) => p.shop === normalizedAdminShop);
      setProducts(sortByCreatedAtDesc(rows));
    } catch {
      try {
        const fb = await getDocs(collection(db, COLLECTION_NAME));
        let normalized = fb.docs.map(normalizeAdminProduct);
        if (isShopAdmin && normalizedAdminShop) normalized = normalized.filter((p) => p.shop === normalizedAdminShop);
        setProducts(sortByCreatedAtDesc(normalized));
      } catch (fallbackError) { console.error("Admin fallback fetch error:", fallbackError); setProducts([]); setProductsError("Failed to load products."); }
    } finally { setLoadingProducts(false); }
  };
  useEffect(() => { loadProducts(); }, [role, normalizedAdminShop, isSuperAdmin, isShopAdmin]);

  useEffect(() => { return () => { imagePreviews.forEach((item) => { if (item?.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview); }); }; }, [imagePreviews]);
  useEffect(() => { return () => { editImagePreviews.forEach((item) => { if (item?.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview); }); }; }, [editImagePreviews]);
  useEffect(() => { return () => { previewEditImagePreviews.forEach((item) => { if (item?.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview); }); }; }, [previewEditImagePreviews]);

  const setField = (key) => (e) => { const value = e?.target?.type === "checkbox" ? e.target.checked : e.target.value; if (key === "shop" && isShopAdmin) return; setForm((prev) => ({ ...prev, [key]: value })); };
  const setEditField = (key) => (e) => { const value = e?.target?.type === "checkbox" ? e.target.checked : e.target.value; if (key === "shop" && isShopAdmin) return; setEditForm((prev) => ({ ...prev, [key]: value })); };
  const setPreviewEditField = (key) => (e) => { const value = e?.target?.type === "checkbox" ? e.target.checked : e.target.value; if (key === "shop" && isShopAdmin) return; setPreviewEditForm((prev) => ({ ...prev, [key]: value })); };

  const addCustomizationGroup = () => setForm((prev) => ({ ...prev, customizations: [...prev.customizations, makeOptionGroup()] }));
  const addEditCustomizationGroup = () => setEditForm((prev) => ({ ...prev, customizations: [...prev.customizations, makeOptionGroup()] }));
  const addPreviewEditCustomizationGroup = () => setPreviewEditForm((prev) => ({ ...prev, customizations: [...prev.customizations, makeOptionGroup()] }));

  const updateCustomizationGroup = (id, key, value) => setForm((prev) => ({ ...prev, customizations: prev.customizations.map((g) => g.id === id ? { ...g, [key]: value } : g) }));
  const updateEditCustomizationGroup = (id, key, value) => setEditForm((prev) => ({ ...prev, customizations: prev.customizations.map((g) => g.id === id ? { ...g, [key]: value } : g) }));
  const updatePreviewEditCustomizationGroup = (id, key, value) => setPreviewEditForm((prev) => ({ ...prev, customizations: prev.customizations.map((g) => g.id === id ? { ...g, [key]: value } : g) }));

  const addOptionValueToGroup = (groupId, scope = "create") => {
    const setter = scope === "edit" ? setEditForm : scope === "preview" ? setPreviewEditForm : setForm;
    setter((prev) => ({ ...prev, customizations: prev.customizations.map((g) => g.id === groupId ? { ...g, values: [...(Array.isArray(g.values) ? g.values : []), makeOptionValue()] } : g) }));
  };
  const updateOptionValueInGroup = (groupId, valueId, key, value, scope = "create") => {
    const setter = scope === "edit" ? setEditForm : scope === "preview" ? setPreviewEditForm : setForm;
    setter((prev) => ({ ...prev, customizations: prev.customizations.map((g) => g.id === groupId ? { ...g, values: (Array.isArray(g.values) ? g.values : []).map((item) => item.id === valueId ? { ...item, [key]: value } : item) } : g) }));
  };
  const removeOptionValueFromGroup = (groupId, valueId, scope = "create") => {
    const setter = scope === "edit" ? setEditForm : scope === "preview" ? setPreviewEditForm : setForm;
    setter((prev) => ({ ...prev, customizations: prev.customizations.map((g) => { if (g.id !== groupId) return g; const nextValues = (Array.isArray(g.values) ? g.values : []).filter((item) => item.id !== valueId); return { ...g, values: nextValues.length ? nextValues : [makeOptionValue()] }; }) }));
  };
  const removeCustomizationGroup = (id) => setForm((prev) => ({ ...prev, customizations: prev.customizations.filter((g) => g.id !== id) }));
  const removeEditCustomizationGroup = (id) => setEditForm((prev) => ({ ...prev, customizations: prev.customizations.filter((g) => g.id !== id) }));
  const removePreviewEditCustomizationGroup = (id) => setPreviewEditForm((prev) => ({ ...prev, customizations: prev.customizations.filter((g) => g.id !== id) }));

  const resetImageState = () => { imagePreviews.forEach((item) => { if (item?.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview); }); setImageFiles([]); setImagePreviews([]); setUploadedImages([]); };
  const resetEditImageState = () => { editImagePreviews.forEach((item) => { if (item?.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview); }); setEditImageFiles([]); setEditImagePreviews([]); setEditUploadedImages([]); };
  const resetPreviewEditImageState = () => { previewEditImagePreviews.forEach((item) => { if (item?.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview); }); setPreviewEditImageFiles([]); setPreviewEditImagePreviews([]); setPreviewEditUploadedImages([]); };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []); setMsg(""); if (!files.length) return;
    try {
      validateImageFiles(files);
      setImageFiles((prevFiles) => { const existingKeys = new Set(prevFiles.map(getFileKey)); const uniqueNewFiles = files.filter((f) => !existingKeys.has(getFileKey(f))); if (!uniqueNewFiles.length) return prevFiles; setImagePreviews((prevPreviews) => { const nextPreviews = [...prevPreviews]; uniqueNewFiles.forEach((file) => { nextPreviews.push({ key: getFileKey(file), preview: URL.createObjectURL(file) }); }); return nextPreviews; }); setUploadedImages([]); return [...prevFiles, ...uniqueNewFiles]; });
      e.target.value = "";
    } catch (err) { setMsg(`❌ ${err.message}`); e.target.value = ""; }
  };
  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files || []); setEditError(""); setEditMsg(""); if (!files.length) return;
    try {
      validateImageFiles(files);
      setEditImageFiles((prevFiles) => { const existingKeys = new Set(prevFiles.map(getFileKey)); const uniqueNewFiles = files.filter((f) => !existingKeys.has(getFileKey(f))); if (!uniqueNewFiles.length) return prevFiles; setEditImagePreviews((prevPreviews) => { const nextPreviews = [...prevPreviews]; uniqueNewFiles.forEach((file) => { nextPreviews.push({ key: getFileKey(file), preview: URL.createObjectURL(file) }); }); return nextPreviews; }); setEditUploadedImages([]); return [...prevFiles, ...uniqueNewFiles]; });
      e.target.value = "";
    } catch (err) { setEditError(`❌ ${err.message}`); e.target.value = ""; }
  };
  const handlePreviewEditImageChange = (e) => {
    const files = Array.from(e.target.files || []); setPreviewEditError(""); setPreviewEditMsg(""); if (!files.length) return;
    try {
      validateImageFiles(files);
      setPreviewEditImageFiles((prevFiles) => { const existingKeys = new Set(prevFiles.map(getFileKey)); const uniqueNewFiles = files.filter((f) => !existingKeys.has(getFileKey(f))); if (!uniqueNewFiles.length) return prevFiles; setPreviewEditImagePreviews((prevPreviews) => { const nextPreviews = [...prevPreviews]; uniqueNewFiles.forEach((file) => { nextPreviews.push({ key: getFileKey(file), preview: URL.createObjectURL(file) }); }); return nextPreviews; }); setPreviewEditUploadedImages([]); return [...prevFiles, ...uniqueNewFiles]; });
      e.target.value = "";
    } catch (err) { setPreviewEditError(`❌ ${err.message}`); e.target.value = ""; }
  };

  const removeSelectedImage = (i) => { setMsg(""); setImageFiles((prev) => prev.filter((_, idx) => idx !== i)); setImagePreviews((prev) => { const removed = prev[i]; if (removed?.preview?.startsWith("blob:")) URL.revokeObjectURL(removed.preview); return prev.filter((_, idx) => idx !== i); }); setUploadedImages([]); };
  const removeEditSelectedImage = (i) => { setEditError(""); setEditMsg(""); setEditImageFiles((prev) => prev.filter((_, idx) => idx !== i)); setEditImagePreviews((prev) => { const removed = prev[i]; if (removed?.preview?.startsWith("blob:")) URL.revokeObjectURL(removed.preview); return prev.filter((_, idx) => idx !== i); }); setEditUploadedImages([]); };
  const removePreviewEditSelectedImage = (i) => { setPreviewEditError(""); setPreviewEditMsg(""); setPreviewEditImageFiles((prev) => prev.filter((_, idx) => idx !== i)); setPreviewEditImagePreviews((prev) => { const removed = prev[i]; if (removed?.preview?.startsWith("blob:")) URL.revokeObjectURL(removed.preview); return prev.filter((_, idx) => idx !== i); }); setPreviewEditUploadedImages([]); };

  const handleUploadImage = async () => {
    if (!imageFiles.length) { setMsg("❌ Please choose product images first."); return null; }
    setUploadingImage(true); setMsg("");
    try { const results = await uploadImagesToCloudinary(imageFiles); setUploadedImages(results); setMsg("✅ Images uploaded successfully."); return results; }
    catch (err) { setMsg(`❌ ${err.message || "Image upload failed."}`); return null; }
    finally { setUploadingImage(false); }
  };
  const handleEditUploadImage = async () => {
    if (!editImageFiles.length) { setEditError("❌ Please choose product images first."); return null; }
    setEditUploadingImage(true); setEditError(""); setEditMsg("");
    try { const results = await uploadImagesToCloudinary(editImageFiles); setEditUploadedImages(results); setEditMsg("✅ New images uploaded successfully."); return results; }
    catch (err) { setEditError(`❌ ${err.message || "Image upload failed."}`); return null; }
    finally { setEditUploadingImage(false); }
  };
  const handlePreviewEditUploadImage = async () => {
    if (!previewEditImageFiles.length) { setPreviewEditError("❌ Please choose product images first."); return null; }
    setPreviewEditUploadingImage(true); setPreviewEditError(""); setPreviewEditMsg("");
    try { const results = await uploadImagesToCloudinary(previewEditImageFiles); setPreviewEditUploadedImages(results); setPreviewEditMsg("✅ New images uploaded successfully."); return results; }
    catch (err) { setPreviewEditError(`❌ ${err.message || "Image upload failed."}`); return null; }
    finally { setPreviewEditUploadingImage(false); }
  };

  const validateCustomizationEditor = (groups) => {
    for (const group of groups) {
      const groupName = String(group.name || "").trim();
      const values = Array.isArray(group.values) ? group.values : [];
      const nonEmptyValues = values.map((v) => ({ label: String(v?.label || "").trim(), priceBump: String(v?.priceBump ?? "").trim() })).filter((v) => v.label);
      if (!groupName && !nonEmptyValues.length) continue;
      if (!groupName) return "Each customization group must have a label.";
      if (nonEmptyValues.length < 1) return `Customization "${groupName}" must have at least 1 value.`;
      for (const v of nonEmptyValues) { if (v.priceBump !== "" && !Number.isFinite(Number(v.priceBump))) return `Customization "${groupName}" has an invalid price bump.`; }
    }
    return "";
  };

  const validate = () => {
    const name = form.name.trim(); if (!name) return "Name is required.";
    const price = Number(form.price); if (!Number.isFinite(price) || price < 0) return "Price must be a valid number >= 0.";
    if (form.oldPrice !== "") { const old = Number(form.oldPrice); if (!Number.isFinite(old) || old < 0) return "Old price must be a valid number >= 0."; if (old < price) return "Old price should be higher than current price."; }
    if (form.stock !== "") { const stock = Number(form.stock); if (!Number.isFinite(stock) || stock < 0) return "Stock must be a valid number >= 0."; }
    if (form.abroadDeliveryFee !== "") { const fee = Number(form.abroadDeliveryFee); if (!Number.isFinite(fee) || fee < 0) return "Abroad delivery fee must be a valid number >= 0."; }
    if (!imageFiles.length && !uploadedImages.length) return "At least one product image is required.";
    if (!deptOptions.includes(form.dept)) return "Invalid department selected.";
    if (!kindOptions.includes(form.kind)) return "Invalid type selected.";
    if (!availableShops.includes(normalizeShopKey(form.shop))) return "Invalid shop selected.";
    return validateCustomizationEditor(form.customizations);
  };
  const validateEdit = () => {
    const name = String(editForm.name || "").trim(); if (!name) return "Name is required.";
    const price = Number(editForm.price); if (!Number.isFinite(price) || price < 0) return "Price must be a valid number >= 0.";
    if (editForm.oldPrice !== "") { const old = Number(editForm.oldPrice); if (!Number.isFinite(old) || old < 0) return "Old price must be a valid number >= 0."; if (old < price) return "Old price should be higher than current price."; }
    if (!deptOptions.includes(editForm.dept)) return "Invalid department selected.";
    if (!kindOptions.includes(editForm.kind)) return "Invalid type selected.";
    if (!availableShops.includes(normalizeShopKey(editForm.shop))) return "Invalid shop selected.";
    return validateCustomizationEditor(editForm.customizations);
  };
  const validatePreviewEdit = () => {
    const name = String(previewEditForm.name || "").trim(); if (!name) return "Name is required.";
    const price = Number(previewEditForm.price); if (!Number.isFinite(price) || price < 0) return "Price must be a valid number >= 0.";
    if (!deptOptions.includes(previewEditForm.dept)) return "Invalid department selected.";
    if (!kindOptions.includes(previewEditForm.kind)) return "Invalid type selected.";
    if (!availableShops.includes(normalizeShopKey(previewEditForm.shop))) return "Invalid shop selected.";
    return validateCustomizationEditor(previewEditForm.customizations);
  };

  const cancelEditProduct = () => { if (editingId) return; setProductToEdit(null); setEditForm(initial); setEditPassword(""); setEditError(""); setEditMsg(""); resetEditImageState(); };
  const cancelPreviewEdit = () => { if (editingPreviewId) return; setPreviewRowToEdit(null); setPreviewEditForm(initial); setPreviewEditError(""); setPreviewEditMsg(""); resetPreviewEditImageState(); };

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg("");
    const error = validate(); if (error) { setMsg(`❌ ${error}`); return; }
    setSubmitting(true);
    try {
      let imagePayloads = uploadedImages;
      if (!imagePayloads.length && imageFiles.length) imagePayloads = await handleUploadImage();
      if (!imagePayloads?.length) throw new Error("Image upload did not complete successfully.");
      const shopValue = isShopAdmin && normalizedAdminShop ? normalizedAdminShop : normalizeShopKey(form.shop);
      const customizations = normalizeCustomizationGroups(form.customizations);
      const imageUrls = imagePayloads.map((item) => item.url).filter(Boolean);
      const sellerName = resolveCurrentSellerName(user, profile);
      const stockValue = form.stock !== "" && Number.isFinite(Number(form.stock)) ? Number(form.stock) : null;
      const normalizedInStock = stockValue !== null ? stockValue > 0 && form.inStock !== false : form.inStock !== false;
      const payload = { name: form.name.trim(), brand: String(form.brand || "").trim(), price: Number(form.price), image: imageUrls[0], images: imageUrls, imageMeta: { publicId: imagePayloads[0]?.publicId || "", width: imagePayloads[0]?.width || null, height: imagePayloads[0]?.height || null, format: imagePayloads[0]?.format || "", bytes: imagePayloads[0]?.bytes || 0, originalFilename: imagePayloads[0]?.originalFilename || "" }, imageMetaList: imagePayloads.map((item) => ({ publicId: item.publicId || "", width: item.width || null, height: item.height || null, format: item.format || "", bytes: item.bytes || 0, originalFilename: item.originalFilename || "", url: item.url || "" })), description: form.description.trim(), dept: form.dept, kind: form.kind, shop: shopValue, homeSlot: String(form.homeSlot || "others").trim().toLowerCase(), ownerId: user?.uid || "", ownerEmail: String(user?.email || profile?.email || "").trim(), ownerName: sellerName, sellerName, inStock: normalizedInStock, featured: !!form.featured, shipsFromAbroad: !!form.shipsFromAbroad, customizations, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      if (form.oldPrice !== "") payload.oldPrice = Number(form.oldPrice);
      if (stockValue !== null) payload.stock = stockValue;
      if (form.abroadDeliveryFee !== "" && Number.isFinite(Number(form.abroadDeliveryFee))) payload.abroadDeliveryFee = Number(form.abroadDeliveryFee); else payload.abroadDeliveryFee = 0;
      if (!payload.description) delete payload.description;
      if (!payload.brand) delete payload.brand;
      if (!payload.customizations.length) delete payload.customizations;
      await addDoc(collection(db, COLLECTION_NAME), payload);
      setMsg("✅ Product added successfully."); setForm({ ...initial, shop: isShopAdmin && normalizedAdminShop ? normalizedAdminShop : initial.shop }); resetImageState(); await loadProducts();
    } catch (err) { setMsg(`❌ ${err.message || "Failed to add products."}`); }
    finally { setSubmitting(false); }
  };

  const buildPreviewRowsFromCsv = (rows, sourceType = "standard") => {
    const sellerName = resolveCurrentSellerName(user, profile);
    const fallbackShop = isShopAdmin && normalizedAdminShop ? normalizedAdminShop : normalizeShopKey(form.shop);
    const prepared = []; const skipped = []; const rowErrors = [];
    rows.forEach((row, index) => {
      const rowNumber = row.__rowNumber || index + 2;
      const title = sourceType === "cj" ? String(row.title || row.product_name || "").trim() : String(row.title || "").trim();
      const price = sourceType === "cj" ? parseNumberish(row.price || row.price_ghs, NaN) : parseNumberish(row.price, NaN);
      if (!title || !Number.isFinite(price)) { const message = `Row ${rowNumber}: missing valid product name or price`; skipped.push(message); rowErrors.push(message); return; }
      const stockSource = row.stock;
      const stockNumber = stockSource !== undefined && stockSource !== null && String(stockSource).trim() !== "" ? parseNumberish(stockSource, 0) : null;
      const oldPrice = row.oldPrice !== undefined && row.oldPrice !== null && row.oldPrice !== "" ? parseNumberish(row.oldPrice, null) : null;
      const category = String(row.category || "").trim();
      const images = parseImageList(row);
      const customizationSource = sourceType === "cj" ? row.customizations || row.customization_options : row.customizations;
      const customizations = parseCustomizationsFromText(customizationSource);
      const description = buildImportDescription(row);
      const resolvedShop = inferShopFromCategory(category, SHOPS, fallbackShop);
      const resolvedKind = findValidKind(category, kindOptions, form.kind);
      const resolvedDept = findValidDept(category, deptOptions, form.dept);
      prepared.push({ id: crypto.randomUUID(), sourceType, source: sourceType === "cj" ? "cj-import" : "standard-csv-import", cjMeta: sourceType === "cj" ? { cjProductId: String(row.cj_product_id || "").trim(), productSku: String(row.product_sku || "").trim(), variant: String(row.variant || "").trim() } : null, name: title, brand: String(row.brand || "").trim(), price, oldPrice: oldPrice !== null && Number.isFinite(oldPrice) && oldPrice >= price ? oldPrice : "", description, dept: resolvedDept, kind: resolvedKind, shop: resolvedShop, homeSlot: "others", ownerId: user?.uid || "", ownerEmail: String(user?.email || profile?.email || "").trim(), ownerName: sellerName, sellerName, inStock: row.inStock !== undefined && row.inStock !== "" ? parseBooleanish(row.inStock, stockNumber === null ? true : stockNumber > 0) : stockNumber === null ? true : stockNumber > 0, featured: parseBooleanish(row.featured, false), shipsFromAbroad: parseBooleanish(row.shipsFromAbroad, false), customizations, stock: stockNumber, abroadDeliveryFee: row.abroadDeliveryFee !== undefined && row.abroadDeliveryFee !== null && String(row.abroadDeliveryFee).trim() !== "" ? parseNumberish(row.abroadDeliveryFee, 0) : 0, image: images[0] || "", images, imageMeta: null, imageMetaList: [] });
    });
    return { prepared, skipped, rowErrors };
  };

  const handlePreviewImport = (sourceType = "standard") => {
    const isCj = sourceType === "cj";
    const text = isCj ? cjImportText : standardImportText;
    setImportPreviewMsg(""); setImportPreviewRows([]);
    if (isCj) { setCjImportMsg(""); setCjImportMeta({ ...initialImportMeta, sourceType: "cj" }); } else { setStandardImportMsg(""); setStandardImportMeta(initialImportMeta); }
    if (!String(text || "").trim()) { if (isCj) setCjImportMsg("❌ Paste your CJ CSV first."); else setStandardImportMsg("❌ Paste your CSV first."); return; }
    if (!user?.uid) { if (isCj) setCjImportMsg("❌ No authenticated admin session found."); else setStandardImportMsg("❌ No authenticated admin session found."); return; }
    if (!availableShops.length) { if (isCj) setCjImportMsg("❌ No valid shop available for this account."); else setStandardImportMsg("❌ No valid shop available for this account."); return; }
    try {
      const headers = getCsvHeaders(text);
      const headerValidation = getHeaderValidation(sourceType, headers);
      const headerErrors = [];
      if (headerValidation.missingRequired.length) headerErrors.push(`Missing required columns: ${headerValidation.missingRequired.join(", ")}`);
      if (headerValidation.unsupportedHeaders.length) headerErrors.push(`Unsupported columns: ${headerValidation.unsupportedHeaders.join(", ")}`);
      const rows = parseCsvText(text);
      if (!rows.length) throw new Error("No valid CSV rows found.");
      const rowErrors = sourceType === "cj" ? validateCjImportRows(rows) : validateStandardImportRows(rows);
      const { prepared, skipped } = buildPreviewRowsFromCsv(rows, sourceType);
      const metaPayload = { sourceType, totalRows: rows.length, validRows: prepared.length, skippedRows: skipped.length, headerErrors, rowErrors };
      if (isCj) setCjImportMeta(metaPayload); else setStandardImportMeta(metaPayload);
      if (headerErrors.length) { if (isCj) setCjImportMsg(`❌ ${headerErrors[0]}`); else setStandardImportMsg(`❌ ${headerErrors[0]}`); return; }
      if (rowErrors.length && !prepared.length) throw new Error(rowErrors[0]);
      if (!prepared.length) throw new Error(skipped.length ? `All rows were skipped. ${skipped[0]}` : "No valid products found to preview.");
      setImportPreviewRows(prepared);
      setImportPreviewMsg(`✅ ${sourceType === "cj" ? "CJ" : "Standard"} preview ready for ${prepared.length} product${prepared.length > 1 ? "s" : ""}.${skipped.length ? ` Skipped ${skipped.length} invalid row(s).` : ""}`);
      if (isCj) setCjImportMsg("✅ CJ import preview prepared."); else setStandardImportMsg("✅ Standard CSV preview prepared.");
    } catch (error) { if (isCj) setCjImportMsg(`❌ ${error.message || "CJ CSV preview failed."}`); else setStandardImportMsg(`❌ ${error.message || "CSV preview failed."}`); }
  };

  const handleBulkImport = async () => {
    const isCj = activeCsvTab === "cj";
    if (isCj) setCjImportMsg(""); else setStandardImportMsg("");
    if (!importPreviewRows.length) { if (isCj) setCjImportMsg("❌ Preview and review CJ products before importing."); else setStandardImportMsg("❌ Preview and review products before importing."); return; }
    if (!user?.uid) { if (isCj) setCjImportMsg("❌ No authenticated admin session found."); else setStandardImportMsg("❌ No authenticated admin session found."); return; }
    setStandardImporting(true);
    try {
      const prepared = importPreviewRows.map((row) => {
        const payload = { name: String(row.name || "").trim(), brand: String(row.brand || "").trim(), price: Number(row.price || 0), description: String(row.description || "").trim(), dept: row.dept, kind: row.kind, shop: isShopAdmin && normalizedAdminShop ? normalizedAdminShop : normalizeShopKey(row.shop), homeSlot: String(row.homeSlot || "others").trim().toLowerCase(), ownerId: String(row.ownerId || user?.uid || "").trim(), ownerEmail: String(row.ownerEmail || user?.email || profile?.email || "").trim(), ownerName: String(row.ownerName || row.sellerName || "").trim(), sellerName: String(row.sellerName || row.ownerName || "").trim(), inStock: !!row.inStock, featured: !!row.featured, shipsFromAbroad: !!row.shipsFromAbroad, customizations: normalizeCustomizationGroups(Array.isArray(row.customizations) ? row.customizations : []), abroadDeliveryFee: row.abroadDeliveryFee !== null && row.abroadDeliveryFee !== undefined && row.abroadDeliveryFee !== "" ? Number(row.abroadDeliveryFee) || 0 : 0, importSource: row.sourceType === "cj" ? "cj-import" : "standard-csv-import", createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        if (row.sourceType === "cj" && row.cjMeta) payload.cjMeta = { cjProductId: String(row.cjMeta.cjProductId || "").trim(), productSku: String(row.cjMeta.productSku || "").trim(), variant: String(row.cjMeta.variant || "").trim(), status: "prepared" };
        if (row.stock !== null && row.stock !== undefined && row.stock !== "" && Number.isFinite(Number(row.stock))) { payload.stock = Number(row.stock); payload.inStock = payload.inStock && Number(row.stock) > 0; }
        if (row.oldPrice !== "" && row.oldPrice !== null && Number.isFinite(Number(row.oldPrice)) && Number(row.oldPrice) >= Number(row.price)) payload.oldPrice = Number(row.oldPrice);
        if (Array.isArray(row.images) && row.images.length) { payload.image = row.images[0]; payload.images = row.images; } else if (row.image) { payload.image = row.image; payload.images = [row.image]; }
        if (!payload.brand) delete payload.brand;
        if (!payload.description) delete payload.description;
        if (!payload.customizations.length) delete payload.customizations;
        return payload;
      });
      for (let i = 0; i < prepared.length; i += 400) { const batch = writeBatch(db); prepared.slice(i, i + 400).forEach((p) => { batch.set(doc(collection(db, COLLECTION_NAME)), p); }); await batch.commit(); }
      const successMsg = `✅ Imported ${prepared.length} product${prepared.length > 1 ? "s" : ""} successfully.`;
      if (isCj) { setCjImportMsg(successMsg); setCjImportText(""); setCjImportMeta({ ...initialImportMeta, sourceType: "cj" }); } else { setStandardImportMsg(successMsg); setStandardImportText(""); setStandardImportMeta(initialImportMeta); }
      setImportPreviewRows([]); setImportSearchTerm(""); setImportPreviewMsg(""); await loadProducts();
    } catch (error) { if (isCj) setCjImportMsg(`❌ ${error.message || "CJ import failed."}`); else setStandardImportMsg(`❌ ${error.message || "Bulk import failed."}`); }
    finally { setStandardImporting(false); }
  };

  const startPreviewEdit = (row) => { setPreviewRowToEdit(row); setPreviewEditForm({ name: row.name || "", brand: row.brand || "", price: row.price ?? "", oldPrice: row.oldPrice !== null && row.oldPrice !== undefined && row.oldPrice !== "" ? String(row.oldPrice) : "", description: row.description || "", dept: row.dept || "men", kind: row.kind || "fashion", shop: isShopAdmin && normalizedAdminShop ? normalizedAdminShop : row.shop || "fashion", homeSlot: row.homeSlot || "others", inStock: !!row.inStock, featured: !!row.featured, shipsFromAbroad: !!row.shipsFromAbroad, stock: row.stock !== null && row.stock !== undefined && row.stock !== "" ? String(row.stock) : "", abroadDeliveryFee: row.abroadDeliveryFee !== null && row.abroadDeliveryFee !== undefined && row.abroadDeliveryFee !== "" ? String(row.abroadDeliveryFee) : "", customizations: toEditableCustomizationGroups(row.customizations) }); setPreviewEditError(""); setPreviewEditMsg(""); resetPreviewEditImageState(); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleSavePreviewEdit = async () => {
    if (!previewRowToEdit?.id) return;
    const error = validatePreviewEdit(); if (error) { setPreviewEditError(`❌ ${error}`); return; }
    setPreviewEditError(""); setPreviewEditMsg(""); setEditingPreviewId(previewRowToEdit.id);
    try {
      let nextImagePayloads = null;
      if (previewEditImageFiles.length) { nextImagePayloads = previewEditUploadedImages.length > 0 ? previewEditUploadedImages : await handlePreviewEditUploadImage(); if (!nextImagePayloads?.length) throw new Error("Image upload did not complete successfully."); }
      const shopValue = isShopAdmin && normalizedAdminShop ? normalizedAdminShop : normalizeShopKey(previewEditForm.shop);
      const customizations = normalizeCustomizationGroups(previewEditForm.customizations);
      const nextStock = previewEditForm.stock !== "" && Number.isFinite(Number(previewEditForm.stock)) ? Number(previewEditForm.stock) : null;
      const nextRow = { ...previewRowToEdit, name: String(previewEditForm.name || "").trim(), brand: String(previewEditForm.brand || "").trim(), description: String(previewEditForm.description || "").trim(), price: Number(previewEditForm.price), oldPrice: previewEditForm.oldPrice !== "" ? Number(previewEditForm.oldPrice) : "", dept: previewEditForm.dept, kind: previewEditForm.kind, shop: shopValue, homeSlot: String(previewEditForm.homeSlot || "others").trim().toLowerCase(), inStock: nextStock !== null ? nextStock > 0 && !!previewEditForm.inStock : !!previewEditForm.inStock, featured: !!previewEditForm.featured, shipsFromAbroad: !!previewEditForm.shipsFromAbroad, stock: nextStock, abroadDeliveryFee: previewEditForm.abroadDeliveryFee !== "" && Number.isFinite(Number(previewEditForm.abroadDeliveryFee)) ? Number(previewEditForm.abroadDeliveryFee) : 0, customizations };
      if (nextImagePayloads?.length) { const imageUrls = nextImagePayloads.map((item) => item.url).filter(Boolean); nextRow.image = imageUrls[0] || ""; nextRow.images = imageUrls; nextRow.imageMeta = { publicId: nextImagePayloads[0]?.publicId || "", width: nextImagePayloads[0]?.width || null, height: nextImagePayloads[0]?.height || null, format: nextImagePayloads[0]?.format || "", bytes: nextImagePayloads[0]?.bytes || 0, originalFilename: nextImagePayloads[0]?.originalFilename || "" }; nextRow.imageMetaList = nextImagePayloads.map((item) => ({ publicId: item.publicId || "", width: item.width || null, height: item.height || null, format: item.format || "", bytes: item.bytes || 0, originalFilename: item.originalFilename || "", url: item.url || "" })); }
      setImportPreviewRows((prev) => prev.map((row) => (row.id === previewRowToEdit.id ? nextRow : row)));
      setImportPreviewMsg(`✅ Preview row "${nextRow.name}" updated.`); cancelPreviewEdit();
    } catch (error) { setPreviewEditError(`❌ ${error.message || "Failed to update preview row."}`); }
    finally { setEditingPreviewId(""); }
  };

  const handleDeletePreviewRow = (rowId) => setImportPreviewRows((prev) => prev.filter((row) => row.id !== rowId));

  const toggleMultiSelectMode = () => { setMultiSelectMode((prev) => !prev); setSelectedProductIds([]); setBulkDeleteMode(false); setBulkDeletePassword(""); setBulkDeleteError(""); };
  const isProductSelected = (productId) => selectedProductIds.includes(productId);
  const toggleProductSelection = (product) => { if (!canCurrentUserDeleteProduct(product)) return; setSelectedProductIds((prev) => prev.includes(product.id) ? prev.filter((id) => id !== product.id) : [...prev, product.id]); };
  const selectAllInGroup = (items) => { const allowedIds = items.filter((item) => canCurrentUserDeleteProduct(item)).map((item) => item.id); setSelectedProductIds((prev) => { const next = new Set(prev); allowedIds.forEach((id) => next.add(id)); return Array.from(next); }); };
  const clearAllInGroup = (items) => { const ids = new Set(items.map((item) => item.id)); setSelectedProductIds((prev) => prev.filter((id) => !ids.has(id))); };
  const clearAllSelections = () => setSelectedProductIds([]);

  const selectedProducts = useMemo(() => { const set = new Set(selectedProductIds); return products.filter((p) => set.has(p.id)); }, [products, selectedProductIds]);

  const startBulkDelete = () => {
    if (!selectedProducts.length) { setMsg("❌ Select at least one product first."); return; }
    const unauthorized = selectedProducts.some((p) => !canCurrentUserDeleteProduct(p));
    if (unauthorized) { setMsg("❌ One or more selected products cannot be deleted from this account."); return; }
    setBulkDeletePassword(""); setBulkDeleteError(""); setBulkDeleteMode(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBulkDeleteProducts = async () => {
    if (!selectedProducts.length) { setBulkDeleteError("No selected products found."); return; }
    if (!user?.email) { setBulkDeleteError("No authenticated admin session found."); return; }
    if (!bulkDeletePassword.trim()) { setBulkDeleteError("Enter your admin password to continue."); return; }
    setBulkDeleteError(""); setBulkDeleting(true);
    try {
      await doReauth(bulkDeletePassword);  // FIXED: uses doReauth instead of broken context reauthenticate
      for (let i = 0; i < selectedProducts.length; i += 400) {
        const batch = writeBatch(db);
        selectedProducts.slice(i, i + 400).forEach((product) => { batch.delete(doc(db, COLLECTION_NAME, product.id)); });
        await batch.commit();
      }
      const removedIds = new Set(selectedProducts.map((p) => p.id));
      setProducts((prev) => prev.filter((p) => !removedIds.has(p.id)));
      setSelectedProductIds([]); setMultiSelectMode(false); setBulkDeleteMode(false); setBulkDeletePassword("");
      setMsg(`✅ Deleted ${selectedProducts.length} product${selectedProducts.length > 1 ? "s" : ""} successfully.`);
      await loadProducts();
    } catch (error) { setBulkDeleteError(`❌ ${error?.message || "Failed to delete selected products."}`); }
    finally { setBulkDeleting(false); }
  };

  const startEditProduct = (product) => {
    if (!canCurrentUserEditProduct(product)) { setMsg(isSuperAdmin ? "❌ Super admin can only edit products uploaded from this super admin account." : "❌ You can only edit products from your own shop."); return; }
    setProductToEdit(product);
    setEditForm({ name: product.name || "", brand: product.brand || "", price: product.price ?? "", oldPrice: product.oldPrice !== null && product.oldPrice !== undefined ? String(product.oldPrice) : "", description: product.description || "", dept: product.dept || "men", kind: product.kind || "fashion", shop: isShopAdmin && normalizedAdminShop ? normalizedAdminShop : product.shop || "fashion", homeSlot: product.homeSlot || "others", inStock: !!product.inStock, featured: !!product.featured, shipsFromAbroad: !!product.shipsFromAbroad, stock: product.stock !== null && product.stock !== undefined && product.stock !== "" ? String(product.stock) : "", abroadDeliveryFee: product.abroadDeliveryFee !== null && product.abroadDeliveryFee !== undefined && product.abroadDeliveryFee !== "" ? String(product.abroadDeliveryFee) : "", customizations: toEditableCustomizationGroups(product.customizations) });
    setEditPassword(""); setEditError(""); setEditMsg(""); resetEditImageState(); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateProduct = async () => {
    if (!productToEdit?.id) return;
    if (!user?.email) { setEditError("No authenticated admin session found."); return; }
    if (!editPassword.trim()) { setEditError("Enter your admin password to continue."); return; }
    const error = validateEdit(); if (error) { setEditError(`❌ ${error}`); return; }
    setEditError(""); setEditMsg(""); setEditingId(productToEdit.id);
    try {
      await doReauth(editPassword);  // FIXED: uses doReauth
      let nextImagePayloads = null;
      if (editImageFiles.length) { nextImagePayloads = editUploadedImages.length > 0 ? editUploadedImages : await handleEditUploadImage(); if (!nextImagePayloads?.length) throw new Error("Image upload did not complete successfully."); }
      const shopValue = isShopAdmin && normalizedAdminShop ? normalizedAdminShop : normalizeShopKey(editForm.shop);
      const customizations = normalizeCustomizationGroups(editForm.customizations);
      const nextStock = editForm.stock !== "" && Number.isFinite(Number(editForm.stock)) ? Number(editForm.stock) : null;
      const sellerName = resolveCurrentSellerName(user, profile);
      const updatePayload = { name: String(editForm.name || "").trim(), brand: String(editForm.brand || "").trim(), description: String(editForm.description || "").trim(), price: Number(editForm.price), dept: editForm.dept, kind: editForm.kind, shop: shopValue, homeSlot: String(editForm.homeSlot || "others").trim().toLowerCase(), inStock: nextStock !== null ? nextStock > 0 && !!editForm.inStock : !!editForm.inStock, featured: !!editForm.featured, shipsFromAbroad: !!editForm.shipsFromAbroad, abroadDeliveryFee: editForm.abroadDeliveryFee !== "" && Number.isFinite(Number(editForm.abroadDeliveryFee)) ? Number(editForm.abroadDeliveryFee) : 0, customizations, updatedAt: serverTimestamp(), ownerEmail: String(user?.email || profile?.email || "").trim(), ownerName: sellerName, sellerName };
      updatePayload.stock = nextStock !== null ? nextStock : null;
      updatePayload.oldPrice = editForm.oldPrice !== "" ? Number(editForm.oldPrice) : null;
      if (!updatePayload.description) delete updatePayload.description;
      if (!updatePayload.brand) delete updatePayload.brand;
      if (!updatePayload.customizations.length) delete updatePayload.customizations;
      if (nextImagePayloads?.length) { const imageUrls = nextImagePayloads.map((item) => item.url).filter(Boolean); updatePayload.image = imageUrls[0] || ""; updatePayload.images = imageUrls; updatePayload.imageMeta = { publicId: nextImagePayloads[0]?.publicId || "", width: nextImagePayloads[0]?.width || null, height: nextImagePayloads[0]?.height || null, format: nextImagePayloads[0]?.format || "", bytes: nextImagePayloads[0]?.bytes || 0, originalFilename: nextImagePayloads[0]?.originalFilename || "" }; updatePayload.imageMetaList = nextImagePayloads.map((item) => ({ publicId: item.publicId || "", width: item.width || null, height: item.height || null, format: item.format || "", bytes: item.bytes || 0, originalFilename: item.originalFilename || "", url: item.url || "" })); }
      await updateDoc(doc(db, COLLECTION_NAME, productToEdit.id), updatePayload);
      setMsg(`✅ "${updatePayload.name}" updated successfully.`); cancelEditProduct(); await loadProducts();
    } catch (error) { setEditError(`❌ ${error?.message || "Failed to update product."}`); }
    finally { setEditingId(""); }
  };

  const startDeleteProduct = (product) => {
    if (!canCurrentUserDeleteProduct(product)) { setMsg(isSuperAdmin ? "❌ Super admin can only delete products uploaded from this super admin account." : "❌ You can only delete products from your own shop."); return; }
    setProductToDelete(product); setDeletePassword(""); setDeleteError(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete?.id) return;
    if (!user?.email) { setDeleteError("No authenticated admin session found."); return; }
    if (!deletePassword.trim()) { setDeleteError("Enter your admin password to continue."); return; }
    setDeleteError(""); setDeletingId(productToDelete.id);
    try {
      await doReauth(deletePassword);  // FIXED: uses doReauth
      await deleteDoc(doc(db, COLLECTION_NAME, productToDelete.id));
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setMsg(`✅ "${productToDelete.name}" deleted successfully.`); setProductToDelete(null); setDeletePassword(""); await loadProducts();
    } catch (error) { setDeleteError(`❌ ${error?.message || "Failed to delete product."}`); }
    finally { setDeletingId(""); }
  };

  const filteredProducts = useMemo(() => products.filter((p) => productMatchesSearch(p, searchTerm)), [products, searchTerm]);
  const filteredImportPreviewRows = useMemo(() => importPreviewRows.filter((row) => importRowMatchesSearch(row, importSearchTerm)), [importPreviewRows, importSearchTerm]);
  const groupedProducts = useMemo(() => { const groups = new Map(); filteredProducts.forEach((p) => { const key = p.shop || "unknown"; if (!groups.has(key)) groups.set(key, { shop: key, label: formatShopLabel(key), items: [] }); groups.get(key).items.push(p); }); return Array.from(groups.values()).map((g) => ({ ...g, items: sortByCreatedAtDesc(g.items) })).sort((a, b) => a.label.localeCompare(b.label)); }, [filteredProducts]);

  const activeImportMeta = activeCsvTab === "cj" ? cjImportMeta : standardImportMeta;
  const activeImportMsg  = activeCsvTab === "cj" ? cjImportMsg  : standardImportMsg;
  const pageTitle = isSuperAdmin ? "Product Manager" : `${formatShopLabel(normalizedAdminShop)} Product Manager`;
  const pageSub   = isSuperAdmin ? "Create products from this super admin account and review products across every shop." : `Manage only products belonging to ${formatShopLabel(normalizedAdminShop)}.`;

  if (!user) return <div className="adm-shell"><main className="adm-main"><div className="admin-card"><div className="admin-head"><h2 className="admin-title">Admin access required</h2><p className="admin-sub">Please sign in to continue.</p></div></div></main></div>;
  if (!isSuperAdmin && !isShopAdmin) return <div className="adm-shell"><main className="adm-main"><div className="admin-card"><div className="admin-head"><h2 className="admin-title">Access denied</h2><p className="admin-sub">This page is available to admins only.</p></div></div></main></div>;

  // ── Sidebar component ──
  const SidebarContent = () => (
    <>
      <div className="adm-sidebar-header">
        <div className="adm-logo-row">
          <div className="adm-logo-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="adm-logo-text">BEME MARKET</span>
        </div>
        <button className="adm-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button>
      </div>
      <div className="adm-nav-section-label">ADMIN</div>
      <nav className="adm-nav">
        {SIDEBAR_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`adm-nav-item${activeMainTab === tab.key ? " adm-nav-item--active" : ""}`}
            onClick={() => { setActiveMainTab(tab.key); setSidebarOpen(false); }}
            type="button"
          >
            <span className="adm-nav-icon"><SidebarIcon tabKey={tab.key} /></span>
            {tab.label}
          </button>
        ))}
      </nav>
    </>
  );

  // ── Full-page edit modes ──
  const CustomizationsEditor = ({ formData, add, update, remove, addVal, updateVal, removeVal }) => (
    <div className="admin-options-card">
      <div className="admin-options-head"><h3 className="admin-options-title">Customizations</h3><button type="button" className="admin-options-add" onClick={add}>+ Add option group</button></div>
      {formData.customizations.length ? formData.customizations.map((group, index) => (
        <div className="admin-option-group" key={group.id}>
          <div className="admin-option-group-head"><strong>Option group {index + 1}</strong><button type="button" className="admin-option-remove" onClick={() => remove(group.id)}>Remove</button></div>
          <div className="admin-row">
            <label className="admin-field"><span>Label</span><input value={group.name} onChange={(e) => update(group.id, "name", e.target.value)} /></label>
            <label className="admin-field"><span>Style</span><select value={group.type} onChange={(e) => update(group.id, "type", e.target.value)}><option value="buttons">Buttons</option><option value="select">Dropdown</option></select></label>
          </div>
          <OptionValuesEditor values={group.values} onChange={(vid, k, v) => updateVal(group.id, vid, k, v)} onAdd={() => addVal(group.id)} onRemove={(vid) => removeVal(group.id, vid)} compact />
        </div>
      )) : <div className="admin-options-empty">No customization groups added yet.</div>}
    </div>
  );

  if (previewRowToEdit) {
    return (
      <div className="adm-shell">
        <div className={`adm-overlay${sidebarOpen ? " adm-overlay--show" : ""}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`adm-sidebar${sidebarOpen ? " adm-sidebar--open" : ""}`}><SidebarContent /></aside>
        <header className="adm-topbar">
          <button className="adm-hamburger" onClick={() => setSidebarOpen((o) => !o)} type="button" aria-label="Menu">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="adm-topbar-title">Edit Preview Row</span>
        </header>
        <main className="adm-main">
          <div className="adm-page-header"><h1 className="adm-page-title">Edit Preview Row</h1></div>
          <div className="admin-card" style={{ maxWidth:"100%" }}>
            <div className="admin-edit-layout">
              <div className="admin-edit-main">
                <div className="admin-form admin-form--compact">
                  <label className="admin-field"><span>Name</span><input value={previewEditForm.name} onChange={setPreviewEditField("name")} /></label>
                  <label className="admin-field"><span>Brand</span><input value={previewEditForm.brand} onChange={setPreviewEditField("brand")} /></label>
                  <div className="admin-row"><label className="admin-field"><span>Base price</span><input value={previewEditForm.price} onChange={setPreviewEditField("price")} /></label><label className="admin-field"><span>Old price</span><input value={previewEditForm.oldPrice} onChange={setPreviewEditField("oldPrice")} /></label></div>
                  <div className="admin-row"><label className="admin-field"><span>Stock quantity</span><input value={previewEditForm.stock} onChange={setPreviewEditField("stock")} inputMode="numeric" placeholder="e.g. 12" /></label><label className="admin-field"><span>Abroad delivery fee (GHS)</span><input value={previewEditForm.abroadDeliveryFee} onChange={setPreviewEditField("abroadDeliveryFee")} inputMode="decimal" placeholder="0" /></label></div>
                  <label className="admin-field"><span>Description</span><textarea rows={4} value={previewEditForm.description} onChange={setPreviewEditField("description")} /></label>
                  <div className="admin-row"><label className="admin-field"><span>Department</span><select value={previewEditForm.dept} onChange={setPreviewEditField("dept")}>{DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></label><label className="admin-field"><span>Type</span><select value={previewEditForm.kind} onChange={setPreviewEditField("kind")}>{KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></label></div>
                  <label className="admin-field"><span>Shop</span><select value={previewEditForm.shop} onChange={setPreviewEditField("shop")} disabled={isShopAdmin}>{availableShops.map((sk) => <option key={sk} value={sk}>{formatShopLabel(sk)}</option>)}</select></label>
                  <label className="admin-field"><span>Home / Shop filter placement</span><select value={previewEditForm.homeSlot} onChange={setPreviewEditField("homeSlot")}>{HOME_FILTER_OPTIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                  <div className="admin-toggles">
                    <label className="admin-switch admin-switch--stock"><input type="checkbox" checked={previewEditForm.inStock} onChange={setPreviewEditField("inStock")} /><span className="admin-switch-ui" /><span className="admin-switch-label">In stock</span></label>
                    <label className="admin-switch admin-switch--featured"><input type="checkbox" checked={previewEditForm.featured} onChange={setPreviewEditField("featured")} /><span className="admin-switch-ui" /><span className="admin-switch-label">Featured</span></label>
                    <label className="admin-switch admin-switch--abroad"><input type="checkbox" checked={previewEditForm.shipsFromAbroad} onChange={setPreviewEditField("shipsFromAbroad")} /><span className="admin-switch-ui" /><span className="admin-switch-label">Ships from abroad</span></label>
                  </div>
                  <CustomizationsEditor formData={previewEditForm} add={addPreviewEditCustomizationGroup} update={updatePreviewEditCustomizationGroup} remove={removePreviewEditCustomizationGroup} addVal={(gid) => addOptionValueToGroup(gid, "preview")} updateVal={(gid, vid, k, v) => updateOptionValueInGroup(gid, vid, k, v, "preview")} removeVal={(gid, vid) => removeOptionValueFromGroup(gid, vid, "preview")} />
                  {previewEditError && <div className="admin-msg">{previewEditError}</div>}
                  {previewEditMsg && <div className="admin-msg">{previewEditMsg}</div>}
                  <div className="admin-upload-actions"><button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={cancelPreviewEdit}>Back</button><button type="button" className="admin-btn" onClick={handleSavePreviewEdit}>{editingPreviewId ? "Saving…" : "Save preview row"}</button></div>
                </div>
              </div>
              <aside className="admin-edit-side">
                <div className="admin-edit-side-card">
                  <h4 className="admin-edit-section-title">Images</h4>
                  {(previewRowToEdit?.image || previewRowToEdit?.images?.length) ? <ProductImagePreview image={previewRowToEdit.image} images={previewRowToEdit.images} name={previewRowToEdit.name} /> : null}
                  <label className="admin-field"><span>Choose new images</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handlePreviewEditImageChange} /></label>
                  <div className="admin-upload-actions"><button type="button" className="admin-secondary-btn" onClick={handlePreviewEditUploadImage}>{previewEditUploadingImage ? "Uploading…" : "Upload new images"}</button></div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (productToEdit) {
    return (
      <div className="adm-shell">
        <div className={`adm-overlay${sidebarOpen ? " adm-overlay--show" : ""}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`adm-sidebar${sidebarOpen ? " adm-sidebar--open" : ""}`}><SidebarContent /></aside>
        <header className="adm-topbar">
          <button className="adm-hamburger" onClick={() => setSidebarOpen((o) => !o)} type="button" aria-label="Menu">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="adm-topbar-title">Edit Product</span>
        </header>
        <main className="adm-main">
          <div className="adm-page-header"><h1 className="adm-page-title">Edit Product</h1><p className="adm-page-sub">Full-page editor — no modal lock, no blocked scrolling.</p></div>
          <div className="admin-card" style={{ maxWidth:"100%" }}>
            <div className="admin-edit-layout">
              <div className="admin-edit-main">
                <div className="admin-form admin-form--compact">
                  <label className="admin-field"><span>Name</span><input value={editForm.name} onChange={setEditField("name")} /></label>
                  <label className="admin-field"><span>Brand</span><input value={editForm.brand} onChange={setEditField("brand")} /></label>
                  <div className="admin-row"><label className="admin-field"><span>Base price</span><input value={editForm.price} onChange={setEditField("price")} /></label><label className="admin-field"><span>Old price</span><input value={editForm.oldPrice} onChange={setEditField("oldPrice")} /></label></div>
                  <div className="admin-row"><label className="admin-field"><span>Stock quantity</span><input value={editForm.stock} onChange={setEditField("stock")} inputMode="numeric" placeholder="e.g. 12" /></label><label className="admin-field"><span>Abroad delivery fee (GHS)</span><input value={editForm.abroadDeliveryFee} onChange={setEditField("abroadDeliveryFee")} inputMode="decimal" placeholder="0" /></label></div>
                  <label className="admin-field"><span>Description</span><textarea rows={4} value={editForm.description} onChange={setEditField("description")} /></label>
                  <div className="admin-row"><label className="admin-field"><span>Department</span><select value={editForm.dept} onChange={setEditField("dept")}>{DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></label><label className="admin-field"><span>Type</span><select value={editForm.kind} onChange={setEditField("kind")}>{KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></label></div>
                  <label className="admin-field"><span>Shop</span><select value={editForm.shop} onChange={setEditField("shop")} disabled={isShopAdmin}>{availableShops.map((sk) => <option key={sk} value={sk}>{formatShopLabel(sk)}</option>)}</select></label>
                  <label className="admin-field"><span>Home / Shop filter placement</span><select value={editForm.homeSlot} onChange={setEditField("homeSlot")}>{HOME_FILTER_OPTIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                  <div className="admin-toggles">
                    <label className="admin-switch admin-switch--stock"><input type="checkbox" checked={editForm.inStock} onChange={setEditField("inStock")} /><span className="admin-switch-ui" /><span className="admin-switch-label">In stock</span></label>
                    <label className="admin-switch admin-switch--featured"><input type="checkbox" checked={editForm.featured} onChange={setEditField("featured")} /><span className="admin-switch-ui" /><span className="admin-switch-label">Featured</span></label>
                    <label className="admin-switch admin-switch--abroad"><input type="checkbox" checked={editForm.shipsFromAbroad} onChange={setEditField("shipsFromAbroad")} /><span className="admin-switch-ui" /><span className="admin-switch-label">Ships from abroad</span></label>
                  </div>
                  <CustomizationsEditor formData={editForm} add={addEditCustomizationGroup} update={updateEditCustomizationGroup} remove={removeEditCustomizationGroup} addVal={(gid) => addOptionValueToGroup(gid, "edit")} updateVal={(gid, vid, k, v) => updateOptionValueInGroup(gid, vid, k, v, "edit")} removeVal={(gid, vid) => removeOptionValueFromGroup(gid, vid, "edit")} />
                  <label className="admin-field"><span>Admin password</span><input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} autoComplete="current-password" /></label>
                  {editError && <div className="admin-msg">{editError}</div>}
                  {editMsg && <div className="admin-msg">{editMsg}</div>}
                  <div className="admin-upload-actions"><button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={cancelEditProduct}>Back to products</button><button type="button" className="admin-btn" onClick={handleUpdateProduct}>{editingId ? "Verifying & saving…" : "Verify and save changes"}</button></div>
                </div>
              </div>
              <aside className="admin-edit-side">
                <div className="admin-edit-side-card">
                  <h4 className="admin-edit-section-title">Images</h4>
                  {(productToEdit?.image || productToEdit?.images?.length) ? <ProductImagePreview image={productToEdit.image} images={productToEdit.images} name={productToEdit.name} /> : null}
                  <label className="admin-field"><span>Choose new images</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleEditImageChange} /></label>
                  <div className="admin-upload-actions">
                    <button type="button" className="admin-secondary-btn" onClick={handleEditUploadImage}>{editUploadingImage ? "Uploading…" : "Upload new images"}</button>
                    <button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={resetEditImageState}>Clear new images</button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Main shell render ──
  return (
    <div className="adm-shell">
      {/* Overlay (mobile) */}
      <div className={`adm-overlay${sidebarOpen ? " adm-overlay--show" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`adm-sidebar${sidebarOpen ? " adm-sidebar--open" : ""}`}>
        <SidebarContent />
      </aside>

      {/* Mobile topbar */}
      <header className="adm-topbar">
        <button className="adm-hamburger" onClick={() => setSidebarOpen((o) => !o)} type="button" aria-label="Open menu">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="adm-topbar-brand">
          <div className="adm-logo-icon" style={{ width:28, height:28, borderRadius:6, fontSize:12 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="adm-topbar-title" style={{ fontSize:13 }}>BEME MARKET</span>
        </div>
      </header>

      {/* Main content */}
      <main className="adm-main">
        <div className="adm-page-header">
          <h1 className="adm-page-title">
            {activeMainTab === "products" ? pageTitle : activeMainTab === "manual" ? "Add Product" : activeMainTab === "csv" ? "CSV Imports" : activeMainTab === "offers" ? "Offers of the Week" : "Flash Deals"}
          </h1>
          <p className="adm-page-sub">
            {activeMainTab === "products" ? pageSub : activeMainTab === "manual" ? "Manually create a new product listing." : activeMainTab === "csv" ? "Bulk import products from a CSV file." : activeMainTab === "offers" ? "Manage this week's featured offers." : "Create time-limited flash deals."}
          </p>
        </div>

        {/* ⚡ Flash Deals */}
        {activeMainTab === "flash" && <FlashDealsManager />}

        {/* Offers */}
        {activeMainTab === "offers" && <OffersManager />}

        {/* CSV Imports */}
        {activeMainTab === "csv" && (
          <div>
            <div className="admin-card" style={{ maxWidth:"100%", marginBottom:0 }}>
              <div className="admin-subtabs" style={{ marginBottom:18 }}>
                {CSV_IMPORT_TABS.map((tab) => (
                  <button key={tab.key} type="button" className={`admin-subtab${activeCsvTab === tab.key ? " admin-subtab--active" : ""}`} onClick={() => { setActiveCsvTab(tab.key); setImportPreviewRows([]); setImportPreviewMsg(""); setImportSearchTerm(""); }}>{tab.label}</button>
                ))}
              </div>
              {activeCsvTab === "standard" ? (
                <div className="admin-upload-card admin-upload-card--import">
                  <div className="admin-upload-head"><div><h3 className="admin-upload-title">Standard CSV Imports</h3><p className="admin-upload-sub">Use this for your regular local product uploads.</p></div></div>
                  <label className="admin-field"><span>Standard CSV data</span><textarea value={standardImportText} onChange={(e) => setStandardImportText(e.target.value)} placeholder={STANDARD_IMPORT_SAMPLE} rows={10} className="admin-code-textarea" /></label>
                  <div className="admin-upload-actions admin-upload-actions--wrap">
                    <button type="button" className="admin-secondary-btn" onClick={() => setStandardImportText(STANDARD_IMPORT_SAMPLE)}>Use sample header</button>
                    <button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={() => { setStandardImportText(""); setStandardImportMsg(""); setStandardImportMeta(initialImportMeta); setImportPreviewRows([]); setImportPreviewMsg(""); }}>Clear CSV</button>
                    <button type="button" className="admin-secondary-btn" onClick={() => handlePreviewImport("standard")}>Preview import</button>
                    <button type="button" className="admin-btn" onClick={handleBulkImport} disabled={!importPreviewRows.length || standardImporting}>{standardImporting ? "Importing…" : "Import reviewed products"}</button>
                  </div>
                </div>
              ) : (
                <div className="admin-upload-card admin-upload-card--import">
                  <div className="admin-upload-head"><div><h3 className="admin-upload-title">CJ Imports</h3><p className="admin-upload-sub">Separated for dropshipping supplier imports and CJ-compatible validation.</p></div></div>
                  <div className="admin-cj-note"><strong>CJ preparation notice:</strong> this section validates CJ-style import structure and stores preview-ready data.</div>
                  <label className="admin-field"><span>CJ CSV data</span><textarea value={cjImportText} onChange={(e) => setCjImportText(e.target.value)} placeholder={CJ_IMPORT_SAMPLE} rows={10} className="admin-code-textarea" /></label>
                  <div className="admin-upload-actions admin-upload-actions--wrap">
                    <button type="button" className="admin-secondary-btn" onClick={() => setCjImportText(CJ_IMPORT_SAMPLE)}>Use CJ sample</button>
                    <button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={() => { setCjImportText(""); setCjImportMsg(""); setCjImportMeta({ ...initialImportMeta, sourceType:"cj" }); setImportPreviewRows([]); setImportPreviewMsg(""); }}>Clear CJ CSV</button>
                    <button type="button" className="admin-secondary-btn" onClick={() => handlePreviewImport("cj")}>Preview CJ import</button>
                    <button type="button" className="admin-btn" onClick={handleBulkImport} disabled={!importPreviewRows.length || standardImporting}>{standardImporting ? "Importing…" : "Import reviewed CJ products"}</button>
                  </div>
                </div>
              )}
              {activeImportMsg && <div className="admin-msg" style={{ marginTop:12 }}>{activeImportMsg}</div>}
              {(activeImportMeta.headerErrors.length || activeImportMeta.rowErrors.length) ? (
                <div className="admin-import-validation" style={{ marginTop:12 }}>
                  {activeImportMeta.headerErrors.length ? <div className="admin-import-validation-block"><h4 className="admin-import-validation-title">Header validation</h4><div className="admin-validation-list">{activeImportMeta.headerErrors.map((item, i) => <div key={i} className="admin-validation-item">{item}</div>)}</div></div> : null}
                  {activeImportMeta.rowErrors.length ? <div className="admin-import-validation-block"><h4 className="admin-import-validation-title">Row validation</h4><div className="admin-validation-list">{activeImportMeta.rowErrors.slice(0, 8).map((item, i) => <div key={i} className="admin-validation-item">{item}</div>)}{activeImportMeta.rowErrors.length > 8 && <div className="admin-validation-item">+{activeImportMeta.rowErrors.length - 8} more issue(s)</div>}</div></div> : null}
                </div>
              ) : null}
              {activeImportMeta.totalRows > 0 && <div className="admin-import-stats" style={{ marginTop:12 }}><div className="admin-import-stat"><span className="admin-import-stat-label">Rows</span><strong>{activeImportMeta.totalRows}</strong></div><div className="admin-import-stat"><span className="admin-import-stat-label">Valid</span><strong>{activeImportMeta.validRows}</strong></div><div className="admin-import-stat"><span className="admin-import-stat-label">Skipped</span><strong>{activeImportMeta.skippedRows}</strong></div></div>}
              {importPreviewMsg && <div className="admin-msg" style={{ marginTop:12 }}>{importPreviewMsg}</div>}
              {importPreviewRows.length ? (
                <div className="admin-import-preview-card">
                  <div className="admin-import-preview-head"><div><h3 className="admin-import-preview-title">{activeCsvTab === "cj" ? "CJ import preview list" : "Import preview list"}</h3><p className="admin-import-preview-sub">Review status, image coverage, and product details before import.</p></div><div className="admin-import-preview-tools"><label className="admin-field admin-field--compact"><span>Search preview rows</span><input value={importSearchTerm} onChange={(e) => setImportSearchTerm(e.target.value)} placeholder="Search preview rows..." /></label></div></div>
                  <div className="admin-import-preview-list">
                    {filteredImportPreviewRows.length ? filteredImportPreviewRows.map((row) => (
                      <div className="admin-import-row" key={row.id}>
                        <div className="admin-import-row-media">{row.image ? <img src={row.image} alt={row.name} className="admin-import-row-image" /> : <div className="admin-import-row-image admin-import-row-image--empty">No image</div>}</div>
                        <div className="admin-import-row-content">
                          <div className="admin-import-row-top"><div><h3 className="admin-import-row-name">{row.name}</h3><div className="admin-import-row-meta"><span>{formatShopLabel(row.shop)}</span><span>{titleize(row.kind)}</span><span>{titleize(row.dept)}</span>{row.brand && <span>{row.brand}</span>}{row.stock !== null && <span>Stock: {row.stock}</span>}</div></div><div className="admin-product-price">{formatMoney(row.price)}</div></div>
                          <StatusFlags inStock={row.inStock} featured={row.featured} shipsFromAbroad={row.shipsFromAbroad} />
                          {row.description && <p className="admin-import-row-desc">{row.description}</p>}
                          <div className="admin-import-row-actions"><button type="button" className="admin-secondary-btn" onClick={() => startPreviewEdit(row)}>Edit row</button><button type="button" className="admin-danger-btn" onClick={() => handleDeletePreviewRow(row.id)}>Remove row</button></div>
                        </div>
                      </div>
                    )) : <div className="admin-products-empty">No preview rows match your search.</div>}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Manual Add Product */}
        {activeMainTab === "manual" && (
          <div className="admin-card" style={{ maxWidth:"100%" }}>
            <form className="admin-form" onSubmit={onSubmit}>
              <label className="admin-field"><span>Name</span><input value={form.name} onChange={setField("name")} autoComplete="off" /></label>
              <label className="admin-field"><span>Brand (optional)</span><input value={form.brand} onChange={setField("brand")} autoComplete="off" /></label>
              <div className="admin-row"><label className="admin-field"><span>Base price (GHS)</span><input value={form.price} onChange={setField("price")} inputMode="decimal" /></label><label className="admin-field"><span>Old price (optional)</span><input value={form.oldPrice} onChange={setField("oldPrice")} inputMode="decimal" /></label></div>
              <div className="admin-row"><label className="admin-field"><span>Stock quantity</span><input value={form.stock} onChange={setField("stock")} inputMode="numeric" placeholder="e.g. 12" /></label><label className="admin-field"><span>Abroad delivery fee (GHS)</span><input value={form.abroadDeliveryFee} onChange={setField("abroadDeliveryFee")} inputMode="decimal" placeholder="0" /></label></div>
              <label className="admin-field"><span>Description</span><textarea value={form.description} onChange={setField("description")} rows={5} /></label>
              <div className="admin-row"><label className="admin-field"><span>Department</span><select value={form.dept} onChange={setField("dept")}>{DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></label><label className="admin-field"><span>Type</span><select value={form.kind} onChange={setField("kind")}>{KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></label></div>
              <label className="admin-field"><span>Shop</span><select value={form.shop} onChange={setField("shop")} disabled={isShopAdmin}>{availableShops.map((sk) => <option key={sk} value={sk}>{formatShopLabel(sk)}</option>)}</select></label>
              <label className="admin-field"><span>Home / Shop filter placement</span><select value={form.homeSlot} onChange={setField("homeSlot")}>{HOME_FILTER_OPTIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
              <div className="admin-upload-card">
                <div className="admin-upload-head"><div><h3 className="admin-upload-title">Product images</h3><p className="admin-upload-sub">Upload at least one image before saving the product.</p></div></div>
                <label className="admin-field"><span>Select images</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleImageChange} /></label>
                <div className="admin-upload-actions"><button type="button" className="admin-secondary-btn" onClick={handleUploadImage} disabled={!imageFiles.length || uploadingImage}>{uploadingImage ? "Uploading…" : "Upload images"}</button><button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={resetImageState} disabled={!imageFiles.length && !uploadedImages.length}>Clear images</button></div>
                {imagePreviews.length ? <div className="admin-image-preview-grid">{imagePreviews.map((item, index) => <div className="admin-image-preview-wrap" key={item.key}><img src={item.preview} alt={`Selected ${index + 1}`} className="admin-image-preview" /><div className="admin-image-preview-overlay"><span className="admin-image-index">{index + 1}</span><button type="button" className="admin-image-remove-btn" onClick={() => removeSelectedImage(index)}>×</button></div></div>)}</div> : null}
                {uploadedImages.length ? <div className="admin-upload-success-wrap"><div className="admin-upload-success"><span className="admin-upload-badge">Uploaded</span><span className="admin-upload-count">{uploadedImages.length} image{uploadedImages.length === 1 ? "" : "s"} ready</span></div><div className="admin-uploaded-grid">{uploadedImages.map((item, index) => <div className="admin-uploaded-thumb" key={item.publicId || item.url || index}><img src={item.url} alt={`Uploaded ${index + 1}`} className="admin-uploaded-thumb-img" /><span className="admin-uploaded-badge">{index === 0 ? "Cover" : `Image ${index + 1}`}</span></div>)}</div></div> : null}
              </div>
              <div className="admin-toggles">
                <label className="admin-switch admin-switch--stock"><input type="checkbox" checked={form.inStock} onChange={setField("inStock")} /><span className="admin-switch-ui" /><span className="admin-switch-label">In stock</span></label>
                <label className="admin-switch admin-switch--featured"><input type="checkbox" checked={form.featured} onChange={setField("featured")} /><span className="admin-switch-ui" /><span className="admin-switch-label">Featured</span></label>
                <label className="admin-switch admin-switch--abroad"><input type="checkbox" checked={form.shipsFromAbroad} onChange={setField("shipsFromAbroad")} /><span className="admin-switch-ui" /><span className="admin-switch-label">Ships from abroad</span></label>
              </div>
              <CustomizationsEditor formData={form} add={addCustomizationGroup} update={updateCustomizationGroup} remove={removeCustomizationGroup} addVal={(gid) => addOptionValueToGroup(gid, "create")} updateVal={(gid, vid, k, v) => updateOptionValueInGroup(gid, vid, k, v, "create")} removeVal={(gid, vid) => removeOptionValueFromGroup(gid, vid, "create")} />
              {msg && <div className="admin-msg">{msg}</div>}
              <button className="admin-btn" type="submit" disabled={submitting || uploadingImage}>{submitting ? "Adding…" : "Add product"}</button>
            </form>
          </div>
        )}

        {/* Products Manager */}
        {activeMainTab === "products" && (
          <div>
            {productToDelete && (
              <div className="admin-card" style={{ maxWidth:"100%", marginBottom:16 }}>
                <div className="admin-head"><h3 className="admin-title admin-title--small">Confirm product deletion</h3><p className="admin-sub">Deleting <strong>{productToDelete.name}</strong></p></div>
                <label className="admin-field"><span>Admin password</span><input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" /></label>
                {deleteError && <div className="admin-msg">{deleteError}</div>}
                <div className="admin-upload-actions" style={{ marginTop:12 }}>
                  <button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={() => { setProductToDelete(null); setDeletePassword(""); setDeleteError(""); }}>Cancel</button>
                  <button type="button" className="admin-danger-btn" onClick={handleDeleteProduct}>{deletingId ? "Verifying & deleting…" : "Verify and delete"}</button>
                </div>
              </div>
            )}
            {bulkDeleteMode && (
              <div className="admin-card" style={{ maxWidth:"100%", marginBottom:16 }}>
                <div className="admin-head"><h3 className="admin-title admin-title--small">Delete selected products</h3><p className="admin-sub">{selectedProducts.length} selected product{selectedProducts.length === 1 ? "" : "s"}</p></div>
                <label className="admin-field"><span>Admin password</span><input type="password" value={bulkDeletePassword} onChange={(e) => setBulkDeletePassword(e.target.value)} autoComplete="current-password" /></label>
                {bulkDeleteError && <div className="admin-msg">{bulkDeleteError}</div>}
                <div className="admin-upload-actions" style={{ marginTop:12 }}>
                  <button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={() => { setBulkDeleteMode(false); setBulkDeletePassword(""); setBulkDeleteError(""); }}>Cancel</button>
                  <button type="button" className="admin-danger-btn" onClick={handleBulkDeleteProducts}>{bulkDeleting ? "Verifying & deleting…" : `Delete ${selectedProducts.length} selected`}</button>
                </div>
              </div>
            )}
            {msg && <div className="admin-msg" style={{ marginBottom:14 }}>{msg}</div>}
            <div className="admin-card" style={{ maxWidth:"100%" }}>
              <div className="admin-search-wrap"><label className="admin-field"><span>Search products</span><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, brand, shop, type, owner, description..." /></label></div>
              <div className="admin-manager-toolbar">
                <button type="button" className="admin-secondary-btn" onClick={toggleMultiSelectMode}>{multiSelectMode ? "Exit multi-select" : "Multi-select"}</button>
                {multiSelectMode && <>
                  <button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={clearAllSelections}>Clear selection</button>
                  <button type="button" className="admin-danger-btn" onClick={startBulkDelete}>Delete selected ({selectedProductIds.length})</button>
                </>}
              </div>
              {loadingProducts ? <div className="admin-products-empty">Loading products…</div> : productsError ? <div className="admin-msg">{productsError}</div> : groupedProducts.length ? (
                <div className="admin-groups-list">
                  {groupedProducts.map((group) => (
                    <div key={group.shop} className="admin-group-block">
                      <div className="admin-head admin-head--group">
                        <div><h3 className="admin-title admin-title--small">{group.label}</h3><p className="admin-sub">{group.items.length} product{group.items.length === 1 ? "" : "s"}</p></div>
                        {multiSelectMode && <div className="admin-group-actions"><button type="button" className="admin-secondary-btn" onClick={() => selectAllInGroup(group.items)}>Select all</button><button type="button" className="admin-secondary-btn admin-secondary-btn--ghost" onClick={() => clearAllInGroup(group.items)}>Clear group</button></div>}
                      </div>
                      {multiSelectMode ? (
                        <div className="admin-multiselect-list">
                          {group.items.map((product) => (
                            <label key={product.id} className="admin-multiselect-item">
                              <input type="checkbox" checked={isProductSelected(product.id)} disabled={!canCurrentUserDeleteProduct(product)} onChange={() => toggleProductSelection(product)} />
                              <div><div className="admin-multiselect-name">{product.name}</div><div className="admin-multiselect-meta">{formatShopLabel(product.shop)}</div></div>
                              <div className="admin-multiselect-price">{formatMoney(product.price)}</div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="admin-products-list">
                          {group.items.map((product) => {
                            const canDelete = canCurrentUserDeleteProduct(product);
                            const canEdit = canCurrentUserEditProduct(product);
                            return (
                              <div className="admin-product-item" key={product.id}>
                                <div className="admin-product-media"><ProductImagePreview image={product.image} images={product.images} name={product.name} /></div>
                                <div className="admin-product-content">
                                  <div className="admin-product-top">
                                    <div><h3 className="admin-product-name">{product.name}</h3><div className="admin-product-meta"><span>{formatShopLabel(product.shop)}</span><span>{titleize(product.kind)}</span><span>{titleize(product.dept)}</span>{product.brand && <span>{product.brand}</span>}{product.stock !== null && <span>Stock: {product.stock}</span>}</div></div>
                                    <div className="admin-product-price">{formatMoney(product.price)}</div>
                                  </div>
                                  <StatusFlags inStock={product.inStock} featured={product.featured} shipsFromAbroad={product.shipsFromAbroad} />
                                  {product.description && <p className="admin-import-row-desc">{product.description}</p>}
                                  <div className="admin-product-actions">
                                    <button type="button" className="admin-secondary-btn" onClick={() => startEditProduct(product)} disabled={!canEdit}>{canEdit ? "Edit product" : "Read only"}</button>
                                    <button type="button" className="admin-danger-btn" onClick={() => startDeleteProduct(product)} disabled={!canDelete}>{canDelete ? "Delete product" : "Read only"}</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <div className="admin-products-empty">{searchTerm.trim() ? "No products match your search." : "No products found yet."}</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { DEPARTMENTS, KINDS, SHOPS } from "../constants/catalog";
import { useAuth } from "../context/AuthContext";
import {
  uploadImagesToCloudinary,
  validateImageFiles,
} from "../lib/cloudinary";
import "./Admin.css";

const COLLECTION_NAME = "Products";

const HOME_FILTER_OPTIONS = [
  { key: "phones", label: "Phones" },
  { key: "laptops", label: "Laptops" },
  { key: "shoes", label: "Shoes" },
  { key: "clothing", label: "Clothing" },
  { key: "kids", label: "Kids" },
  { key: "others", label: "Others" },
];

const makeOptionValue = () => ({
  id: crypto.randomUUID(),
  label: "",
  priceBump: "",
});

const makeOptionGroup = () => ({
  id: crypto.randomUUID(),
  name: "",
  type: "buttons",
  required: true,
  values: [makeOptionValue(), makeOptionValue()],
});

const initial = {
  name: "",
  brand: "",
  price: "",
  oldPrice: "",
  description: "",
  dept: "men",
  kind: "fashion",
  shop: "fashion",
  homeSlot: "others",
  inStock: true,
  featured: false,
  shipsFromAbroad: false,
  stock: "",
  abroadDeliveryFee: "",
  customizations: [],
};

const BULK_IMPORT_SAMPLE = `product_name,category,brand,price_ghs,stock,abroad_delivery_fee,key_features,target_customer,customization_options,short_description,ships_from_abroad,in_stock,featured
Samsung Galaxy S23,Phone,Samsung,7500,12,45,"8GB RAM, 128GB–256GB storage, AMOLED display","Smartphone users, professionals","Storage: 128GB(+0)|256GB(+600); Color: Black(+0)|Green(+0)|Cream(+0)","Samsung Galaxy S23 offers powerful flagship performance with a bright AMOLED display and fast processing for work, entertainment, and daily use.",yes,yes,no
Apple MacBook Air M2,Laptop,Apple,11000,8,0,"8GB–16GB RAM, 256GB–512GB SSD, Apple M2 chip","Students, professionals, creators","RAM: 8GB(+0)|16GB(+1200); Storage: 256GB(+0)|512GB(+1800); Color: Silver(+0)|Space Gray(+0)|Midnight(+0)","Apple MacBook Air M2 delivers smooth everyday performance in a slim and lightweight design.",no,yes,yes
Apple AirPods Pro 2,Accessory,Apple,3200,20,0,"Active noise cancellation, spatial audio","Apple device users","Color: White(+0)","Apple AirPods Pro 2 combine premium sound, comfort, and wireless convenience for everyday listening.",no,yes,no`;

function makeEditableValuesFromLegacy(values) {
  const safeValues = Array.isArray(values) ? values : [];
  const mapped = safeValues
    .map((value) => {
      if (value && typeof value === "object") {
        return {
          id: value.id || crypto.randomUUID(),
          label: String(value.label || value.value || "").trim(),
          priceBump:
            value.priceBump !== undefined &&
            value.priceBump !== null &&
            value.priceBump !== ""
              ? String(Number(value.priceBump) || 0)
              : "",
        };
      }

      const label = String(value || "").trim();
      if (!label) return null;

      return {
        id: crypto.randomUUID(),
        label,
        priceBump: "",
      };
    })
    .filter(Boolean);

  if (mapped.length >= 2) return mapped;
  if (mapped.length === 1) return [...mapped, makeOptionValue()];
  return [makeOptionValue(), makeOptionValue()];
}

function normalizeCustomizationGroups(groups) {
  return groups
    .map((group) => {
      const normalizedValues = Array.isArray(group.values)
        ? group.values
            .map((value) => {
              const label = String(value?.label || "").trim();
              const rawBump = String(value?.priceBump ?? "").trim();
              const priceBump =
                rawBump === ""
                  ? 0
                  : Number.isFinite(Number(rawBump))
                  ? Number(rawBump)
                  : 0;

              if (!label) return null;

              return {
                id: value?.id || crypto.randomUUID(),
                label,
                priceBump,
              };
            })
            .filter(Boolean)
        : [];

      return {
        id: group.id,
        name: String(group.name || "").trim(),
        type: group.type === "select" ? "select" : "buttons",
        required: !!group.required,
        values: normalizedValues,
      };
    })
    .filter((group) => group.name && group.values.length > 0);
}

function toEditableCustomizationGroups(groups) {
  if (!Array.isArray(groups)) return [];

  return groups.map((group, index) => ({
    id: group?.id || crypto.randomUUID() || `option-${index}`,
    name: String(group?.name || "").trim(),
    type: group?.type === "select" ? "select" : "buttons",
    required: group?.required !== false,
    values: makeEditableValuesFromLegacy(group?.values),
  }));
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return `GHS ${amount.toFixed(2)}`;
}

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeShopKey(value) {
  return String(value || "").trim().toLowerCase();
}

function formatShopLabel(value) {
  const key = normalizeShopKey(value);
  const match = SHOPS.find((shop) => shop.key === key);
  if (match?.label) return match.label;
  return titleize(value);
}

function normalizeAdminProduct(snapshotDoc) {
  const d = snapshotDoc.data() || {};
  const images = Array.isArray(d.images)
    ? d.images.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const cover = String(d.image || images[0] || "").trim();

  return {
    id: snapshotDoc.id,
    name: String(d.name || "").trim(),
    brand: String(d.brand || "").trim(),
    description: String(d.description || "").trim(),
    price: Number(d.price || 0),
    oldPrice:
      d.oldPrice !== undefined && d.oldPrice !== null && d.oldPrice !== ""
        ? Number(d.oldPrice || 0)
        : null,
    image: cover,
    images: images.length ? images : cover ? [cover] : [],
    imageMeta: d.imageMeta || null,
    imageMetaList: Array.isArray(d.imageMetaList) ? d.imageMetaList : [],
    dept: String(d.dept || "").trim().toLowerCase(),
    kind: String(d.kind || "").trim().toLowerCase(),
    shop: normalizeShopKey(d.shop || "fashion"),
    homeSlot: String(d.homeSlot || "others").trim().toLowerCase(),
    ownerId: String(d.ownerId || "").trim(),
    ownerName: String(d.ownerName || d.sellerName || "").trim(),
    ownerEmail: String(d.ownerEmail || "").trim(),
    featured: !!d.featured,
    inStock: d.inStock !== false,
    shipsFromAbroad: !!d.shipsFromAbroad,
    stock:
      d.stock !== undefined && d.stock !== null && d.stock !== ""
        ? Number(d.stock)
        : null,
    abroadDeliveryFee:
      d.abroadDeliveryFee !== undefined &&
      d.abroadDeliveryFee !== null &&
      d.abroadDeliveryFee !== ""
        ? Number(d.abroadDeliveryFee)
        : 0,
    customizations: Array.isArray(d.customizations) ? d.customizations : [],
    createdAt: d.createdAt || null,
    updatedAt: d.updatedAt || null,
  };
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function sortByCreatedAtDesc(rows) {
  return [...rows].sort((a, b) => {
    const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bt - at;
  });
}

function getEmailName(email) {
  const local = String(email || "").trim().split("@")[0] || "";
  return titleize(local);
}

function resolveCurrentSellerName(user, profile) {
  const directCandidates = [
    profile?.sellerName,
    profile?.displayName,
    profile?.fullName,
    profile?.name,
    profile?.username,
    profile?.shopAdminName,
    profile?.ownerName,
  ];

  for (const candidate of directCandidates) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }

  const firstName = String(profile?.firstName || "").trim();
  const lastName = String(profile?.lastName || "").trim();
  const joinedName = `${firstName} ${lastName}`.trim();
  if (joinedName) return joinedName;

  if (profile?.email) {
    const emailName = getEmailName(profile.email);
    if (emailName) return emailName;
  }

  if (user?.displayName) {
    const displayName = String(user.displayName || "").trim();
    if (displayName) return displayName;
  }

  if (user?.email) {
    const emailName = getEmailName(user.email);
    if (emailName) return emailName;
  }

  return "Beme Seller";
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function normalizeImportHeader(header) {
  const key = String(header || "").trim().toLowerCase();

  const map = {
    title: "title",
    name: "title",
    product_name: "title",
    product: "title",
    category: "category",
    brand: "brand",
    price: "price",
    price_ghs: "price",
    priceghs: "price",
    stock: "stock",
    quantity: "stock",
    abroad_delivery_fee: "abroadDeliveryFee",
    abroaddeliveryfee: "abroadDeliveryFee",
    delivery_fee_abroad: "abroadDeliveryFee",
    description: "description",
    short_description: "description",
    shortdescription: "description",
    key_features: "key_features",
    keyfeatures: "key_features",
    target_customer: "target_customer",
    targetcustomer: "target_customer",
    customization_options: "customizations",
    customizations: "customizations",
    oldprice: "oldPrice",
    old_price: "oldPrice",
    image: "image",
    imageurl: "image",
    image_url: "image",
    images: "images",
    featured: "featured",
    instock: "inStock",
    in_stock: "inStock",
    ships_from_abroad: "shipsFromAbroad",
    shipsfromabroad: "shipsFromAbroad",
    imported: "shipsFromAbroad",
  };

  return map[key] || key;
}

function parseCsvText(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) =>
    normalizeImportHeader(header)
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function parseBooleanish(value, fallback = false) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;

  if (
    ["true", "yes", "1", "in stock", "instock", "imported", "abroad"].includes(
      raw
    )
  ) {
    return true;
  }

  if (
    ["false", "no", "0", "out of stock", "outofstock", "local"].includes(raw)
  ) {
    return false;
  }

  return fallback;
}

function parseNumberish(value, fallback = 0) {
  const cleaned = String(value || "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (!cleaned) return fallback;

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function parseOptionValueToken(token, fallbackIndex = 0) {
  const raw = String(token || "").trim();
  if (!raw) return null;

  const match = raw.match(/^(.*?)\s*\(\s*([+-]?\d+(?:\.\d+)?)\s*\)\s*$/);
  if (match) {
    return {
      id: `bulk-option-value-${fallbackIndex}-${crypto.randomUUID()}`,
      label: String(match[1] || "").trim(),
      priceBump: Number(match[2] || 0),
    };
  }

  const plusMatch = raw.match(/^(.*?)\s*\(\s*\+?\s*([+-]?\d+(?:\.\d+)?)\s*\)\s*$/);
  if (plusMatch) {
    return {
      id: `bulk-option-value-${fallbackIndex}-${crypto.randomUUID()}`,
      label: String(plusMatch[1] || "").trim(),
      priceBump: Number(plusMatch[2] || 0),
    };
  }

  return {
    id: `bulk-option-value-${fallbackIndex}-${crypto.randomUUID()}`,
    label: raw,
    priceBump: 0,
  };
}

function parseCustomizationsFromText(input) {
  const raw = String(input || "").trim();
  if (!raw) return [];

  return raw
    .split(";")
    .map((groupText, index) => {
      const [namePart, valuesPart] = groupText.split(":");
      const name = String(namePart || "").trim();
      const values = String(valuesPart || "")
        .split("|")
        .map((value, valueIndex) =>
          parseOptionValueToken(value, index * 100 + valueIndex)
        )
        .filter(Boolean);

      if (!name || values.length < 1) return null;

      return {
        id: `bulk-option-${index}-${crypto.randomUUID()}`,
        name,
        type: "buttons",
        required: true,
        values,
      };
    })
    .filter(Boolean);
}

function parseImageList(row) {
  const image = String(row.image || row.imageUrl || "").trim();
  const imagesRaw = String(row.images || "").trim();

  const images = imagesRaw
    ? imagesRaw
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (image && !images.includes(image)) {
    images.unshift(image);
  }

  return images;
}

function findShopByKeyword(shops, keywords = []) {
  return (
    shops.find((shop) => {
      const key = String(shop.key || "").toLowerCase();
      const label = String(shop.label || "").toLowerCase();
      return keywords.some(
        (word) => key.includes(word) || label.includes(word)
      );
    })?.key || ""
  );
}

function inferShopFromCategory(category, shops, fallbackShop) {
  const raw = String(category || "").trim().toLowerCase();

  if (
    [
      "phone",
      "phones",
      "laptop",
      "laptops",
      "gaming",
      "accessory",
      "accessories",
      "tablet",
      "tv",
      "electronics",
      "technology",
    ].includes(raw)
  ) {
    return (
      findShopByKeyword(shops, ["tech", "technology", "electronics"]) ||
      fallbackShop
    );
  }

  if (["perfume", "perfumes", "fragrance", "fragrances"].includes(raw)) {
    return findShopByKeyword(shops, ["perfume", "fragrance"]) || fallbackShop;
  }

  if (
    ["fashion", "clothing", "dress", "shirt", "hoodie", "shoes", "bag"].includes(
      raw
    )
  ) {
    return findShopByKeyword(shops, ["fashion", "cloth"]) || fallbackShop;
  }

  return fallbackShop;
}

function buildImportDescription(row) {
  const direct = String(row.description || "").trim();
  if (direct) return direct;

  const parts = [
    String(row.key_features || "").trim(),
    String(row.target_customer || "").trim(),
  ].filter(Boolean);

  return parts.join(". ");
}

function findValidKind(category, kindOptions, fallback) {
  const raw = String(category || "").trim().toLowerCase();

  const preferred = [
    raw,
    [
      "phone",
      "phones",
      "laptop",
      "laptops",
      "gaming",
      "accessory",
      "accessories",
      "tablet",
      "electronics",
      "technology",
    ].includes(raw)
      ? "technology"
      : "",
    ["perfume", "perfumes", "fragrance", "fragrances"].includes(raw)
      ? "perfumes"
      : "",
    ["fashion", "clothing", "dress", "shirt", "hoodie", "shoes", "bag"].includes(
      raw
    )
      ? "fashion"
      : "",
  ].filter(Boolean);

  const match = preferred.find((item) => kindOptions.includes(item));
  return match || fallback || kindOptions[0] || "fashion";
}

function findValidDept(category, deptOptions, fallback) {
  const raw = String(category || "").trim().toLowerCase();

  const preferred = [
    raw === "men" ? "men" : "",
    raw === "women" ? "women" : "",
    raw === "unisex" ? "unisex" : "",
    "unisex",
  ].filter(Boolean);

  const match = preferred.find((item) => deptOptions.includes(item));
  return match || fallback || deptOptions[0] || "men";
}

function productMatchesSearch(product, term) {
  const q = String(term || "").trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    product.name,
    product.brand,
    product.description,
    product.shop,
    product.ownerName,
    product.ownerEmail,
    product.kind,
    product.dept,
    product.inStock ? "in stock" : "out of stock",
    product.featured ? "featured" : "",
    product.shipsFromAbroad ? "ships from abroad imported" : "local",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function importRowMatchesSearch(row, term) {
  const q = String(term || "").trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    row.name,
    row.brand,
    row.description,
    row.shop,
    row.kind,
    row.dept,
    row.inStock ? "in stock" : "out of stock",
    row.featured ? "featured" : "",
    row.shipsFromAbroad ? "ships from abroad imported" : "local",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function StatusFlags({ inStock, featured, shipsFromAbroad }) {
  return (
    <div className="admin-product-flags">
      <span
        className={`admin-flag ${
          inStock ? "admin-flag--success" : "admin-flag--danger"
        }`}
      >
        {inStock ? "In stock" : "Out of stock"}
      </span>

      {featured ? (
        <span className="admin-flag admin-flag--featured">Featured</span>
      ) : null}

      {shipsFromAbroad ? (
        <span className="admin-flag admin-flag--imported">
          Ships from abroad
        </span>
      ) : null}
    </div>
  );
}

function ProductImagePreview({
  image,
  images,
  name,
  emptyLabel = "No image",
  compact = false,
}) {
  const safeImages = Array.isArray(images)
    ? images.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const cover = String(image || safeImages[0] || "").trim();

  if (!cover) {
    return (
      <div
        className={`admin-product-image admin-product-image--empty${
          compact ? " admin-product-image--compact" : ""
        }`}
      >
        {emptyLabel}
      </div>
    );
  }

  const galleryCount = safeImages.length;

  return (
    <div className="admin-product-cover-wrap">
      <img src={cover} alt={name} className="admin-product-image" />
      {galleryCount > 1 ? (
        <span className="admin-product-gallery-badge">
          +{galleryCount - 1} more
        </span>
      ) : null}
    </div>
  );
}

function OptionValuesEditor({
  values,
  onChange,
  onAdd,
  onRemove,
  compact = false,
}) {
  return (
    <div className={`admin-option-values${compact ? " admin-option-values--compact" : ""}`}>
      {values.map((value, index) => (
        <div className="admin-option-value-row" key={value.id}>
          <label className="admin-field">
            <span>Option value {index + 1}</span>
            <input
              value={value.label}
              onChange={(e) => onChange(value.id, "label", e.target.value)}
              placeholder="e.g. 256GB"
            />
          </label>

          <label className="admin-field">
            <span>Price bump (GHS)</span>
            <input
              value={value.priceBump}
              onChange={(e) => onChange(value.id, "priceBump", e.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </label>

          <button
            type="button"
            className="admin-secondary-btn admin-secondary-btn--ghost"
            onClick={() => onRemove(value.id)}
            disabled={values.length <= 1}
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        className="admin-secondary-btn"
        onClick={onAdd}
      >
        + Add value
      </button>
    </div>
  );
}

export default function Admin() {
  const {
    user,
    profile,
    role,
    adminShop,
    isSuperAdmin,
    isShopAdmin,
    reauthenticate,
  } = useAuth();

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

  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportMsg, setBulkImportMsg] = useState("");

  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const [importSearchTerm, setImportSearchTerm] = useState("");
  const [importPreviewMsg, setImportPreviewMsg] = useState("");
  const [editingPreviewId, setEditingPreviewId] = useState("");
  const [previewRowToEdit, setPreviewRowToEdit] = useState(null);
  const [previewEditForm, setPreviewEditForm] = useState(initial);
  const [previewEditImageFiles, setPreviewEditImageFiles] = useState([]);
  const [previewEditImagePreviews, setPreviewEditImagePreviews] = useState([]);
  const [previewEditUploadedImages, setPreviewEditUploadedImages] = useState([]);
  const [previewEditUploadingImage, setPreviewEditUploadingImage] =
    useState(false);
  const [previewEditError, setPreviewEditError] = useState("");
  const [previewEditMsg, setPreviewEditMsg] = useState("");

  const normalizedAdminShop = useMemo(
    () => normalizeShopKey(adminShop),
    [adminShop]
  );

  const deptOptions = useMemo(() => DEPARTMENTS.map((d) => d.key), []);
  const kindOptions = useMemo(() => KINDS.map((k) => k.key), []);
  const allShopOptions = useMemo(() => SHOPS.map((s) => s.key), []);

  const availableShops = useMemo(() => {
    if (isSuperAdmin) return allShopOptions;
    if (isShopAdmin && normalizedAdminShop) return [normalizedAdminShop];
    return [];
  }, [isSuperAdmin, isShopAdmin, normalizedAdminShop, allShopOptions]);

  useEffect(() => {
    if (isShopAdmin && normalizedAdminShop) {
      setForm((prev) => ({
        ...prev,
        shop: normalizedAdminShop,
      }));
    }
  }, [isShopAdmin, normalizedAdminShop]);

  const canCurrentUserDeleteProduct = (product) => {
    if (!product) return false;
    if (isShopAdmin) {
      return !!normalizedAdminShop && product.shop === normalizedAdminShop;
    }
    if (isSuperAdmin) {
      return product.ownerId && product.ownerId === user?.uid;
    }
    return false;
  };

  const canCurrentUserEditProduct = (product) => {
    if (!product) return false;

    if (isShopAdmin) {
      return !!normalizedAdminShop && product.shop === normalizedAdminShop;
    }

    if (isSuperAdmin) {
      return product.ownerId && product.ownerId === user?.uid;
    }

    return false;
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    setProductsError("");

    try {
      const qRef = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(qRef);

      let rows = snap.docs.map(normalizeAdminProduct);

      if (isShopAdmin && normalizedAdminShop) {
        rows = rows.filter((product) => product.shop === normalizedAdminShop);
      }

      setProducts(sortByCreatedAtDesc(rows));
    } catch (error) {
      console.error("Admin products fetch error:", error);

      try {
        const fallbackRef = collection(db, COLLECTION_NAME);
        const fallbackSnap = await getDocs(fallbackRef);
        let normalized = fallbackSnap.docs.map(normalizeAdminProduct);

        if (isShopAdmin && normalizedAdminShop) {
          normalized = normalized.filter(
            (product) => product.shop === normalizedAdminShop
          );
        }

        setProducts(sortByCreatedAtDesc(normalized));
      } catch (fallbackError) {
        console.error("Admin fallback fetch error:", fallbackError);
        setProducts([]);
        setProductsError("Failed to load products.");
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, normalizedAdminShop, isSuperAdmin, isShopAdmin]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((item) => {
        if (item?.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      editImagePreviews.forEach((item) => {
        if (item?.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [editImagePreviews]);

  useEffect(() => {
    return () => {
      previewEditImagePreviews.forEach((item) => {
        if (item?.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [previewEditImagePreviews]);

  const setField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;

    if (key === "shop" && isShopAdmin) return;

    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setEditField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;

    if (key === "shop" && isShopAdmin) return;

    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const setPreviewEditField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;

    if (key === "shop" && isShopAdmin) return;

    setPreviewEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const addCustomizationGroup = () => {
    setForm((prev) => ({
      ...prev,
      customizations: [...prev.customizations, makeOptionGroup()],
    }));
  };

  const addEditCustomizationGroup = () => {
    setEditForm((prev) => ({
      ...prev,
      customizations: [...prev.customizations, makeOptionGroup()],
    }));
  };

  const addPreviewEditCustomizationGroup = () => {
    setPreviewEditForm((prev) => ({
      ...prev,
      customizations: [...prev.customizations, makeOptionGroup()],
    }));
  };

  const updateCustomizationGroup = (id, key, value) => {
    setForm((prev) => ({
      ...prev,
      customizations: prev.customizations.map((group) =>
        group.id === id ? { ...group, [key]: value } : group
      ),
    }));
  };

  const updateEditCustomizationGroup = (id, key, value) => {
    setEditForm((prev) => ({
      ...prev,
      customizations: prev.customizations.map((group) =>
        group.id === id ? { ...group, [key]: value } : group
      ),
    }));
  };

  const updatePreviewEditCustomizationGroup = (id, key, value) => {
    setPreviewEditForm((prev) => ({
      ...prev,
      customizations: prev.customizations.map((group) =>
        group.id === id ? { ...group, [key]: value } : group
      ),
    }));
  };

  const addOptionValueToGroup = (groupId, scope = "create") => {
    const setter =
      scope === "edit"
        ? setEditForm
        : scope === "preview"
        ? setPreviewEditForm
        : setForm;

    setter((prev) => ({
      ...prev,
      customizations: prev.customizations.map((group) =>
        group.id === groupId
          ? {
              ...group,
              values: [...(Array.isArray(group.values) ? group.values : []), makeOptionValue()],
            }
          : group
      ),
    }));
  };

  const updateOptionValueInGroup = (groupId, valueId, key, value, scope = "create") => {
    const setter =
      scope === "edit"
        ? setEditForm
        : scope === "preview"
        ? setPreviewEditForm
        : setForm;

    setter((prev) => ({
      ...prev,
      customizations: prev.customizations.map((group) =>
        group.id === groupId
          ? {
              ...group,
              values: (Array.isArray(group.values) ? group.values : []).map((item) =>
                item.id === valueId ? { ...item, [key]: value } : item
              ),
            }
          : group
      ),
    }));
  };

  const removeOptionValueFromGroup = (groupId, valueId, scope = "create") => {
    const setter =
      scope === "edit"
        ? setEditForm
        : scope === "preview"
        ? setPreviewEditForm
        : setForm;

    setter((prev) => ({
      ...prev,
      customizations: prev.customizations.map((group) => {
        if (group.id !== groupId) return group;
        const nextValues = (Array.isArray(group.values) ? group.values : []).filter(
          (item) => item.id !== valueId
        );
        return {
          ...group,
          values: nextValues.length ? nextValues : [makeOptionValue()],
        };
      }),
    }));
  };

  const removeCustomizationGroup = (id) => {
    setForm((prev) => ({
      ...prev,
      customizations: prev.customizations.filter((group) => group.id !== id),
    }));
  };

  const removeEditCustomizationGroup = (id) => {
    setEditForm((prev) => ({
      ...prev,
      customizations: prev.customizations.filter((group) => group.id !== id),
    }));
  };

  const removePreviewEditCustomizationGroup = (id) => {
    setPreviewEditForm((prev) => ({
      ...prev,
      customizations: prev.customizations.filter((group) => group.id !== id),
    }));
  };

  const resetImageState = () => {
    imagePreviews.forEach((item) => {
      if (item?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setImageFiles([]);
    setImagePreviews([]);
    setUploadedImages([]);
  };

  const resetEditImageState = () => {
    editImagePreviews.forEach((item) => {
      if (item?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setEditImageFiles([]);
    setEditImagePreviews([]);
    setEditUploadedImages([]);
  };

  const resetPreviewEditImageState = () => {
    previewEditImagePreviews.forEach((item) => {
      if (item?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setPreviewEditImageFiles([]);
    setPreviewEditImagePreviews([]);
    setPreviewEditUploadedImages([]);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setMsg("");
    if (!files.length) return;

    try {
      validateImageFiles(files);

      setImageFiles((prevFiles) => {
        const existingKeys = new Set(prevFiles.map(getFileKey));
        const uniqueNewFiles = files.filter(
          (file) => !existingKeys.has(getFileKey(file))
        );

        if (!uniqueNewFiles.length) return prevFiles;

        setImagePreviews((prevPreviews) => {
          const nextPreviews = [...prevPreviews];
          uniqueNewFiles.forEach((file) => {
            nextPreviews.push({
              key: getFileKey(file),
              preview: URL.createObjectURL(file),
            });
          });
          return nextPreviews;
        });

        setUploadedImages([]);
        return [...prevFiles, ...uniqueNewFiles];
      });

      e.target.value = "";
    } catch (err) {
      console.error("Image validation error:", err);
      setMsg(`❌ ${err.message}`);
      e.target.value = "";
    }
  };

  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setEditError("");
    setEditMsg("");
    if (!files.length) return;

    try {
      validateImageFiles(files);

      setEditImageFiles((prevFiles) => {
        const existingKeys = new Set(prevFiles.map(getFileKey));
        const uniqueNewFiles = files.filter(
          (file) => !existingKeys.has(getFileKey(file))
        );

        if (!uniqueNewFiles.length) return prevFiles;

        setEditImagePreviews((prevPreviews) => {
          const nextPreviews = [...prevPreviews];
          uniqueNewFiles.forEach((file) => {
            nextPreviews.push({
              key: getFileKey(file),
              preview: URL.createObjectURL(file),
            });
          });
          return nextPreviews;
        });

        setEditUploadedImages([]);
        return [...prevFiles, ...uniqueNewFiles];
      });

      e.target.value = "";
    } catch (err) {
      console.error("Edit image validation error:", err);
      setEditError(`❌ ${err.message}`);
      e.target.value = "";
    }
  };

  const handlePreviewEditImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setPreviewEditError("");
    setPreviewEditMsg("");
    if (!files.length) return;

    try {
      validateImageFiles(files);

      setPreviewEditImageFiles((prevFiles) => {
        const existingKeys = new Set(prevFiles.map(getFileKey));
        const uniqueNewFiles = files.filter(
          (file) => !existingKeys.has(getFileKey(file))
        );

        if (!uniqueNewFiles.length) return prevFiles;

        setPreviewEditImagePreviews((prevPreviews) => {
          const nextPreviews = [...prevPreviews];
          uniqueNewFiles.forEach((file) => {
            nextPreviews.push({
              key: getFileKey(file),
              preview: URL.createObjectURL(file),
            });
          });
          return nextPreviews;
        });

        setPreviewEditUploadedImages([]);
        return [...prevFiles, ...uniqueNewFiles];
      });

      e.target.value = "";
    } catch (err) {
      console.error("Preview edit image validation error:", err);
      setPreviewEditError(`❌ ${err.message}`);
      e.target.value = "";
    }
  };

  const removeSelectedImage = (indexToRemove) => {
    setMsg("");
    setImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));

    setImagePreviews((prev) => {
      const removed = prev[indexToRemove];
      if (removed?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, index) => index !== indexToRemove);
    });

    setUploadedImages([]);
  };

  const removeEditSelectedImage = (indexToRemove) => {
    setEditError("");
    setEditMsg("");

    setEditImageFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );

    setEditImagePreviews((prev) => {
      const removed = prev[indexToRemove];
      if (removed?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, index) => index !== indexToRemove);
    });

    setEditUploadedImages([]);
  };

  const removePreviewEditSelectedImage = (indexToRemove) => {
    setPreviewEditError("");
    setPreviewEditMsg("");

    setPreviewEditImageFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );

    setPreviewEditImagePreviews((prev) => {
      const removed = prev[indexToRemove];
      if (removed?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, index) => index !== indexToRemove);
    });

    setPreviewEditUploadedImages([]);
  };

  const handleUploadImage = async () => {
    if (!imageFiles.length) {
      setMsg("❌ Please choose product images first.");
      return null;
    }

    setUploadingImage(true);
    setMsg("");

    try {
      const results = await uploadImagesToCloudinary(imageFiles);
      setUploadedImages(results);
      setMsg("✅ Images uploaded successfully.");
      return results;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      setMsg(`❌ ${err.message || "Image upload failed."}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditUploadImage = async () => {
    if (!editImageFiles.length) {
      setEditError("❌ Please choose product images first.");
      return null;
    }

    setEditUploadingImage(true);
    setEditError("");
    setEditMsg("");

    try {
      const results = await uploadImagesToCloudinary(editImageFiles);
      setEditUploadedImages(results);
      setEditMsg("✅ New images uploaded successfully.");
      return results;
    } catch (err) {
      console.error("Edit Cloudinary upload error:", err);
      setEditError(`❌ ${err.message || "Image upload failed."}`);
      return null;
    } finally {
      setEditUploadingImage(false);
    }
  };

  const handlePreviewEditUploadImage = async () => {
    if (!previewEditImageFiles.length) {
      setPreviewEditError("❌ Please choose product images first.");
      return null;
    }

    setPreviewEditUploadingImage(true);
    setPreviewEditError("");
    setPreviewEditMsg("");

    try {
      const results = await uploadImagesToCloudinary(previewEditImageFiles);
      setPreviewEditUploadedImages(results);
      setPreviewEditMsg("✅ New images uploaded successfully.");
      return results;
    } catch (err) {
      console.error("Preview edit Cloudinary upload error:", err);
      setPreviewEditError(`❌ ${err.message || "Image upload failed."}`);
      return null;
    } finally {
      setPreviewEditUploadingImage(false);
    }
  };

  const validateCustomizationEditor = (groups) => {
    for (const group of groups) {
      const groupName = String(group.name || "").trim();
      const values = Array.isArray(group.values) ? group.values : [];

      const nonEmptyValues = values
        .map((value) => ({
          label: String(value?.label || "").trim(),
          priceBump: String(value?.priceBump ?? "").trim(),
        }))
        .filter((value) => value.label);

      if (!groupName && !nonEmptyValues.length) continue;
      if (!groupName) return "Each customization group must have a label.";
      if (nonEmptyValues.length < 1) {
        return `Customization "${groupName}" must have at least 1 value.`;
      }

      for (const value of nonEmptyValues) {
        if (
          value.priceBump !== "" &&
          !Number.isFinite(Number(value.priceBump))
        ) {
          return `Customization "${groupName}" has an invalid price bump.`;
        }
      }
    }

    return "";
  };

  const validate = () => {
    const name = form.name.trim();
    if (!name) return "Name is required.";

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      return "Price must be a valid number ≥ 0.";
    }

    if (form.oldPrice !== "") {
      const old = Number(form.oldPrice);
      if (!Number.isFinite(old) || old < 0) {
        return "Old price must be a valid number ≥ 0.";
      }
      if (old < price) return "Old price should be higher than current price.";
    }

    if (form.stock !== "") {
      const stock = Number(form.stock);
      if (!Number.isFinite(stock) || stock < 0) {
        return "Stock must be a valid number ≥ 0.";
      }
    }

    if (form.abroadDeliveryFee !== "") {
      const fee = Number(form.abroadDeliveryFee);
      if (!Number.isFinite(fee) || fee < 0) {
        return "Abroad delivery fee must be a valid number ≥ 0.";
      }
    }

    if (!imageFiles.length && !uploadedImages.length) {
      return "At least one product image is required.";
    }

    if (!deptOptions.includes(form.dept)) return "Invalid department selected.";
    if (!kindOptions.includes(form.kind)) return "Invalid type selected.";
    if (!availableShops.includes(normalizeShopKey(form.shop))) {
      return "Invalid shop selected.";
    }

    return validateCustomizationEditor(form.customizations);
  };

  const validateEdit = () => {
    const name = String(editForm.name || "").trim();
    if (!name) return "Name is required.";

    const price = Number(editForm.price);
    if (!Number.isFinite(price) || price < 0) {
      return "Price must be a valid number ≥ 0.";
    }

    if (editForm.oldPrice !== "") {
      const old = Number(editForm.oldPrice);
      if (!Number.isFinite(old) || old < 0) {
        return "Old price must be a valid number ≥ 0.";
      }
      if (old < price) return "Old price should be higher than current price.";
    }

    if (editForm.stock !== "") {
      const stock = Number(editForm.stock);
      if (!Number.isFinite(stock) || stock < 0) {
        return "Stock must be a valid number ≥ 0.";
      }
    }

    if (editForm.abroadDeliveryFee !== "") {
      const fee = Number(editForm.abroadDeliveryFee);
      if (!Number.isFinite(fee) || fee < 0) {
        return "Abroad delivery fee must be a valid number ≥ 0.";
      }
    }

    if (!deptOptions.includes(editForm.dept))
      return "Invalid department selected.";
    if (!kindOptions.includes(editForm.kind)) return "Invalid type selected.";
    if (!availableShops.includes(normalizeShopKey(editForm.shop))) {
      return "Invalid shop selected.";
    }

    return validateCustomizationEditor(editForm.customizations);
  };

  const validatePreviewEdit = () => {
    const name = String(previewEditForm.name || "").trim();
    if (!name) return "Name is required.";

    const price = Number(previewEditForm.price);
    if (!Number.isFinite(price) || price < 0) {
      return "Price must be a valid number ≥ 0.";
    }

    if (previewEditForm.oldPrice !== "") {
      const old = Number(previewEditForm.oldPrice);
      if (!Number.isFinite(old) || old < 0) {
        return "Old price must be a valid number ≥ 0.";
      }
      if (old < price) return "Old price should be higher than current price.";
    }

    if (previewEditForm.stock !== "") {
      const stock = Number(previewEditForm.stock);
      if (!Number.isFinite(stock) || stock < 0) {
        return "Stock must be a valid number ≥ 0.";
      }
    }

    if (previewEditForm.abroadDeliveryFee !== "") {
      const fee = Number(previewEditForm.abroadDeliveryFee);
      if (!Number.isFinite(fee) || fee < 0) {
        return "Abroad delivery fee must be a valid number ≥ 0.";
      }
    }

    if (!deptOptions.includes(previewEditForm.dept)) {
      return "Invalid department selected.";
    }
    if (!kindOptions.includes(previewEditForm.kind)) {
      return "Invalid type selected.";
    }
    if (!availableShops.includes(normalizeShopKey(previewEditForm.shop))) {
      return "Invalid shop selected.";
    }

    return validateCustomizationEditor(previewEditForm.customizations);
  };

  const cancelEditProduct = () => {
    if (editingId) return;
    setProductToEdit(null);
    setEditForm(initial);
    setEditPassword("");
    setEditError("");
    setEditMsg("");
    resetEditImageState();
  };

  const cancelPreviewEdit = () => {
    if (editingPreviewId) return;
    setPreviewRowToEdit(null);
    setPreviewEditForm(initial);
    setPreviewEditError("");
    setPreviewEditMsg("");
    resetPreviewEditImageState();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    const error = validate();
    if (error) {
      setMsg(`❌ ${error}`);
      return;
    }

    setSubmitting(true);

    try {
      let imagePayloads = uploadedImages;

      if (!imagePayloads.length && imageFiles.length) {
        imagePayloads = await handleUploadImage();
      }

      if (!imagePayloads?.length) {
        throw new Error("Image upload did not complete successfully.");
      }

      const shopValue =
        isShopAdmin && normalizedAdminShop
          ? normalizedAdminShop
          : normalizeShopKey(form.shop);

      const customizations = normalizeCustomizationGroups(form.customizations);
      const imageUrls = imagePayloads.map((item) => item.url).filter(Boolean);
      const sellerName = resolveCurrentSellerName(user, profile);
      const stockValue =
        form.stock !== "" && Number.isFinite(Number(form.stock))
          ? Number(form.stock)
          : null;
      const normalizedInStock =
        stockValue !== null ? stockValue > 0 && form.inStock !== false : form.inStock !== false;

      const payload = {
        name: form.name.trim(),
        brand: String(form.brand || "").trim(),
        price: Number(form.price),
        image: imageUrls[0],
        images: imageUrls,
        imageMeta: {
          publicId: imagePayloads[0]?.publicId || "",
          width: imagePayloads[0]?.width || null,
          height: imagePayloads[0]?.height || null,
          format: imagePayloads[0]?.format || "",
          bytes: imagePayloads[0]?.bytes || 0,
          originalFilename: imagePayloads[0]?.originalFilename || "",
        },
        imageMetaList: imagePayloads.map((item) => ({
          publicId: item.publicId || "",
          width: item.width || null,
          height: item.height || null,
          format: item.format || "",
          bytes: item.bytes || 0,
          originalFilename: item.originalFilename || "",
          url: item.url || "",
        })),
        description: form.description.trim(),
        dept: form.dept,
        kind: form.kind,
        shop: shopValue,
        homeSlot: String(form.homeSlot || "others").trim().toLowerCase(),
        ownerId: user?.uid || "",
        ownerEmail: String(user?.email || profile?.email || "").trim(),
        ownerName: sellerName,
        sellerName,
        inStock: normalizedInStock,
        featured: !!form.featured,
        shipsFromAbroad: !!form.shipsFromAbroad,
        customizations,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (form.oldPrice !== "") payload.oldPrice = Number(form.oldPrice);
      if (stockValue !== null) payload.stock = stockValue;
      if (
        form.abroadDeliveryFee !== "" &&
        Number.isFinite(Number(form.abroadDeliveryFee))
      ) {
        payload.abroadDeliveryFee = Number(form.abroadDeliveryFee);
      } else {
        payload.abroadDeliveryFee = 0;
      }

      if (!payload.description) delete payload.description;
      if (!payload.brand) delete payload.brand;
      if (!payload.customizations.length) delete payload.customizations;

      await addDoc(collection(db, COLLECTION_NAME), payload);

      setMsg("✅ Product added successfully.");
      setForm({
        ...initial,
        shop:
          isShopAdmin && normalizedAdminShop
            ? normalizedAdminShop
            : initial.shop,
      });
      resetImageState();
      await loadProducts();
    } catch (err) {
      console.error("Add product error:", err);
      setMsg(
        `❌ ${
          err.message ||
          "Failed to add products. Check Firestore rules or console logs."
        }`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const buildPreviewRowsFromCsv = (rows) => {
    const sellerName = resolveCurrentSellerName(user, profile);
    const fallbackShop =
      isShopAdmin && normalizedAdminShop
        ? normalizedAdminShop
        : normalizeShopKey(form.shop);

    const prepared = [];
    const skipped = [];

    rows.forEach((row, index) => {
      const title = String(row.title || "").trim();
      const price = parseNumberish(row.price, NaN);

      if (!title || !Number.isFinite(price)) {
        skipped.push(`Row ${index + 2}: missing valid product name or price`);
        return;
      }

      const stockNumber =
        row.stock !== undefined &&
        row.stock !== null &&
        String(row.stock).trim() !== ""
          ? parseNumberish(row.stock, 0)
          : null;

      const oldPrice =
        row.oldPrice !== undefined &&
        row.oldPrice !== null &&
        row.oldPrice !== ""
          ? parseNumberish(row.oldPrice, null)
          : null;

      const category = String(row.category || "").trim();
      const images = parseImageList(row);
      const customizations = parseCustomizationsFromText(row.customizations);
      const description = buildImportDescription(row);

      const resolvedShop = inferShopFromCategory(category, SHOPS, fallbackShop);
      const resolvedKind = findValidKind(category, kindOptions, form.kind);
      const resolvedDept = findValidDept(category, deptOptions, form.dept);

      prepared.push({
        id: crypto.randomUUID(),
        name: title,
        brand: String(row.brand || "").trim(),
        price,
        oldPrice:
          oldPrice !== null && Number.isFinite(oldPrice) && oldPrice >= price
            ? oldPrice
            : "",
        description,
        dept: resolvedDept,
        kind: resolvedKind,
        shop: resolvedShop,
        homeSlot: "others",
        ownerId: user?.uid || "",
        ownerEmail: String(user?.email || profile?.email || "").trim(),
        ownerName: sellerName,
        sellerName,
        inStock:
          row.inStock !== undefined && row.inStock !== ""
            ? parseBooleanish(
                row.inStock,
                stockNumber === null ? true : stockNumber > 0
              )
            : stockNumber === null
            ? true
            : stockNumber > 0,
        featured: parseBooleanish(row.featured, false),
        shipsFromAbroad: parseBooleanish(row.shipsFromAbroad, false),
        customizations,
        stock: stockNumber,
        abroadDeliveryFee:
          row.abroadDeliveryFee !== undefined &&
          row.abroadDeliveryFee !== null &&
          String(row.abroadDeliveryFee).trim() !== ""
            ? parseNumberish(row.abroadDeliveryFee, 0)
            : 0,
        image: images[0] || "",
        images,
        imageMeta: null,
        imageMetaList: [],
        source: "csv",
      });
    });

    return { prepared, skipped };
  };

  const handlePreviewImport = () => {
    setBulkImportMsg("");
    setImportPreviewMsg("");

    if (!String(bulkImportText || "").trim()) {
      setBulkImportMsg("❌ Paste your CSV first.");
      return;
    }

    if (!user?.uid) {
      setBulkImportMsg("❌ No authenticated admin session found.");
      return;
    }

    if (!availableShops.length) {
      setBulkImportMsg("❌ No valid shop available for this account.");
      return;
    }

    try {
      const rows = parseCsvText(bulkImportText);

      if (!rows.length) {
        throw new Error("No valid CSV rows found.");
      }

      const { prepared, skipped } = buildPreviewRowsFromCsv(rows);

      if (!prepared.length) {
        throw new Error(
          skipped.length
            ? `All rows were skipped. ${skipped[0]}`
            : "No valid products found to preview."
        );
      }

      setImportPreviewRows(prepared);
      setImportPreviewMsg(
        `✅ Preview ready for ${prepared.length} product${
          prepared.length > 1 ? "s" : ""
        }.${skipped.length ? ` Skipped ${skipped.length} invalid row(s).` : ""}`
      );
    } catch (error) {
      console.error("Preview import error:", error);
      setBulkImportMsg(`❌ ${error.message || "CSV preview failed."}`);
    }
  };

  const handleBulkImport = async () => {
    setBulkImportMsg("");

    if (!importPreviewRows.length) {
      setBulkImportMsg("❌ Preview and review products before importing.");
      return;
    }

    if (!user?.uid) {
      setBulkImportMsg("❌ No authenticated admin session found.");
      return;
    }

    setBulkImporting(true);

    try {
      const prepared = importPreviewRows.map((row) => {
           const payload = {
  name: String(row.name || "").trim(),
  brand: String(row.brand || "").trim(),
  price: Number(row.price || 0),
  description: String(row.description || "").trim(),
  dept: row.dept,
  kind: row.kind,
  shop:
    isShopAdmin && normalizedAdminShop
      ? normalizedAdminShop
      : normalizeShopKey(row.shop),
  homeSlot: String(row.homeSlot || "others").trim().toLowerCase(),
  ownerId: String(row.ownerId || user?.uid || "").trim(),
  ownerEmail: String(
    row.ownerEmail || user?.email || profile?.email || ""
  ).trim(),
  ownerName: String(row.ownerName || row.sellerName || "").trim(),
  sellerName: String(row.sellerName || row.ownerName || "").trim(),
  inStock: !!row.inStock,
  featured: !!row.featured,
  shipsFromAbroad: !!row.shipsFromAbroad,
  customizations: normalizeCustomizationGroups(
    Array.isArray(row.customizations) ? row.customizations : []
  ),
  abroadDeliveryFee:
    row.abroadDeliveryFee !== null &&
    row.abroadDeliveryFee !== undefined &&
    row.abroadDeliveryFee !== ""
      ? Number(row.abroadDeliveryFee) || 0
      : 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};
        if (
          row.stock !== null &&
          row.stock !== undefined &&
          row.stock !== "" &&
          Number.isFinite(Number(row.stock))
        ) {
          payload.stock = Number(row.stock);
          payload.inStock = payload.inStock && Number(row.stock) > 0;
        }

        if (
          row.oldPrice !== "" &&
          row.oldPrice !== null &&
          Number.isFinite(Number(row.oldPrice)) &&
          Number(row.oldPrice) >= Number(row.price)
        ) {
          payload.oldPrice = Number(row.oldPrice);
        }

        if (Array.isArray(row.images) && row.images.length) {
          payload.image = row.images[0];
          payload.images = row.images;
          payload.imageMeta = row.imageMeta || null;
          payload.imageMetaList = Array.isArray(row.imageMetaList)
            ? row.imageMetaList
            : [];
        } else if (row.image) {
          payload.image = row.image;
          payload.images = [row.image];
          payload.imageMeta = row.imageMeta || null;
          payload.imageMetaList = Array.isArray(row.imageMetaList)
            ? row.imageMetaList
            : [];
        }

        if (!payload.brand) delete payload.brand;
        if (!payload.description) delete payload.description;
        if (!payload.customizations.length) delete payload.customizations;

        return payload;
      });

      const chunkSize = 400;

      for (let i = 0; i < prepared.length; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = prepared.slice(i, i + chunkSize);

        chunk.forEach((payload) => {
          const ref = doc(collection(db, COLLECTION_NAME));
          batch.set(ref, payload);
        });

        await batch.commit();
      }

      setBulkImportMsg(
        `✅ Imported ${prepared.length} product${
          prepared.length > 1 ? "s" : ""
        } successfully.`
      );
      setBulkImportText("");
      setImportPreviewRows([]);
      setImportSearchTerm("");
      setImportPreviewMsg("");
      await loadProducts();
    } catch (error) {
      console.error("Bulk import error:", error);
      setBulkImportMsg(`❌ ${error.message || "Bulk import failed."}`);
    } finally {
      setBulkImporting(false);
    }
  };

  const startPreviewEdit = (row) => {
  setPreviewRowToEdit(row);
  setPreviewEditForm({
    name: row.name || "",
    brand: row.brand || "",
    price: row.price ?? "",
    oldPrice:
      row.oldPrice !== null && row.oldPrice !== undefined && row.oldPrice !== ""
        ? String(row.oldPrice)
        : "",
    description: row.description || "",
    dept: row.dept || "men",
    kind: row.kind || "fashion",
    shop:
      isShopAdmin && normalizedAdminShop
        ? normalizedAdminShop
        : row.shop || "fashion",
    homeSlot: row.homeSlot || "others",
    inStock: !!row.inStock,
    featured: !!row.featured,
    shipsFromAbroad: !!row.shipsFromAbroad,
    stock:
      row.stock !== null && row.stock !== undefined && row.stock !== ""
        ? String(row.stock)
        : "",
    abroadDeliveryFee:
      row.abroadDeliveryFee !== null &&
      row.abroadDeliveryFee !== undefined &&
      row.abroadDeliveryFee !== ""
        ? String(row.abroadDeliveryFee)
        : "",
    customizations: toEditableCustomizationGroups(row.customizations),
  });
  setPreviewEditError("");
  setPreviewEditMsg("");
  resetPreviewEditImageState();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

  const handleSavePreviewEdit = async () => {
    if (!previewRowToEdit?.id) return;

    const error = validatePreviewEdit();
    if (error) {
      setPreviewEditError(`❌ ${error}`);
      return;
    }

    setPreviewEditError("");
    setPreviewEditMsg("");
    setEditingPreviewId(previewRowToEdit.id);

    try {
      let nextImagePayloads = null;

      if (previewEditImageFiles.length) {
        nextImagePayloads =
          previewEditUploadedImages.length > 0
            ? previewEditUploadedImages
            : await handlePreviewEditUploadImage();

        if (!nextImagePayloads?.length) {
          throw new Error("Image upload did not complete successfully.");
        }
      }

      const shopValue =
        isShopAdmin && normalizedAdminShop
          ? normalizedAdminShop
          : normalizeShopKey(previewEditForm.shop);

      const customizations = normalizeCustomizationGroups(
        previewEditForm.customizations
      );

      const nextStock =
        previewEditForm.stock !== "" &&
        Number.isFinite(Number(previewEditForm.stock))
          ? Number(previewEditForm.stock)
          : null;

      const nextRow = {
        ...previewRowToEdit,
        name: String(previewEditForm.name || "").trim(),
        brand: String(previewEditForm.brand || "").trim(),
        description: String(previewEditForm.description || "").trim(),
        price: Number(previewEditForm.price),
        oldPrice:
          previewEditForm.oldPrice !== ""
            ? Number(previewEditForm.oldPrice)
            : "",
        dept: previewEditForm.dept,
        kind: previewEditForm.kind,
        shop: shopValue,
        homeSlot: String(previewEditForm.homeSlot || "others").trim().toLowerCase(),
        inStock: 
          nextStock !== null
            ? nextStock > 0 && !!previewEditForm.inStock
            : !!previewEditForm.inStock,
        featured: !!previewEditForm.featured,
        shipsFromAbroad: !!previewEditForm.shipsFromAbroad,
        stock: nextStock,
        abroadDeliveryFee:
          previewEditForm.abroadDeliveryFee !== "" &&
          Number.isFinite(Number(previewEditForm.abroadDeliveryFee))
            ? Number(previewEditForm.abroadDeliveryFee)
            : 0,
        customizations,
      };

      if (nextImagePayloads?.length) {
  const imageUrls = nextImagePayloads.map((item) => item.url).filter(Boolean);

  nextRow.image = imageUrls[0] || "";
  nextRow.images = imageUrls;
  nextRow.imageMeta = {
    publicId: nextImagePayloads[0]?.publicId || "",
    width: nextImagePayloads[0]?.width || null,
    height: nextImagePayloads[0]?.height || null,
    format: nextImagePayloads[0]?.format || "",
    bytes: nextImagePayloads[0]?.bytes || 0,
    originalFilename: nextImagePayloads[0]?.originalFilename || "",
  };
  nextRow.imageMetaList = nextImagePayloads.map((item) => ({
    publicId: item.publicId || "",
    width: item.width || null,
    height: item.height || null,
    format: item.format || "",
    bytes: item.bytes || 0,
    originalFilename: item.originalFilename || "",
    url: item.url || "",
  }));
}

      setImportPreviewRows((prev) =>
        prev.map((row) => (row.id === previewRowToEdit.id ? nextRow : row))
      );

      setImportPreviewMsg(`✅ Preview row "${nextRow.name}" updated.`);
      cancelPreviewEdit();
    } catch (error) {
      console.error("Preview row update error:", error);
      setPreviewEditError(`❌ ${error.message || "Failed to update preview row."}`);
    } finally {
      setEditingPreviewId("");
    }
  };

  const handleDeletePreviewRow = (rowId) => {
    setImportPreviewRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const toggleMultiSelectMode = () => {
    setMultiSelectMode((prev) => !prev);
    setSelectedProductIds([]);
    setBulkDeleteMode(false);
    setBulkDeletePassword("");
    setBulkDeleteError("");
  };

  const isProductSelected = (productId) => selectedProductIds.includes(productId);

  const toggleProductSelection = (product) => {
    if (!canCurrentUserDeleteProduct(product)) return;

    setSelectedProductIds((prev) =>
      prev.includes(product.id)
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]
    );
  };

  const selectAllInGroup = (items) => {
    const allowedIds = items
      .filter((item) => canCurrentUserDeleteProduct(item))
      .map((item) => item.id);

    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      allowedIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const clearAllInGroup = (items) => {
    const ids = new Set(items.map((item) => item.id));
    setSelectedProductIds((prev) => prev.filter((id) => !ids.has(id)));
  };

  const clearAllSelections = () => {
    setSelectedProductIds([]);
  };

  const selectedProducts = useMemo(() => {
    const set = new Set(selectedProductIds);
    return products.filter((product) => set.has(product.id));
  }, [products, selectedProductIds]);

  const startBulkDelete = () => {
    if (!selectedProducts.length) {
      setMsg("❌ Select at least one product first.");
      return;
    }

    const unauthorized = selectedProducts.some(
      (product) => !canCurrentUserDeleteProduct(product)
    );

    if (unauthorized) {
      setMsg("❌ One or more selected products cannot be deleted from this account.");
      return;
    }

    setBulkDeletePassword("");
    setBulkDeleteError("");
    setBulkDeleteMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBulkDeleteProducts = async () => {
    if (!selectedProducts.length) {
      setBulkDeleteError("No selected products found.");
      return;
    }

    if (!user?.email) {
      setBulkDeleteError("No authenticated admin session found.");
      return;
    }

    if (!bulkDeletePassword.trim()) {
      setBulkDeleteError("Enter your admin password to continue.");
      return;
    }

    setBulkDeleteError("");
    setBulkDeleting(true);

    try {
      await reauthenticate(bulkDeletePassword.trim());

      const chunkSize = 400;

      for (let i = 0; i < selectedProducts.length; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = selectedProducts.slice(i, i + chunkSize);

        chunk.forEach((product) => {
          batch.delete(doc(db, COLLECTION_NAME, product.id));
        });

        await batch.commit();
      }

      const removedIds = new Set(selectedProducts.map((product) => product.id));

      setProducts((prev) => prev.filter((product) => !removedIds.has(product.id)));
      setSelectedProductIds([]);
      setMultiSelectMode(false);
      setBulkDeleteMode(false);
      setBulkDeletePassword("");
      setMsg(
        `✅ Deleted ${selectedProducts.length} product${
          selectedProducts.length > 1 ? "s" : ""
        } successfully.`
      );
      await loadProducts();
    } catch (error) {
      console.error("Bulk delete products error:", error);
      setBulkDeleteError(`❌ ${error?.message || "Failed to delete selected products."}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const startEditProduct = (product) => {
    if (!canCurrentUserEditProduct(product)) {
      setMsg(
        isSuperAdmin
          ? "❌ Super admin can only edit products uploaded from this super admin account."
          : "❌ You can only edit products from your own shop."
      );
      return;
    }

    setProductToEdit(product);
    setEditForm({
      name: product.name || "",
      brand: product.brand || "",
      price: product.price ?? "",
      oldPrice:
        product.oldPrice !== null && product.oldPrice !== undefined
          ? String(product.oldPrice)
          : "",
      description: product.description || "",
      dept: product.dept || "men",
      kind: product.kind || "fashion",
      shop:
        isShopAdmin && normalizedAdminShop
          ? normalizedAdminShop
          : product.shop || "fashion",
      homeSlot: product.homeSlot || "others",
      inStock: !!product.inStock,
      featured: !!product.featured,
      shipsFromAbroad: !!product.shipsFromAbroad,
      stock:
        product.stock !== null && product.stock !== undefined && product.stock !== ""
          ? String(product.stock)
          : "",
      abroadDeliveryFee:
        product.abroadDeliveryFee !== null &&
        product.abroadDeliveryFee !== undefined &&
        product.abroadDeliveryFee !== ""
          ? String(product.abroadDeliveryFee)
          : "",
      customizations: toEditableCustomizationGroups(product.customizations),
    });
    setEditPassword("");
    setEditError("");
    setEditMsg("");
    resetEditImageState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateProduct = async () => {
    if (!productToEdit?.id) return;

    if (!user?.email) {
      setEditError("No authenticated admin session found.");
      return;
    }

    if (!editPassword.trim()) {
      setEditError("Enter your admin password to continue.");
      return;
    }

    const error = validateEdit();
    if (error) {
      setEditError(`❌ ${error}`);
      return;
    }

    setEditError("");
    setEditMsg("");
    setEditingId(productToEdit.id);

    try {
      await reauthenticate(editPassword.trim());

      let nextImagePayloads = null;

      if (editImageFiles.length) {
        nextImagePayloads =
          editUploadedImages.length > 0
            ? editUploadedImages
            : await handleEditUploadImage();

        if (!nextImagePayloads?.length) {
          throw new Error("Image upload did not complete successfully.");
        }
      }

      const shopValue =
        isShopAdmin && normalizedAdminShop
          ? normalizedAdminShop
          : normalizeShopKey(editForm.shop);

      const customizations = normalizeCustomizationGroups(editForm.customizations);
      const nextStock =
        editForm.stock !== "" && Number.isFinite(Number(editForm.stock))
          ? Number(editForm.stock)
          : null;

const updatePayload = {
  name: String(editForm.name || "").trim(),
  brand: String(editForm.brand || "").trim(),
  description: String(editForm.description || "").trim(),
  price: Number(editForm.price),
  dept: editForm.dept,
  kind: editForm.kind,
  shop: shopValue,
  homeSlot: String(editForm.homeSlot || "others").trim().toLowerCase(),
  inStock:
    nextStock !== null
      ? nextStock > 0 && !!editForm.inStock
      : !!editForm.inStock,
  featured: !!editForm.featured,
  shipsFromAbroad: !!editForm.shipsFromAbroad,
  abroadDeliveryFee:
    editForm.abroadDeliveryFee !== "" &&
    Number.isFinite(Number(editForm.abroadDeliveryFee))
      ? Number(editForm.abroadDeliveryFee)
      : 0,
  customizations,
  updatedAt: serverTimestamp(),
};

const sellerName = resolveCurrentSellerName(user, profile);

updatePayload.ownerEmail = String(
  user?.email || profile?.email || ""
).trim();
updatePayload.ownerName = sellerName;
updatePayload.sellerName = sellerName;

      if (nextStock !== null) {
        updatePayload.stock = nextStock;
      } else {
        updatePayload.stock = null;
      }

      if (editForm.oldPrice !== "") {
        updatePayload.oldPrice = Number(editForm.oldPrice);
      } else {
        updatePayload.oldPrice = null;
      }

      if (!updatePayload.description) delete updatePayload.description;
      if (!updatePayload.brand) delete updatePayload.brand;
      if (!updatePayload.customizations.length) delete updatePayload.customizations;

      if (nextImagePayloads?.length) {
  const imageUrls = nextImagePayloads.map((item) => item.url).filter(Boolean);

  updatePayload.image = imageUrls[0] || "";
  updatePayload.images = imageUrls;
  updatePayload.imageMeta = {
    publicId: nextImagePayloads[0]?.publicId || "",
    width: nextImagePayloads[0]?.width || null,
    height: nextImagePayloads[0]?.height || null,
    format: nextImagePayloads[0]?.format || "",
    bytes: nextImagePayloads[0]?.bytes || 0,
    originalFilename: nextImagePayloads[0]?.originalFilename || "",
  };
  updatePayload.imageMetaList = nextImagePayloads.map((item) => ({
    publicId: item.publicId || "",
    width: item.width || null,
    height: item.height || null,
    format: item.format || "",
    bytes: item.bytes || 0,
    originalFilename: item.originalFilename || "",
    url: item.url || "",
  }));
}

      await updateDoc(doc(db, COLLECTION_NAME, productToEdit.id), updatePayload);
      setMsg(`✅ "${updatePayload.name}" updated successfully.`);
      cancelEditProduct();
      await loadProducts();
    } catch (error) {
      console.error("Update product error:", error);
      setEditError(`❌ ${error?.message || "Failed to update product."}`);
    } finally {
      setEditingId("");
    }
  };

  const startDeleteProduct = (product) => {
    if (!canCurrentUserDeleteProduct(product)) {
      setMsg(
        isSuperAdmin
          ? "❌ Super admin can only delete products uploaded from this super admin account."
          : "❌ You can only delete products from your own shop."
      );
      return;
    }

    setProductToDelete(product);
    setDeletePassword("");
    setDeleteError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete?.id) return;

    if (!user?.email) {
      setDeleteError("No authenticated admin session found.");
      return;
    }

    if (!deletePassword.trim()) {
      setDeleteError("Enter your admin password to continue.");
      return;
    }

    setDeleteError("");
    setDeletingId(productToDelete.id);

    try {
      await reauthenticate(deletePassword.trim());
      await deleteDoc(doc(db, COLLECTION_NAME, productToDelete.id));

      setProducts((prev) =>
        prev.filter((product) => product.id !== productToDelete.id)
      );

      setMsg(`✅ "${productToDelete.name}" deleted successfully.`);
      setProductToDelete(null);
      setDeletePassword("");
      await loadProducts();
    } catch (error) {
      console.error("Delete product error:", error);
      setDeleteError(`❌ ${error?.message || "Failed to delete product."}`);
    } finally {
      setDeletingId("");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => productMatchesSearch(product, searchTerm));
  }, [products, searchTerm]);

  const filteredImportPreviewRows = useMemo(() => {
    return importPreviewRows.filter((row) =>
      importRowMatchesSearch(row, importSearchTerm)
    );
  }, [importPreviewRows, importSearchTerm]);

  const groupedProducts = useMemo(() => {
    const groups = new Map();

    filteredProducts.forEach((product) => {
      const key = product.shop || "unknown";
      if (!groups.has(key)) {
        groups.set(key, {
          shop: key,
          label: formatShopLabel(key),
          items: [],
        });
      }
      groups.get(key).items.push(product);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: sortByCreatedAtDesc(group.items),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredProducts]);

  const pageTitle = isSuperAdmin
    ? "Product Manager"
    : `${formatShopLabel(normalizedAdminShop)} Product Manager`;

  const pageSub = isSuperAdmin
    ? "Create products from this super admin account and review products across every shop. Other shops remain visible here but are read-only."
    : `Manage only products belonging to ${formatShopLabel(normalizedAdminShop)}.`;

  if (!user) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <div className="admin-head">
            <h2 className="admin-title">Admin access required</h2>
            <p className="admin-sub">Please sign in to continue.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin && !isShopAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <div className="admin-head">
            <h2 className="admin-title">Access denied</h2>
            <p className="admin-sub">
              This page is available to admins only.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (previewRowToEdit) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <div className="admin-head">
            <h2 className="admin-title">Edit Preview Row</h2>
            <p className="admin-sub">
              This editor is now inline and scrollable. No modal is used.
            </p>
          </div>

          <div className="admin-edit-layout">
            <div className="admin-edit-main">
              <div className="admin-form admin-form--compact">
                <label className="admin-field">
                  <span>Name</span>
                  <input
                    value={previewEditForm.name}
                    onChange={setPreviewEditField("name")}
                  />
                </label>

                <label className="admin-field">
                  <span>Brand</span>
                  <input
                    value={previewEditForm.brand}
                    onChange={setPreviewEditField("brand")}
                  />
                </label>

                <div className="admin-row">
                  <label className="admin-field">
                    <span>Base price</span>
                    <input
                      value={previewEditForm.price}
                      onChange={setPreviewEditField("price")}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Old price</span>
                    <input
                      value={previewEditForm.oldPrice}
                      onChange={setPreviewEditField("oldPrice")}
                    />
                  </label>
                </div>

                <div className="admin-row">
                  <label className="admin-field">
                    <span>Stock quantity</span>
                    <input
                      value={previewEditForm.stock}
                      onChange={setPreviewEditField("stock")}
                      inputMode="numeric"
                      placeholder="e.g. 12"
                    />
                  </label>

                  <label className="admin-field">
                    <span>Abroad delivery fee (GHS)</span>
                    <input
                      value={previewEditForm.abroadDeliveryFee}
                      onChange={setPreviewEditField("abroadDeliveryFee")}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span>Description</span>
                  <textarea
                    rows={4}
                    value={previewEditForm.description}
                    onChange={setPreviewEditField("description")}
                  />
                </label>

                <div className="admin-row">
                  <label className="admin-field">
                    <span>Department</span>
                    <select
                      value={previewEditForm.dept}
                      onChange={setPreviewEditField("dept")}
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-field">
                    <span>Type</span>
                    <select
                      value={previewEditForm.kind}
                      onChange={setPreviewEditField("kind")}
                    >
                      {KINDS.map((k) => (
                        <option key={k.key} value={k.key}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="admin-field">
                  <span>Shop</span>
                  <select
                    value={previewEditForm.shop}
                    onChange={setPreviewEditField("shop")}
                    disabled={isShopAdmin}
                  >
                    {availableShops.map((shopKey) => (
                      <option key={shopKey} value={shopKey}>
                        {formatShopLabel(shopKey)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span>Home / Shop filter placement</span>
                  <select
                    value={previewEditForm.homeSlot}
                    onChange={setPreviewEditField("homeSlot")}
                  >
                    {HOME_FILTER_OPTIONS.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="admin-toggles">
                  <label className="admin-switch admin-switch--stock">
                    <input
                      type="checkbox"
                      checked={previewEditForm.inStock}
                      onChange={setPreviewEditField("inStock")}
                    />
                    <span className="admin-switch-ui" />
                    <span className="admin-switch-label">In stock</span>
                  </label>

                  <label className="admin-switch admin-switch--featured">
                    <input
                      type="checkbox"
                      checked={previewEditForm.featured}
                      onChange={setPreviewEditField("featured")}
                    />
                    <span className="admin-switch-ui" />
                    <span className="admin-switch-label">Featured</span>
                  </label>

                  <label className="admin-switch admin-switch--abroad">
                    <input
                      type="checkbox"
                      checked={previewEditForm.shipsFromAbroad}
                      onChange={setPreviewEditField("shipsFromAbroad")}
                    />
                    <span className="admin-switch-ui" />
                    <span className="admin-switch-label">
                      Ships from abroad
                    </span>
                  </label>
                </div>

                <div className="admin-options-card">
                  <div className="admin-options-head">
                    <h3 className="admin-options-title">Customizations</h3>
                    <button
                      type="button"
                      className="admin-options-add"
                      onClick={addPreviewEditCustomizationGroup}
                    >
                      + Add option group
                    </button>
                  </div>

                  {previewEditForm.customizations.map((group, index) => (
                    <div className="admin-option-group" key={group.id}>
                      <div className="admin-option-group-head">
                        <strong>Option group {index + 1}</strong>
                        <button
                          type="button"
                          className="admin-option-remove"
                          onClick={() =>
                            removePreviewEditCustomizationGroup(group.id)
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <div className="admin-row">
                        <label className="admin-field">
                          <span>Label</span>
                          <input
                            value={group.name}
                            onChange={(e) =>
                              updatePreviewEditCustomizationGroup(
                                group.id,
                                "name",
                                e.target.value
                              )
                            }
                          />
                        </label>

                        <label className="admin-field">
                          <span>Style</span>
                          <select
                            value={group.type}
                            onChange={(e) =>
                              updatePreviewEditCustomizationGroup(
                                group.id,
                                "type",
                                e.target.value
                              )
                            }
                          >
                            <option value="buttons">Buttons</option>
                            <option value="select">Dropdown</option>
                          </select>
                        </label>
                      </div>

                      <OptionValuesEditor
                        values={group.values}
                        onChange={(valueId, key, value) =>
                          updateOptionValueInGroup(
                            group.id,
                            valueId,
                            key,
                            value,
                            "preview"
                          )
                        }
                        onAdd={() => addOptionValueToGroup(group.id, "preview")}
                        onRemove={(valueId) =>
                          removeOptionValueFromGroup(
                            group.id,
                            valueId,
                            "preview"
                          )
                        }
                        compact
                      />
                    </div>
                  ))}
                </div>

                {previewEditError ? (
                  <div className="admin-msg">{previewEditError}</div>
                ) : null}
                {previewEditMsg ? (
                  <div className="admin-msg">{previewEditMsg}</div>
                ) : null}

                <div className="admin-upload-actions">
                  <button
                    type="button"
                    className="admin-secondary-btn admin-secondary-btn--ghost"
                    onClick={cancelPreviewEdit}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={handleSavePreviewEdit}
                  >
                    {editingPreviewId ? "Saving…" : "Save preview row"}
                  </button>
                </div>
              </div>
            </div>

            <aside className="admin-edit-side">
              <div className="admin-edit-side-card">
                <h4 className="admin-edit-section-title">Images</h4>

                {previewRowToEdit?.image || previewRowToEdit?.images?.length ? (
                  <ProductImagePreview
                    image={previewRowToEdit.image}
                    images={previewRowToEdit.images}
                    name={previewRowToEdit.name}
                  />
                ) : null}

                <label className="admin-field">
                  <span>Choose new images</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={handlePreviewEditImageChange}
                  />
                </label>

                <div className="admin-upload-actions">
                  <button
                    type="button"
                    className="admin-secondary-btn"
                    onClick={handlePreviewEditUploadImage}
                  >
                    {previewEditUploadingImage
                      ? "Uploading…"
                      : "Upload new images"}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (productToEdit) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <div className="admin-head">
            <h2 className="admin-title">Edit Product</h2>
            <p className="admin-sub">
              Full-page editor enabled. No modal lock, no blocked scrolling.
            </p>
          </div>

          <div className="admin-edit-layout">
            <div className="admin-edit-main">
              <div className="admin-form admin-form--compact">
                <label className="admin-field">
                  <span>Name</span>
                  <input value={editForm.name} onChange={setEditField("name")} />
                </label>

                <label className="admin-field">
                  <span>Brand</span>
                  <input value={editForm.brand} onChange={setEditField("brand")} />
                </label>

                <div className="admin-row">
                  <label className="admin-field">
                    <span>Base price</span>
                    <input
                      value={editForm.price}
                      onChange={setEditField("price")}
                    />
                  </label>

                  <label className="admin-field">
                    <span>Old price</span>
                    <input
                      value={editForm.oldPrice}
                      onChange={setEditField("oldPrice")}
                    />
                  </label>
                </div>

                <div className="admin-row">
                  <label className="admin-field">
                    <span>Stock quantity</span>
                    <input
                      value={editForm.stock}
                      onChange={setEditField("stock")}
                      inputMode="numeric"
                      placeholder="e.g. 12"
                    />
                  </label>

                  <label className="admin-field">
                    <span>Abroad delivery fee (GHS)</span>
                    <input
                      value={editForm.abroadDeliveryFee}
                      onChange={setEditField("abroadDeliveryFee")}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span>Description</span>
                  <textarea
                    rows={4}
                    value={editForm.description}
                    onChange={setEditField("description")}
                  />
                </label>

                <div className="admin-row">
                  <label className="admin-field">
                    <span>Department</span>
                    <select
                      value={editForm.dept}
                      onChange={setEditField("dept")}
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-field">
                    <span>Type</span>
                    <select
                      value={editForm.kind}
                      onChange={setEditField("kind")}
                    >
                      {KINDS.map((k) => (
                        <option key={k.key} value={k.key}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="admin-field">
                  <span>Shop</span>
                  <select
                    value={editForm.shop}
                    onChange={setEditField("shop")}
                    disabled={isShopAdmin}
                  >
                    {availableShops.map((shopKey) => (
                      <option key={shopKey} value={shopKey}>
                        {formatShopLabel(shopKey)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span>Home / Shop filter placement</span>
                  <select
                    value={editForm.homeSlot}
                    onChange={setEditField("homeSlot")}
                  >
                    {HOME_FILTER_OPTIONS.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="admin-toggles">
                  <label className="admin-switch admin-switch--stock">
                    <input
                      type="checkbox"
                      checked={editForm.inStock}
                      onChange={setEditField("inStock")}
                    />
                    <span className="admin-switch-ui" />
                    <span className="admin-switch-label">In stock</span>
                  </label>

                  <label className="admin-switch admin-switch--featured">
                    <input
                      type="checkbox"
                      checked={editForm.featured}
                      onChange={setEditField("featured")}
                    />
                    <span className="admin-switch-ui" />
                    <span className="admin-switch-label">Featured</span>
                  </label>

                  <label className="admin-switch admin-switch--abroad">
                    <input
                      type="checkbox"
                      checked={editForm.shipsFromAbroad}
                      onChange={setEditField("shipsFromAbroad")}
                    />
                    <span className="admin-switch-ui" />
                    <span className="admin-switch-label">
                      Ships from abroad
                    </span>
                  </label>
                </div>

                <div className="admin-options-card">
                  <div className="admin-options-head">
                    <h3 className="admin-options-title">Customizations</h3>
                    <button
                      type="button"
                      className="admin-options-add"
                      onClick={addEditCustomizationGroup}
                    >
                      + Add option group
                    </button>
                  </div>

                  {editForm.customizations.map((group, index) => (
                    <div className="admin-option-group" key={group.id}>
                      <div className="admin-option-group-head">
                        <strong>Option group {index + 1}</strong>
                        <button
                          type="button"
                          className="admin-option-remove"
                          onClick={() => removeEditCustomizationGroup(group.id)}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="admin-row">
                        <label className="admin-field">
                          <span>Label</span>
                          <input
                            value={group.name}
                            onChange={(e) =>
                              updateEditCustomizationGroup(
                                group.id,
                                "name",
                                e.target.value
                              )
                            }
                          />
                        </label>

                        <label className="admin-field">
                          <span>Style</span>
                          <select
                            value={group.type}
                            onChange={(e) =>
                              updateEditCustomizationGroup(
                                group.id,
                                "type",
                                e.target.value
                              )
                            }
                          >
                            <option value="buttons">Buttons</option>
                            <option value="select">Dropdown</option>
                          </select>
                        </label>
                      </div>

                      <OptionValuesEditor
                        values={group.values}
                        onChange={(valueId, key, value) =>
                          updateOptionValueInGroup(
                            group.id,
                            valueId,
                            key,
                            value,
                            "edit"
                          )
                        }
                        onAdd={() => addOptionValueToGroup(group.id, "edit")}
                        onRemove={(valueId) =>
                          removeOptionValueFromGroup(group.id, valueId, "edit")
                        }
                      />
                    </div>
                  ))}
                </div>

                <label className="admin-field">
                  <span>Admin password</span>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>

                {editError ? <div className="admin-msg">{editError}</div> : null}
                {editMsg ? <div className="admin-msg">{editMsg}</div> : null}

                <div className="admin-upload-actions">
                  <button
                    type="button"
                    className="admin-secondary-btn admin-secondary-btn--ghost"
                    onClick={cancelEditProduct}
                  >
                    Back to products
                  </button>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={handleUpdateProduct}
                  >
                    {editingId
                      ? "Verifying & saving…"
                      : "Verify and save changes"}
                  </button>
                </div>
              </div>
            </div>

            <aside className="admin-edit-side">
              <div className="admin-edit-side-card">
                <h4 className="admin-edit-section-title">Images</h4>

                {productToEdit?.image || productToEdit?.images?.length ? (
                  <ProductImagePreview
                    image={productToEdit.image}
                    images={productToEdit.images}
                    name={productToEdit.name}
                  />
                ) : null}

                <label className="admin-field">
                  <span>Choose new images</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={handleEditImageChange}
                  />
                </label>

                <div className="admin-upload-actions">
                  <button
                    type="button"
                    className="admin-secondary-btn"
                    onClick={handleEditUploadImage}
                  >
                    {editUploadingImage ? "Uploading…" : "Upload new images"}
                  </button>
                  <button
                    type="button"
                    className="admin-secondary-btn admin-secondary-btn--ghost"
                    onClick={resetEditImageState}
                  >
                    Clear new images
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-head">
          <h2 className="admin-title">{pageTitle}</h2>
          <p className="admin-sub">{pageSub}</p>
        </div>

        {productToDelete ? (
          <div className="admin-card" style={{ marginBottom: 20 }}>
            <div className="admin-head">
              <h3 className="admin-title" style={{ fontSize: "1.1rem" }}>
                Confirm product deletion
              </h3>
              <p className="admin-sub">
                Deleting <strong>{productToDelete.name}</strong>
              </p>
            </div>

            <label className="admin-field">
              <span>Admin password</span>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            {deleteError ? <div className="admin-msg">{deleteError}</div> : null}

            <div className="admin-upload-actions">
              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={() => {
                  setProductToDelete(null);
                  setDeletePassword("");
                  setDeleteError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-danger-btn"
                onClick={handleDeleteProduct}
              >
                {deletingId ? "Verifying & deleting…" : "Verify and delete"}
              </button>
            </div>
          </div>
        ) : null}

        {bulkDeleteMode ? (
          <div className="admin-card" style={{ marginBottom: 20 }}>
            <div className="admin-head">
              <h3 className="admin-title" style={{ fontSize: "1.1rem" }}>
                Delete selected products
              </h3>
              <p className="admin-sub">
                {selectedProducts.length} selected product
                {selectedProducts.length === 1 ? "" : "s"}
              </p>
            </div>

            <label className="admin-field">
              <span>Admin password</span>
              <input
                type="password"
                value={bulkDeletePassword}
                onChange={(e) => setBulkDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            {bulkDeleteError ? (
              <div className="admin-msg">{bulkDeleteError}</div>
            ) : null}

            <div className="admin-upload-actions">
              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={() => {
                  setBulkDeleteMode(false);
                  setBulkDeletePassword("");
                  setBulkDeleteError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-danger-btn"
                onClick={handleBulkDeleteProducts}
              >
                {bulkDeleting
                  ? "Verifying & deleting…"
                  : `Delete ${selectedProducts.length} selected`}
              </button>
            </div>
          </div>
        ) : null}

        <div className="admin-upload-card" style={{ marginBottom: 20 }}>
          <div className="admin-upload-head">
            <div>
              <h3 className="admin-upload-title">Bulk import products</h3>
              <p className="admin-upload-sub">
                Paste CSV here, preview the imported rows, edit anything you
                want, then import reviewed products into Firestore.
              </p>
            </div>
          </div>

          <label className="admin-field">
            <span>CSV data</span>
            <textarea
              value={bulkImportText}
              onChange={(e) => setBulkImportText(e.target.value)}
              placeholder={BULK_IMPORT_SAMPLE}
              rows={10}
              style={{ fontFamily: "monospace" }}
            />
          </label>

          <div
            className="admin-upload-actions"
            style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          >
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => setBulkImportText(BULK_IMPORT_SAMPLE)}
            >
              Use sample header
            </button>
            <button
              type="button"
              className="admin-secondary-btn admin-secondary-btn--ghost"
              onClick={() => setBulkImportText("")}
            >
              Clear CSV
            </button>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={handlePreviewImport}
            >
              Preview import
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={handleBulkImport}
              disabled={!importPreviewRows.length || bulkImporting}
            >
              {bulkImporting ? "Importing…" : "Import reviewed products"}
            </button>
          </div>

          {bulkImportMsg ? <div className="admin-msg">{bulkImportMsg}</div> : null}
          {importPreviewMsg ? (
            <div className="admin-msg">{importPreviewMsg}</div>
          ) : null}

          {importPreviewRows.length ? (
            <div className="admin-import-preview-card">
              <div className="admin-import-preview-head">
                <div>
                  <h3 className="admin-import-preview-title">
                    Import preview list
                  </h3>
                  <p className="admin-import-preview-sub">
                    Review status, image coverage, and product details before
                    import.
                  </p>
                </div>

                <div className="admin-import-preview-tools">
                  <label className="admin-field admin-field--compact">
                    <span>Search preview rows</span>
                    <input
                      value={importSearchTerm}
                      onChange={(e) => setImportSearchTerm(e.target.value)}
                      placeholder="Search preview rows..."
                    />
                  </label>
                </div>
              </div>

              <div className="admin-import-preview-list">
                {filteredImportPreviewRows.length ? (
                  filteredImportPreviewRows.map((row) => (
                    <div className="admin-import-row" key={row.id}>
                      <div className="admin-import-row-media">
                        {row.image ? (
                          <img
                            src={row.image}
                            alt={row.name}
                            className="admin-import-row-image"
                          />
                        ) : (
                          <div className="admin-import-row-image admin-import-row-image--empty">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="admin-import-row-content">
                        <div className="admin-import-row-top">
                          <div>
                            <h3 className="admin-import-row-name">{row.name}</h3>
                            <div className="admin-import-row-meta">
                              <span>{formatShopLabel(row.shop)}</span>
                              <span>{titleize(row.kind)}</span>
                              <span>{titleize(row.dept)}</span>
                              {row.brand ? <span>{row.brand}</span> : null}
                              {row.stock !== null ? (
                                <span>Stock: {row.stock}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="admin-product-price">
                            {formatMoney(row.price)}
                          </div>
                        </div>

                        <StatusFlags
                          inStock={row.inStock}
                          featured={row.featured}
                          shipsFromAbroad={row.shipsFromAbroad}
                        />

                        {row.description ? (
                          <p className="admin-import-row-desc">
                            {row.description}
                          </p>
                        ) : null}

                        <div className="admin-import-row-actions">
                          <button
                            type="button"
                            className="admin-secondary-btn"
                            onClick={() => startPreviewEdit(row)}
                          >
                            Edit row
                          </button>
                          <button
                            type="button"
                            className="admin-danger-btn"
                            onClick={() => handleDeletePreviewRow(row.id)}
                          >
                            Remove row
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-products-empty">
                    No preview rows match your search.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <form className="admin-form" onSubmit={onSubmit}>
          <label className="admin-field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={setField("name")}
              autoComplete="off"
            />
          </label>

          <label className="admin-field">
            <span>Brand (optional)</span>
            <input
              value={form.brand}
              onChange={setField("brand")}
              autoComplete="off"
            />
          </label>

          <div className="admin-row">
            <label className="admin-field">
              <span>Base price (GHS)</span>
              <input
                value={form.price}
                onChange={setField("price")}
                inputMode="decimal"
              />
            </label>

            <label className="admin-field">
              <span>Old price (optional)</span>
              <input
                value={form.oldPrice}
                onChange={setField("oldPrice")}
                inputMode="decimal"
              />
            </label>
          </div>

          <div className="admin-row">
            <label className="admin-field">
              <span>Stock quantity</span>
              <input
                value={form.stock}
                onChange={setField("stock")}
                inputMode="numeric"
                placeholder="e.g. 12"
              />
            </label>

            <label className="admin-field">
              <span>Abroad delivery fee (GHS)</span>
              <input
                value={form.abroadDeliveryFee}
                onChange={setField("abroadDeliveryFee")}
                inputMode="decimal"
                placeholder="0"
              />
            </label>
          </div>

          <label className="admin-field">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={setField("description")}
              rows={5}
            />
          </label>

          <div className="admin-row">
            <label className="admin-field">
              <span>Department</span>
              <select value={form.dept} onChange={setField("dept")}>
                {DEPARTMENTS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Type</span>
              <select value={form.kind} onChange={setField("kind")}>
                {KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="admin-field">
            <span>Shop</span>
            <select
              value={form.shop}
              onChange={setField("shop")}
              disabled={isShopAdmin}
            >
              {availableShops.map((shopKey) => (
                <option key={shopKey} value={shopKey}>
                  {formatShopLabel(shopKey)}
                </option>
              ))}
            </select>
          </label>

         <label className="admin-field">
            <span>Home / Shop filter placement</span>
            <select value={form.homeSlot} onChange={setField("homeSlot")}>
              {HOME_FILTER_OPTIONS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-upload-card">
            <div className="admin-upload-head">
              <div>
                <h3 className="admin-upload-title">Product images</h3>
                <p className="admin-upload-sub">
                  Upload at least one image before saving the product.
                </p>
              </div>
            </div>

            <label className="admin-field">
              <span>Select images</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleImageChange}
              />
            </label>

            <div className="admin-upload-actions">
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={handleUploadImage}
                disabled={!imageFiles.length || uploadingImage}
              >
                {uploadingImage ? "Uploading…" : "Upload images"}
              </button>
              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={resetImageState}
                disabled={!imageFiles.length && !uploadedImages.length}
              >
                Clear images
              </button>
            </div>

            {imagePreviews.length ? (
              <div className="admin-image-preview-grid">
                {imagePreviews.map((item, index) => (
                  <div className="admin-image-preview-wrap" key={item.key}>
                    <img
                      src={item.preview}
                      alt={`Selected ${index + 1}`}
                      className="admin-image-preview"
                    />
                    <div className="admin-image-preview-overlay">
                      <span className="admin-image-index">{index + 1}</span>
                      <button
                        type="button"
                        className="admin-image-remove-btn"
                        onClick={() => removeSelectedImage(index)}
                        aria-label={`Remove image ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {uploadedImages.length ? (
              <div className="admin-upload-success-wrap">
                <div className="admin-upload-success">
                  <span className="admin-upload-badge">Uploaded</span>
                  <span className="admin-upload-count">
                    {uploadedImages.length} image
                    {uploadedImages.length === 1 ? "" : "s"} ready
                  </span>
                </div>

                <div className="admin-uploaded-grid">
                  {uploadedImages.map((item, index) => (
                    <div
                      className="admin-uploaded-thumb"
                      key={item.publicId || item.url || index}
                    >
                      <img
                        src={item.url}
                        alt={`Uploaded ${index + 1}`}
                        className="admin-uploaded-thumb-img"
                      />
                      <span className="admin-uploaded-badge">
                        {index === 0 ? "Cover" : `Image ${index + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="admin-toggles">
            <label className="admin-switch admin-switch--stock">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={setField("inStock")}
              />
              <span className="admin-switch-ui" />
              <span className="admin-switch-label">In stock</span>
            </label>

            <label className="admin-switch admin-switch--featured">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={setField("featured")}
              />
              <span className="admin-switch-ui" />
              <span className="admin-switch-label">Featured</span>
            </label>

            <label className="admin-switch admin-switch--abroad">
              <input
                type="checkbox"
                checked={form.shipsFromAbroad}
                onChange={setField("shipsFromAbroad")}
              />
              <span className="admin-switch-ui" />
              <span className="admin-switch-label">Ships from abroad</span>
            </label>
          </div>

          <div className="admin-options-card">
            <div className="admin-options-head">
              <h3 className="admin-options-title">Customizations</h3>
              <button
                type="button"
                className="admin-options-add"
                onClick={addCustomizationGroup}
              >
                + Add option group
              </button>
            </div>

            {form.customizations.length ? (
              form.customizations.map((group, index) => (
                <div className="admin-option-group" key={group.id}>
                  <div className="admin-option-group-head">
                    <strong>Option group {index + 1}</strong>
                    <button
                      type="button"
                      className="admin-option-remove"
                      onClick={() => removeCustomizationGroup(group.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="admin-row">
                    <label className="admin-field">
                      <span>Label</span>
                      <input
                        value={group.name}
                        onChange={(e) =>
                          updateCustomizationGroup(
                            group.id,
                            "name",
                            e.target.value
                          )
                        }
                      />
                    </label>

                    <label className="admin-field">
                      <span>Style</span>
                      <select
                        value={group.type}
                        onChange={(e) =>
                          updateCustomizationGroup(
                            group.id,
                            "type",
                            e.target.value
                          )
                        }
                      >
                        <option value="buttons">Buttons</option>
                        <option value="select">Dropdown</option>
                      </select>
                    </label>
                  </div>

                  <OptionValuesEditor
                    values={group.values}
                    onChange={(valueId, key, value) =>
                      updateOptionValueInGroup(
                        group.id,
                        valueId,
                        key,
                        value,
                        "create"
                      )
                    }
                    onAdd={() => addOptionValueToGroup(group.id, "create")}
                    onRemove={(valueId) =>
                      removeOptionValueFromGroup(group.id, valueId, "create")
                    }
                  />
                </div>
              ))
            ) : (
              <div className="admin-options-empty">
                No customization groups added yet.
              </div>
            )}
          </div>

          {msg ? <div className="admin-msg">{msg}</div> : null}

          <button
            className="admin-btn"
            type="submit"
            disabled={submitting || uploadingImage}
          >
            {submitting ? "Adding…" : "Add product"}
          </button>
        </form>
      </div>

      <div className="admin-card admin-card--manager">
        <div className="admin-head">
          <h2 className="admin-title">Manage Products</h2>
          <p className="admin-sub">
            Editing now opens as a full page instead of a modal.
          </p>
        </div>

        <div className="admin-search-wrap">
          <label className="admin-field">
            <span>Search products</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, brand, shop, type, owner, description..."
            />
          </label>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            className="admin-secondary-btn"
            onClick={toggleMultiSelectMode}
          >
            {multiSelectMode ? "Exit multi-select" : "Multi-select"}
          </button>

          {multiSelectMode ? (
            <>
              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={clearAllSelections}
              >
                Clear selection
              </button>
              <button
                type="button"
                className="admin-danger-btn"
                onClick={startBulkDelete}
              >
                Delete selected ({selectedProductIds.length})
              </button>
            </>
          ) : null}
        </div>

        {loadingProducts ? (
          <div className="admin-products-empty">Loading products…</div>
        ) : productsError ? (
          <div className="admin-msg">{productsError}</div>
        ) : groupedProducts.length ? (
          <div style={{ display: "grid", gap: 18 }}>
            {groupedProducts.map((group) => (
              <div key={group.shop} style={{ display: "grid", gap: 12 }}>
                <div className="admin-head" style={{ marginBottom: 0 }}>
                  <div>
                    <h3 className="admin-title" style={{ fontSize: "1.05rem" }}>
                      {group.label}
                    </h3>
                    <p className="admin-sub">
                      {group.items.length} product
                      {group.items.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  {multiSelectMode ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={() => selectAllInGroup(group.items)}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="admin-secondary-btn admin-secondary-btn--ghost"
                        onClick={() => clearAllInGroup(group.items)}
                      >
                        Clear group
                      </button>
                    </div>
                  ) : null}
                </div>

                {multiSelectMode ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {group.items.map((product) => (
                      <label
                        key={product.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto",
                          gap: 12,
                          alignItems: "center",
                          padding: "14px 16px",
                          border: "1px solid var(--border)",
                          borderRadius: 14,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isProductSelected(product.id)}
                          disabled={!canCurrentUserDeleteProduct(product)}
                          onChange={() => toggleProductSelection(product)}
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>{product.name}</div>
                          <div style={{ opacity: 0.72, fontSize: 13 }}>
                            {formatShopLabel(product.shop)}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {formatMoney(product.price)}
                        </div>
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
                          <div className="admin-product-media">
                            <ProductImagePreview
                              image={product.image}
                              images={product.images}
                              name={product.name}
                            />
                          </div>

                          <div className="admin-product-content">
                            <div className="admin-product-top">
                              <div>
                                <h3 className="admin-product-name">
                                  {product.name}
                                </h3>
                                <div className="admin-product-meta">
                                  <span>{formatShopLabel(product.shop)}</span>
                                  <span>{titleize(product.kind)}</span>
                                  <span>{titleize(product.dept)}</span>
                                  {product.brand ? (
                                    <span>{product.brand}</span>
                                  ) : null}
                                  {product.stock !== null ? (
                                    <span>Stock: {product.stock}</span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="admin-product-price">
                                {formatMoney(product.price)}
                              </div>
                            </div>

                            <StatusFlags
                              inStock={product.inStock}
                              featured={product.featured}
                              shipsFromAbroad={product.shipsFromAbroad}
                            />

                            {product.description ? (
                              <p className="admin-import-row-desc">
                                {product.description}
                              </p>
                            ) : null}

                            <div
                              className="admin-product-actions"
                              style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                            >
                              <button
                                type="button"
                                className="admin-secondary-btn"
                                onClick={() => startEditProduct(product)}
                                disabled={!canEdit}
                              >
                                {canEdit ? "Edit product" : "Read only"}
                              </button>

                              <button
                                type="button"
                                className="admin-danger-btn"
                                onClick={() => startDeleteProduct(product)}
                                disabled={!canDelete}
                              >
                                {canDelete ? "Delete product" : "Read only"}
                              </button>
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
        ) : (
          <div className="admin-products-empty">
            {searchTerm.trim()
              ? "No products match your search."
              : "No products found yet."}
          </div>
        )}
      </div>
    </div>
  );
}
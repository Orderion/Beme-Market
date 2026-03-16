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

const makeOptionGroup = () => ({
  id: crypto.randomUUID(),
  name: "",
  type: "buttons",
  required: true,
  valuesText: "",
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
  inStock: true,
  featured: false,
  shipsFromAbroad: false,
  customizations: [],
};

const makeImportPreviewRow = () => ({
  id: crypto.randomUUID(),
  name: "",
  brand: "",
  price: "",
  oldPrice: "",
  description: "",
  dept: "men",
  kind: "fashion",
  shop: "fashion",
  inStock: true,
  featured: false,
  shipsFromAbroad: false,
  stock: 0,
  customizations: [],
  image: "",
  images: [],
  imageMeta: null,
  imageMetaList: [],
  source: "csv",
});

const BULK_IMPORT_SAMPLE = `product_name,category,brand,price_ghs,key_features,target_customer,customization_options,short_description,ships_from_abroad
Samsung Galaxy S23,Phone,Samsung,7500,"8GB RAM, 128GB–256GB storage, AMOLED display","Smartphone users, professionals","Storage: 128GB|256GB; Color: Black|Green|Cream","Samsung Galaxy S23 offers powerful flagship performance with a bright AMOLED display and fast processing for work, entertainment, and daily use.",yes
Apple MacBook Air M2,Laptop,Apple,11000,"8GB–16GB RAM, 256GB–512GB SSD, Apple M2 chip","Students, professionals, creators","RAM: 8GB|16GB; Storage: 256GB|512GB; Color: Silver|Space Gray|Midnight","Apple MacBook Air M2 delivers smooth everyday performance in a slim and lightweight design.",no
Apple AirPods Pro 2,Accessory,Apple,3200,"Active noise cancellation, spatial audio","Apple device users","Color: White","Apple AirPods Pro 2 combine premium sound, comfort, and wireless convenience for everyday listening.",no`;

function normalizeCustomizationGroups(groups) {
  return groups
    .map((group) => {
      const values = String(group.valuesText || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      return {
        id: group.id,
        name: String(group.name || "").trim(),
        type: group.type === "select" ? "select" : "buttons",
        required: !!group.required,
        values,
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
    valuesText: Array.isArray(group?.values)
      ? group.values
          .map((v) => String(v || "").trim())
          .filter(Boolean)
          .join(", ")
      : "",
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
    ownerId: String(d.ownerId || "").trim(),
    ownerName: String(d.ownerName || d.sellerName || "").trim(),
    ownerEmail: String(d.ownerEmail || "").trim(),
    featured: !!d.featured,
    inStock: !!d.inStock,
    shipsFromAbroad: !!d.shipsFromAbroad,
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
    .replace(/[^\d.]/g, "")
    .trim();

  if (!cleaned) return fallback;

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
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
        .map((value) => value.trim())
        .filter(Boolean);

      if (!name || values.length < 2) return null;

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeletePassword, setBulkDeletePassword] = useState("");
  const [bulkDeleteError, setBulkDeleteError] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
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
  const [previewEditModalOpen, setPreviewEditModalOpen] = useState(false);
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

  useEffect(() => {
    const shouldLockScroll =
      editModalOpen ||
      deleteModalOpen ||
      bulkDeleteModalOpen ||
      previewEditModalOpen;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    if (shouldLockScroll) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [
    editModalOpen,
    deleteModalOpen,
    bulkDeleteModalOpen,
    previewEditModalOpen,
  ]);

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

    if (!imageFiles.length && !uploadedImages.length) {
      return "At least one product image is required.";
    }

    if (!deptOptions.includes(form.dept)) return "Invalid department selected.";
    if (!kindOptions.includes(form.kind)) return "Invalid type selected.";
    if (!availableShops.includes(normalizeShopKey(form.shop))) {
      return "Invalid shop selected.";
    }

    for (const group of form.customizations) {
      const groupName = String(group.name || "").trim();
      const values = String(group.valuesText || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      if (!groupName && !values.length) continue;
      if (!groupName) return "Each customization group must have a label.";
      if (values.length < 2) {
        return `Customization "${groupName}" must have at least 2 values.`;
      }
    }

    return "";
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

    if (!deptOptions.includes(editForm.dept)) return "Invalid department selected.";
    if (!kindOptions.includes(editForm.kind)) return "Invalid type selected.";
    if (!availableShops.includes(normalizeShopKey(editForm.shop))) {
      return "Invalid shop selected.";
    }

    for (const group of editForm.customizations) {
      const groupName = String(group.name || "").trim();
      const values = String(group.valuesText || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      if (!groupName && !values.length) continue;
      if (!groupName) return "Each customization group must have a label.";
      if (values.length < 2) {
        return `Customization "${groupName}" must have at least 2 values.`;
      }
    }

    return "";
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

    if (!deptOptions.includes(previewEditForm.dept)) {
      return "Invalid department selected.";
    }
    if (!kindOptions.includes(previewEditForm.kind)) {
      return "Invalid type selected.";
    }
    if (!availableShops.includes(normalizeShopKey(previewEditForm.shop))) {
      return "Invalid shop selected.";
    }

    for (const group of previewEditForm.customizations) {
      const groupName = String(group.name || "").trim();
      const values = String(group.valuesText || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      if (!groupName && !values.length) continue;
      if (!groupName) return "Each customization group must have a label.";
      if (values.length < 2) {
        return `Customization "${groupName}" must have at least 2 values.`;
      }
    }

    return "";
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
        ownerId: user?.uid || "",
        ownerEmail: String(user?.email || profile?.email || "").trim(),
        ownerName: sellerName,
        sellerName,
        inStock: !!form.inStock,
        featured: !!form.featured,
        shipsFromAbroad: !!form.shipsFromAbroad,
        customizations,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (form.oldPrice !== "") payload.oldPrice = Number(form.oldPrice);
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

      const stockNumber = parseNumberish(row.stock, 0);
      const oldPrice =
        row.oldPrice !== undefined && row.oldPrice !== null && row.oldPrice !== ""
          ? parseNumberish(row.oldPrice, null)
          : null;

      const category = String(row.category || "").trim();
      const images = parseImageList(row);
      const customizations = parseCustomizationsFromText(row.customizations);
      const description = buildImportDescription(row);

      const resolvedShop = inferShopFromCategory(category, SHOPS, fallbackShop);
      const resolvedKind = findValidKind(category, kindOptions, form.kind);
      const resolvedDept = findValidDept(category, deptOptions, form.dept);

      const previewRow = {
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
        ownerId: user?.uid || "",
        ownerEmail: String(user?.email || profile?.email || "").trim(),
        ownerName: sellerName,
        sellerName,
        inStock:
          row.inStock !== undefined && row.inStock !== ""
            ? parseBooleanish(row.inStock, stockNumber > 0)
            : stockNumber > 0,
        featured: parseBooleanish(row.featured, false),
        shipsFromAbroad: parseBooleanish(row.shipsFromAbroad, false),
        customizations,
        stock: stockNumber,
        image: images[0] || "",
        images,
        imageMeta: null,
        imageMetaList: [],
        source: "csv",
      };

      prepared.push(previewRow);
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
          ownerId: String(row.ownerId || user?.uid || "").trim(),
          ownerEmail: String(
            row.ownerEmail || user?.email || profile?.email || ""
          ).trim(),
          ownerName: String(row.ownerName || row.sellerName || "").trim(),
          sellerName: String(row.sellerName || row.ownerName || "").trim(),
          inStock: !!row.inStock,
          featured: !!row.featured,
          shipsFromAbroad: !!row.shipsFromAbroad,
          customizations: Array.isArray(row.customizations)
            ? row.customizations
            : [],
          stock: Number(row.stock || 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

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

  const openPreviewEditModal = (row) => {
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
      inStock: !!row.inStock,
      featured: !!row.featured,
      shipsFromAbroad: !!row.shipsFromAbroad,
      customizations: toEditableCustomizationGroups(row.customizations),
    });
    setPreviewEditError("");
    setPreviewEditMsg("");
    resetPreviewEditImageState();
    setPreviewEditModalOpen(true);
  };

  const closePreviewEditModal = () => {
    if (editingPreviewId) return;
    setPreviewEditModalOpen(false);
    setPreviewRowToEdit(null);
    setPreviewEditForm(initial);
    setPreviewEditError("");
    setPreviewEditMsg("");
    resetPreviewEditImageState();
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
        inStock: !!previewEditForm.inStock,
        featured: !!previewEditForm.featured,
        shipsFromAbroad: !!previewEditForm.shipsFromAbroad,
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
      setPreviewEditModalOpen(false);
      setPreviewRowToEdit(null);
      setPreviewEditForm(initial);
      setPreviewEditError("");
      setPreviewEditMsg("");
      resetPreviewEditImageState();
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
    setBulkDeleteModalOpen(false);
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

  const openBulkDeleteModal = () => {
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
    setBulkDeleteModalOpen(true);
  };

  const closeBulkDeleteModal = () => {
    if (bulkDeleting) return;
    setBulkDeleteModalOpen(false);
    setBulkDeletePassword("");
    setBulkDeleteError("");
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

    const unauthorized = selectedProducts.some(
      (product) => !canCurrentUserDeleteProduct(product)
    );

    if (unauthorized) {
      setBulkDeleteError(
        "One or more selected products cannot be deleted from this account."
      );
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
      setBulkDeleteModalOpen(false);
      setBulkDeletePassword("");
      setMsg(
        `✅ Deleted ${selectedProducts.length} product${
          selectedProducts.length > 1 ? "s" : ""
        } successfully.`
      );
      await loadProducts();
    } catch (error) {
      console.error("Bulk delete products error:", error);

      let message = "Failed to delete selected products.";
      const code = error?.code || "";

      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        message = "Incorrect password. Bulk delete cancelled.";
      } else if (
        code === "permission-denied" ||
        code === "firestore/permission-denied"
      ) {
        message = "You do not have permission to delete one or more products.";
      } else if (error?.message) {
        message = error.message;
      }

      setBulkDeleteError(`❌ ${message}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const openEditModal = (product) => {
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
      inStock: !!product.inStock,
      featured: !!product.featured,
      shipsFromAbroad: !!product.shipsFromAbroad,
      customizations: toEditableCustomizationGroups(product.customizations),
    });
    setEditPassword("");
    setEditError("");
    setEditMsg("");
    resetEditImageState();
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (editingId) return;
    setEditModalOpen(false);
    setProductToEdit(null);
    setEditForm(initial);
    setEditPassword("");
    setEditError("");
    setEditMsg("");
    resetEditImageState();
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

    if (!canCurrentUserEditProduct(productToEdit)) {
      setEditError(
        isSuperAdmin
          ? "❌ You can only edit products uploaded from this super admin account."
          : "❌ You can only edit products from your own shop."
      );
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

      const updatePayload = {
        name: String(editForm.name || "").trim(),
        brand: String(editForm.brand || "").trim(),
        description: String(editForm.description || "").trim(),
        price: Number(editForm.price),
        dept: editForm.dept,
        kind: editForm.kind,
        shop: shopValue,
        inStock: !!editForm.inStock,
        featured: !!editForm.featured,
        shipsFromAbroad: !!editForm.shipsFromAbroad,
        customizations,
        updatedAt: serverTimestamp(),
      };

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

        updatePayload.image = imageUrls[0];
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

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productToEdit.id
            ? {
                ...product,
                ...updatePayload,
                image:
                  updatePayload.image !== undefined
                    ? updatePayload.image
                    : product.image,
                images:
                  updatePayload.images !== undefined
                    ? updatePayload.images
                    : product.images,
                oldPrice:
                  updatePayload.oldPrice !== undefined
                    ? updatePayload.oldPrice
                    : product.oldPrice,
                brand:
                  updatePayload.brand !== undefined
                    ? updatePayload.brand || ""
                    : product.brand,
                description:
                  updatePayload.description !== undefined
                    ? updatePayload.description || ""
                    : product.description,
                customizations:
                  updatePayload.customizations !== undefined
                    ? updatePayload.customizations
                    : product.customizations,
              }
            : product
        )
      );

      setMsg(`✅ "${updatePayload.name}" updated successfully.`);
      setEditModalOpen(false);
      setProductToEdit(null);
      setEditForm(initial);
      setEditPassword("");
      setEditError("");
      setEditMsg("");
      resetEditImageState();
      await loadProducts();
    } catch (error) {
      console.error("Update product error:", error);

      let message = "Failed to update product.";
      const code = error?.code || "";

      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        message = "Incorrect password. Update cancelled.";
      } else if (
        code === "permission-denied" ||
        code === "firestore/permission-denied"
      ) {
        message = "You do not have permission to edit this product.";
      } else if (error?.message) {
        message = error.message;
      }

      setEditError(`❌ ${message}`);
    } finally {
      setEditingId("");
    }
  };

  const openDeleteModal = (product) => {
    if (!canCurrentUserDeleteProduct(product)) {
      setMsg(
        isSuperAdmin
          ? "❌ Super admin can view all shop products here, but can only delete products uploaded from this super admin account."
          : "❌ You can only delete products from your own shop."
      );
      return;
    }

    setProductToDelete(product);
    setDeletePassword("");
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;
    setDeleteModalOpen(false);
    setProductToDelete(null);
    setDeletePassword("");
    setDeleteError("");
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

    if (!canCurrentUserDeleteProduct(productToDelete)) {
      setDeleteError(
        isSuperAdmin
          ? "❌ You can only delete products uploaded from this super admin account."
          : "❌ You can only delete products from your own shop."
      );
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
      setDeleteModalOpen(false);
      setProductToDelete(null);
      setDeletePassword("");
    } catch (error) {
      console.error("Delete product error:", error);

      let message = "Failed to delete product.";
      const code = error?.code || "";

      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        message = "Incorrect password. Delete cancelled.";
      } else if (
        code === "permission-denied" ||
        code === "firestore/permission-denied"
      ) {
        message = "You do not have permission to delete this product.";
      } else if (error?.message) {
        message = error.message;
      }

      setDeleteError(`❌ ${message}`);
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

  const productSummary = useMemo(() => {
    const summaryMap = new Map();

    filteredProducts.forEach((product) => {
      const key = product.shop || "unknown";
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          shop: key,
          label: formatShopLabel(key),
          count: 0,
          inStock: 0,
          featured: 0,
          imported: 0,
        });
      }

      const row = summaryMap.get(key);
      row.count += 1;
      if (product.inStock) row.inStock += 1;
      if (product.featured) row.featured += 1;
      if (product.shipsFromAbroad) row.imported += 1;
    });

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [filteredProducts]);

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

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-head">
          <h2 className="admin-title">{pageTitle}</h2>
          <p className="admin-sub">{pageSub}</p>
        </div>

        <div className="admin-upload-card" style={{ marginBottom: 20 }}>
          <div className="admin-upload-head">
            <div>
              <h3 className="admin-upload-title">Bulk import products</h3>
              <p className="admin-upload-sub">
                Paste CSV here, preview the imported rows, edit anything you want,
                then import reviewed products into Firestore.
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
              disabled={bulkImporting}
            >
              Use sample header
            </button>

            <button
              type="button"
              className="admin-secondary-btn admin-secondary-btn--ghost"
              onClick={() => setBulkImportText("")}
              disabled={bulkImporting}
            >
              Clear CSV
            </button>

            <button
              type="button"
              className="admin-secondary-btn"
              onClick={handlePreviewImport}
              disabled={bulkImporting}
            >
              Preview import
            </button>

            <button
              type="button"
              className="admin-btn"
              onClick={handleBulkImport}
              disabled={bulkImporting || !importPreviewRows.length}
            >
              {bulkImporting ? "Importing…" : "Import reviewed products"}
            </button>
          </div>

          <div className="admin-shop-card" style={{ marginTop: 14 }}>
            <div className="admin-shop-head">
              <h3 className="admin-shop-title">Import defaults</h3>
              <p className="admin-shop-sub">
                Imported products will use the currently selected shop, kind,
                and department when those fields are not provided or cannot be
                inferred from the CSV.
              </p>
            </div>

            <div className="admin-row">
              <label className="admin-field">
                <span>Default shop</span>
                <select
                  value={form.shop}
                  onChange={setField("shop")}
                  disabled={isShopAdmin}
                >
                  {availableShops.map((shopKey) => {
                    const shopMeta = SHOPS.find((shop) => shop.key === shopKey);
                    return (
                      <option key={shopKey} value={shopKey}>
                        {shopMeta?.label || titleize(shopKey)}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="admin-field">
                <span>Default type</span>
                <select value={form.kind} onChange={setField("kind")}>
                  {KINDS.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Default department</span>
                <select value={form.dept} onChange={setField("dept")}>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {bulkImportMsg ? <div className="admin-msg">{bulkImportMsg}</div> : null}
          {importPreviewMsg ? (
            <div className="admin-msg" style={{ marginTop: 10 }}>
              {importPreviewMsg}
            </div>
          ) : null}

          {importPreviewRows.length ? (
            <div className="admin-import-preview-card">
              <div className="admin-import-preview-head">
                <div>
                  <h3 className="admin-import-preview-title">
                    Import preview list
                  </h3>
                  <p className="admin-import-preview-sub">
                    Review each parsed row before final import. You can edit or
                    remove rows individually.
                  </p>
                </div>

                <div className="admin-import-preview-tools">
                  <label className="admin-field" style={{ minWidth: 260 }}>
                    <span>Search preview rows</span>
                    <input
                      value={importSearchTerm}
                      onChange={(e) => setImportSearchTerm(e.target.value)}
                      placeholder="Search preview rows..."
                      autoComplete="off"
                    />
                  </label>
                </div>
              </div>

              <div className="admin-import-preview-list">
                {filteredImportPreviewRows.map((row) => {
                  const gallery = Array.isArray(row.images)
                    ? row.images
                    : row.image
                    ? [row.image]
                    : [];

                  return (
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
                            <h4 className="admin-import-row-name">{row.name}</h4>
                            <div className="admin-import-row-meta">
                              <span>{formatShopLabel(row.shop)}</span>
                              <span>{titleize(row.kind)}</span>
                              <span>{titleize(row.dept)}</span>
                              {row.brand ? <span>Brand: {row.brand}</span> : null}
                              <span>{formatMoney(row.price)}</span>
                              {gallery.length > 1 ? (
                                <span>{gallery.length} images</span>
                              ) : null}
                            </div>
                          </div>

                          <div className="admin-import-row-actions">
                            <button
                              type="button"
                              className="admin-icon-btn"
                              onClick={() => openPreviewEditModal(row)}
                              aria-label={`Edit ${row.name}`}
                              title="Edit row"
                            >
                              ✎
                            </button>

                            <button
                              type="button"
                              className="admin-icon-btn admin-icon-btn--danger"
                              onClick={() => handleDeletePreviewRow(row.id)}
                              aria-label={`Remove ${row.name}`}
                              title="Remove row"
                            >
                              🗑
                            </button>
                          </div>
                        </div>

                        <div className="admin-import-row-flags">
                          <span
                            className={
                              row.inStock
                                ? "admin-flag admin-flag--success"
                                : "admin-flag"
                            }
                          >
                            {row.inStock ? "In stock" : "Out of stock"}
                          </span>

                          {row.featured ? (
                            <span className="admin-flag admin-flag--featured">
                              Featured
                            </span>
                          ) : null}

                          {row.shipsFromAbroad ? (
                            <span className="admin-flag admin-flag--imported">
                              Ships from abroad
                            </span>
                          ) : null}
                        </div>

                        {row.description ? (
                          <p className="admin-import-row-desc">{row.description}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!filteredImportPreviewRows.length ? (
                <div className="admin-products-empty">
                  No preview rows match your search.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
                <form className="admin-form" onSubmit={onSubmit}>
          <label className="admin-field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={setField("name")}
              placeholder="e.g. Classic Hoodie"
              autoComplete="off"
            />
          </label>

          <label className="admin-field">
            <span>Brand (optional)</span>
            <input
              value={form.brand}
              onChange={setField("brand")}
              placeholder="e.g. Lattafa"
              autoComplete="off"
            />
          </label>

          <div className="admin-row">
            <label className="admin-field">
              <span>Price (GHS)</span>
              <input
                inputMode="decimal"
                value={form.price}
                onChange={setField("price")}
                placeholder="e.g. 180"
              />
            </label>

            <label className="admin-field">
              <span>Old price (optional)</span>
              <input
                inputMode="decimal"
                value={form.oldPrice}
                onChange={setField("oldPrice")}
                placeholder="e.g. 220"
              />
            </label>
          </div>

          <div className="admin-upload-card">
            <div className="admin-upload-head">
              <div>
                <h3 className="admin-upload-title">Product images</h3>
                <p className="admin-upload-sub">
                  Upload multiple product images to Cloudinary. The first image
                  becomes the cover image.
                </p>
              </div>
            </div>

            <label className="admin-field">
              <span>Choose images</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleImageChange}
              />
            </label>

            {imagePreviews.length ? (
              <>
                <div className="admin-image-preview-head">
                  <span className="admin-image-preview-title">
                    Selected images
                  </span>
                  <span className="admin-image-preview-count">
                    {imagePreviews.length} image
                    {imagePreviews.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="admin-image-preview-grid">
                  {imagePreviews.map((item, index) => (
                    <div
                      className="admin-image-preview-wrap"
                      key={item.key || `${item.preview}-${index}`}
                    >
                      <img
                        src={item.preview}
                        alt={`Product preview ${index + 1}`}
                        className="admin-image-preview"
                      />

                      <div className="admin-image-preview-overlay">
                        <span className="admin-image-index">
                          {index === 0 ? "Cover" : `Image ${index + 1}`}
                        </span>

                        <button
                          type="button"
                          className="admin-image-remove-btn"
                          onClick={() => removeSelectedImage(index)}
                          disabled={uploadingImage || submitting}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="admin-image-empty">No images selected yet.</div>
            )}

            <div className="admin-upload-actions">
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={handleUploadImage}
                disabled={!imageFiles.length || uploadingImage || submitting}
              >
                {uploadingImage ? "Uploading…" : "Upload images"}
              </button>

              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={resetImageState}
                disabled={uploadingImage || submitting}
              >
                Remove images
              </button>
            </div>

            {uploadedImages.length ? (
              <div className="admin-upload-success-wrap">
                <div className="admin-upload-success">
                  <span className="admin-upload-badge">Uploaded</span>
                  <span className="admin-upload-count">
                    {uploadedImages.length} image
                    {uploadedImages.length > 1 ? "s" : ""}
                  </span>
                  <a
                    href={uploadedImages[0].url}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-upload-link"
                  >
                    View cover image
                  </a>
                </div>

                <div className="admin-uploaded-grid">
                  {uploadedImages.map((item, index) => (
                    <a
                      key={`${item.url}-${index}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-uploaded-thumb"
                    >
                      <img
                        src={item.url}
                        alt={`Uploaded product ${index + 1}`}
                        className="admin-uploaded-thumb-img"
                      />
                      {index === 0 ? (
                        <span className="admin-uploaded-badge">Cover</span>
                      ) : null}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <label className="admin-field">
            <span>Description (optional)</span>
            <textarea
              value={form.description}
              onChange={setField("description")}
              placeholder="Write a short product description..."
              rows={5}
            />
          </label>

          <div className="admin-shop-card">
            <div className="admin-shop-head">
              <h3 className="admin-shop-title">Store placement</h3>
              <p className="admin-shop-sub">
                {isSuperAdmin
                  ? "Choose which storefront this super admin product should appear under."
                  : "Products you add will be locked to your assigned shop."}
              </p>
            </div>

            <div className="admin-store-pills">
              {availableShops.map((shopKey) => {
                const shopMeta = SHOPS.find((shop) => shop.key === shopKey);
                return (
                  <button
                    key={shopKey}
                    type="button"
                    className={
                      normalizeShopKey(form.shop) === shopKey
                        ? "admin-store-pill active"
                        : "admin-store-pill"
                    }
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        shop: shopKey,
                      }))
                    }
                    disabled={isShopAdmin}
                  >
                    {shopMeta?.label || titleize(shopKey)}
                  </button>
                );
              })}
            </div>

            <label className="admin-field">
              <span>Shop</span>
              <select
                value={form.shop}
                onChange={setField("shop")}
                disabled={isShopAdmin}
              >
                {availableShops.map((shopKey) => {
                  const shopMeta = SHOPS.find((shop) => shop.key === shopKey);
                  return (
                    <option key={shopKey} value={shopKey}>
                      {shopMeta?.label || titleize(shopKey)}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

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

            <label className="admin-switch admin-switch--imported">
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
              <div>
                <h3 className="admin-options-title">Product customizations</h3>
                <p className="admin-options-sub">
                  Add options like Storage, Color, Size, RAM, Material, Scent,
                  Edition, Bundle and more.
                </p>
              </div>

              <button
                type="button"
                className="admin-options-add"
                onClick={addCustomizationGroup}
              >
                + Add option group
              </button>
            </div>

            {!form.customizations.length ? (
              <div className="admin-options-empty">
                No customization groups yet.
              </div>
            ) : (
              <div className="admin-options-list">
                {form.customizations.map((group, index) => (
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
                          placeholder="e.g. Storage"
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

                    <label className="admin-field">
                      <span>Values (comma separated)</span>
                      <input
                        value={group.valuesText}
                        onChange={(e) =>
                          updateCustomizationGroup(
                            group.id,
                            "valuesText",
                            e.target.value
                          )
                        }
                        placeholder="e.g. 128GB, 256GB, 512GB"
                      />
                    </label>

                    <label className="admin-checkline">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) =>
                          updateCustomizationGroup(
                            group.id,
                            "required",
                            e.target.checked
                          )
                        }
                      />
                      <span>Required selection</span>
                    </label>
                  </div>
                ))}
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
            {isSuperAdmin
              ? "You can review all shop products here. Products uploaded by other shop admins are visible but read-only. Products uploaded by this super admin account remain manageable."
              : "Edit or delete only your shop products after password verification."}
          </p>
        </div>

        <div className="admin-search-wrap">
          <label className="admin-field">
            <span>Search products</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, brand, shop, type, owner, description..."
              autoComplete="off"
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
            disabled={!!editingId || !!deletingId || bulkDeleting}
          >
            {multiSelectMode ? "Exit multi-select" : "Multi-select"}
          </button>

          {multiSelectMode ? (
            <>
              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={clearAllSelections}
                disabled={!selectedProductIds.length || bulkDeleting}
              >
                Clear selection
              </button>

              <button
                type="button"
                className="admin-danger-btn"
                onClick={openBulkDeleteModal}
                disabled={!selectedProductIds.length || bulkDeleting}
              >
                Delete selected ({selectedProductIds.length})
              </button>
            </>
          ) : null}

          {searchTerm.trim() ? (
            <button
              type="button"
              className="admin-secondary-btn admin-secondary-btn--ghost"
              onClick={() => setSearchTerm("")}
            >
              Clear search
            </button>
          ) : null}
        </div>

        {productSummary.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {productSummary.map((shop) => (
              <div
                key={shop.shop}
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 18,
                  padding: 14,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  {shop.label}
                </div>
                <div style={{ opacity: 0.82, fontSize: 14 }}>
                  {shop.count} products
                </div>
                <div style={{ opacity: 0.72, fontSize: 13, marginTop: 6 }}>
                  {shop.inStock} in stock • {shop.featured} featured •{" "}
                  {shop.imported} imported
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {productsError ? <div className="admin-msg">{productsError}</div> : null}

        {loadingProducts ? (
          <div className="admin-products-empty">Loading products…</div>
        ) : groupedProducts.length ? (
          <div style={{ display: "grid", gap: 18 }}>
            {groupedProducts.map((group) => {
              const deletableItems = group.items.filter((item) =>
                canCurrentUserDeleteProduct(item)
              );
              const selectedCountInGroup = deletableItems.filter((item) =>
                selectedProductIds.includes(item.id)
              ).length;

              return (
                <div key={group.shop} style={{ display: "grid", gap: 12 }}>
                  <div className="admin-head" style={{ marginBottom: 0 }}>
                    <div>
                      <h3 className="admin-title" style={{ fontSize: "1.05rem" }}>
                        {group.label}
                      </h3>
                      <p className="admin-sub">
                        {group.items.length} product
                        {group.items.length === 1 ? "" : "s"}
                        {multiSelectMode && deletableItems.length
                          ? ` • ${selectedCountInGroup}/${deletableItems.length} selected`
                          : ""}
                      </p>
                    </div>

                    {multiSelectMode && deletableItems.length ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
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
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 18,
                        overflow: "hidden",
                      }}
                    >
                      {group.items.map((product, index) => {
                        const canDelete = canCurrentUserDeleteProduct(product);
                        const selected = isProductSelected(product.id);

                        return (
                          <label
                            key={product.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto 1fr auto",
                              gap: 12,
                              alignItems: "center",
                              padding: "14px 16px",
                              background:
                                index % 2 === 0
                                  ? "rgba(255,255,255,0.02)"
                                  : "rgba(255,255,255,0.03)",
                              opacity: canDelete ? 1 : 0.55,
                              cursor: canDelete ? "pointer" : "not-allowed",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!canDelete}
                              onChange={() => toggleProductSelection(product)}
                            />

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {product.name}
                              </div>
                              <div
                                style={{
                                  opacity: 0.75,
                                  fontSize: 13,
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                  marginTop: 4,
                                }}
                              >
                                <span>{formatShopLabel(product.shop)}</span>
                                <span>{titleize(product.kind)}</span>
                                <span>{titleize(product.dept)}</span>
                                {product.brand ? <span>Brand: {product.brand}</span> : null}
                                <span>
                                  {product.inStock ? "In stock" : "Out of stock"}
                                </span>
                                {product.shipsFromAbroad ? (
                                  <span>Ships from abroad</span>
                                ) : null}
                                {!canDelete ? <span>Read only</span> : null}
                              </div>
                            </div>

                            <div
                              style={{
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatMoney(product.price)}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="admin-products-list">
                      {group.items.map((product) => {
                        const isDeleting = deletingId === product.id;
                        const isEditing = editingId === product.id;
                        const gallery = Array.isArray(product.images)
                          ? product.images
                          : product.image
                          ? [product.image]
                          : [];
                        const canDelete = canCurrentUserDeleteProduct(product);
                        const canEdit = canCurrentUserEditProduct(product);
                        const uploadedByCurrentUser = product.ownerId === user?.uid;

                        return (
                          <div className="admin-product-item" key={product.id}>
                            <div className="admin-product-media">
                              {product.image ? (
                                <>
                                  <div className="admin-product-cover-wrap">
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="admin-product-image"
                                    />
                                    {gallery.length > 1 ? (
                                      <span className="admin-product-gallery-badge">
                                        {gallery.length} photos
                                      </span>
                                    ) : null}
                                  </div>

                                  {gallery.length > 1 ? (
                                    <div className="admin-product-gallery-strip">
                                      {gallery.slice(0, 4).map((src, index) => (
                                        <img
                                          key={`${src}-${index}`}
                                          src={src}
                                          alt={`${product.name} ${index + 1}`}
                                          className="admin-product-gallery-thumb"
                                        />
                                      ))}

                                      {gallery.length > 4 ? (
                                        <div className="admin-product-gallery-more">
                                          +{gallery.length - 4}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <div className="admin-product-image admin-product-image--empty">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="admin-product-content">
                              <div className="admin-product-top">
                                <div>
                                  <h3 className="admin-product-name">{product.name}</h3>
                                  <div className="admin-product-meta">
                                    <span>{formatShopLabel(product.shop)}</span>
                                    <span>{titleize(product.kind)}</span>
                                    <span>{titleize(product.dept)}</span>
                                    {product.brand ? (
                                      <span>Brand: {product.brand}</span>
                                    ) : null}
                                    <span>
                                      {uploadedByCurrentUser
                                        ? "Uploaded by you"
                                        : product.ownerName || "Uploaded by shop admin"}
                                    </span>
                                  </div>
                                </div>

                                <div className="admin-product-price">
                                  {formatMoney(product.price)}
                                </div>
                              </div>

                              <div className="admin-product-flags">
                                <span
                                  className={
                                    product.inStock
                                      ? "admin-flag admin-flag--success"
                                      : "admin-flag"
                                  }
                                >
                                  {product.inStock ? "In stock" : "Out of stock"}
                                </span>

                                {product.featured ? (
                                  <span className="admin-flag admin-flag--featured">
                                    Featured
                                  </span>
                                ) : null}

                                {product.shipsFromAbroad ? (
                                  <span className="admin-flag admin-flag--imported">
                                    Ships from abroad
                                  </span>
                                ) : null}

                                {!canEdit ? (
                                  <span className="admin-flag">Read only</span>
                                ) : null}
                              </div>

                              <div
                                className="admin-product-actions"
                                style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                              >
                                <button
                                  type="button"
                                  className="admin-secondary-btn"
                                  onClick={() => openEditModal(product)}
                                  disabled={!!editingId || !!deletingId || !canEdit}
                                  title={
                                    canEdit
                                      ? "Edit product"
                                      : "You cannot manage this product from this account"
                                  }
                                  style={
                                    !canEdit
                                      ? { opacity: 0.55, cursor: "not-allowed" }
                                      : undefined
                                  }
                                >
                                  {isEditing
                                    ? "Saving…"
                                    : canEdit
                                    ? "Edit product"
                                    : "Read only"}
                                </button>

                                <button
                                  type="button"
                                  className="admin-danger-btn"
                                  onClick={() => openDeleteModal(product)}
                                  disabled={!!deletingId || !!editingId || !canDelete}
                                  title={
                                    canDelete
                                      ? "Delete product"
                                      : "You cannot manage this product from this account"
                                  }
                                  style={
                                    !canDelete
                                      ? { opacity: 0.55, cursor: "not-allowed" }
                                      : undefined
                                  }
                                >
                                  {isDeleting
                                    ? "Deleting…"
                                    : canDelete
                                    ? "Delete product"
                                    : "Read only"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="admin-products-empty">
            {searchTerm.trim()
              ? "No products match your search."
              : "No products found yet."}
          </div>
        )}
      </div>

      {previewEditModalOpen && previewRowToEdit ? (
        <div
          className="admin-modal-backdrop"
          onClick={closePreviewEditModal}
          role="presentation"
        >
          <div
            className="admin-modal admin-modal--fullscreen"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-preview-edit-title"
          >
            <div className="admin-modal-head">
              <h3 id="admin-preview-edit-title" className="admin-modal-title">
                Edit preview row
              </h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closePreviewEditModal}
                disabled={!!editingPreviewId}
                aria-label="Close preview edit modal"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-scroll">
              <div className="admin-modal-inner">
                <div className="admin-edit-layout">
                  <div className="admin-edit-main">
                    <div className="admin-form admin-form--compact">
                      <div className="admin-edit-section">
                        <h4 className="admin-edit-section-title">
                          Basic information
                        </h4>

                        <label className="admin-field">
                          <span>Name</span>
                          <input
                            value={previewEditForm.name}
                            onChange={setPreviewEditField("name")}
                            placeholder="e.g. Classic Hoodie"
                            autoComplete="off"
                            disabled={!!editingPreviewId}
                          />
                        </label>

                        <label className="admin-field">
                          <span>Brand (optional)</span>
                          <input
                            value={previewEditForm.brand}
                            onChange={setPreviewEditField("brand")}
                            placeholder="e.g. Lattafa"
                            autoComplete="off"
                            disabled={!!editingPreviewId}
                          />
                        </label>

                        <div className="admin-row">
                          <label className="admin-field">
                            <span>Price (GHS)</span>
                            <input
                              inputMode="decimal"
                              value={previewEditForm.price}
                              onChange={setPreviewEditField("price")}
                              placeholder="e.g. 180"
                              disabled={!!editingPreviewId}
                            />
                          </label>

                          <label className="admin-field">
                            <span>Old price (optional)</span>
                            <input
                              inputMode="decimal"
                              value={previewEditForm.oldPrice}
                              onChange={setPreviewEditField("oldPrice")}
                              placeholder="e.g. 220"
                              disabled={!!editingPreviewId}
                            />
                          </label>
                        </div>

                        <label className="admin-field">
                          <span>Description (optional)</span>
                          <textarea
                            value={previewEditForm.description}
                            onChange={setPreviewEditField("description")}
                            placeholder="Write a short product description..."
                            rows={4}
                            disabled={!!editingPreviewId}
                          />
                        </label>
                      </div>

                      <div className="admin-edit-section">
                        <h4 className="admin-edit-section-title">
                          Store placement
                        </h4>

                        <div className="admin-shop-card">
                          <div className="admin-shop-head">
                            <h3 className="admin-shop-title">Store placement</h3>
                            <p className="admin-shop-sub">
                              {isSuperAdmin
                                ? "You can move preview rows between storefronts before final import."
                                : "Preview rows stay locked to your assigned shop."}
                            </p>
                          </div>

                          <div className="admin-store-pills">
                            {availableShops.map((shopKey) => {
                              const shopMeta = SHOPS.find(
                                (shop) => shop.key === shopKey
                              );
                              return (
                                <button
                                  key={shopKey}
                                  type="button"
                                  className={
                                    normalizeShopKey(previewEditForm.shop) === shopKey
                                      ? "admin-store-pill active"
                                      : "admin-store-pill"
                                  }
                                  onClick={() =>
                                    setPreviewEditForm((prev) => ({
                                      ...prev,
                                      shop: shopKey,
                                    }))
                                  }
                                  disabled={isShopAdmin || !!editingPreviewId}
                                >
                                  {shopMeta?.label || titleize(shopKey)}
                                </button>
                              );
                            })}
                          </div>

                          <label className="admin-field">
                            <span>Shop</span>
                            <select
                              value={previewEditForm.shop}
                              onChange={setPreviewEditField("shop")}
                              disabled={isShopAdmin || !!editingPreviewId}
                            >
                              {availableShops.map((shopKey) => {
                                const shopMeta = SHOPS.find(
                                  (shop) => shop.key === shopKey
                                );
                                return (
                                  <option key={shopKey} value={shopKey}>
                                    {shopMeta?.label || titleize(shopKey)}
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                        </div>

                        <div className="admin-row">
                          <label className="admin-field">
                            <span>Department</span>
                            <select
                              value={previewEditForm.dept}
                              onChange={setPreviewEditField("dept")}
                              disabled={!!editingPreviewId}
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
                              disabled={!!editingPreviewId}
                            >
                              {KINDS.map((k) => (
                                <option key={k.key} value={k.key}>
                                  {k.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="admin-toggles">
                          <label className="admin-switch admin-switch--stock">
                            <input
                              type="checkbox"
                              checked={previewEditForm.inStock}
                              onChange={setPreviewEditField("inStock")}
                              disabled={!!editingPreviewId}
                            />
                            <span className="admin-switch-ui" />
                            <span className="admin-switch-label">In stock</span>
                          </label>

                          <label className="admin-switch admin-switch--featured">
                            <input
                              type="checkbox"
                              checked={previewEditForm.featured}
                              onChange={setPreviewEditField("featured")}
                              disabled={!!editingPreviewId}
                            />
                            <span className="admin-switch-ui" />
                            <span className="admin-switch-label">Featured</span>
                          </label>

                          <label className="admin-switch admin-switch--imported">
                            <input
                              type="checkbox"
                              checked={previewEditForm.shipsFromAbroad}
                              onChange={setPreviewEditField("shipsFromAbroad")}
                              disabled={!!editingPreviewId}
                            />
                            <span className="admin-switch-ui" />
                            <span className="admin-switch-label">
                              Ships from abroad
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="admin-edit-section">
                        <h4 className="admin-edit-section-title">
                          Product customizations
                        </h4>

                        <div className="admin-options-card">
                          <div className="admin-options-head">
                            <div>
                              <h3 className="admin-options-title">
                                Product customizations
                              </h3>
                              <p className="admin-options-sub">
                                Update options like Storage, Color, Size, RAM,
                                Material, Scent, Edition, Bundle and more.
                              </p>
                            </div>

                            <button
                              type="button"
                              className="admin-options-add"
                              onClick={addPreviewEditCustomizationGroup}
                              disabled={!!editingPreviewId}
                            >
                              + Add option group
                            </button>
                          </div>

                          {!previewEditForm.customizations.length ? (
                            <div className="admin-options-empty">
                              No customization groups yet.
                            </div>
                          ) : (
                            <div className="admin-options-list">
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
                                      disabled={!!editingPreviewId}
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
                                        placeholder="e.g. Storage"
                                        disabled={!!editingPreviewId}
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
                                        disabled={!!editingPreviewId}
                                      >
                                        <option value="buttons">Buttons</option>
                                        <option value="select">Dropdown</option>
                                      </select>
                                    </label>
                                  </div>

                                  <label className="admin-field">
                                    <span>Values (comma separated)</span>
                                    <input
                                      value={group.valuesText}
                                      onChange={(e) =>
                                        updatePreviewEditCustomizationGroup(
                                          group.id,
                                          "valuesText",
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g. 128GB, 256GB, 512GB"
                                      disabled={!!editingPreviewId}
                                    />
                                  </label>

                                  <label className="admin-checkline">
                                    <input
                                      type="checkbox"
                                      checked={group.required}
                                      onChange={(e) =>
                                        updatePreviewEditCustomizationGroup(
                                          group.id,
                                          "required",
                                          e.target.checked
                                        )
                                      }
                                      disabled={!!editingPreviewId}
                                    />
                                    <span>Required selection</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="admin-edit-side">
                    <div className="admin-edit-side-card">
                      <h4 className="admin-edit-section-title">Images</h4>

                      {Array.isArray(previewRowToEdit.images) &&
                      previewRowToEdit.images.length ? (
                        <>
                          <div className="admin-image-preview-head">
                            <span className="admin-image-preview-title">
                              Current preview images
                            </span>
                            <span className="admin-image-preview-count">
                              {previewRowToEdit.images.length} image
                              {previewRowToEdit.images.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="admin-uploaded-grid admin-uploaded-grid--compact">
                            {previewRowToEdit.images.map((src, index) => (
                              <a
                                key={`${src}-${index}`}
                                href={src}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-uploaded-thumb"
                              >
                                <img
                                  src={src}
                                  alt={`Preview product ${index + 1}`}
                                  className="admin-uploaded-thumb-img"
                                />
                                {index === 0 ? (
                                  <span className="admin-uploaded-badge">Cover</span>
                                ) : null}
                              </a>
                            ))}
                          </div>
                        </>
                      ) : null}

                      <label className="admin-field">
                        <span>Choose new images (optional)</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          onChange={handlePreviewEditImageChange}
                          disabled={!!editingPreviewId}
                        />
                      </label>

                      {previewEditImagePreviews.length ? (
                        <>
                          <div className="admin-image-preview-head">
                            <span className="admin-image-preview-title">
                              Selected new images
                            </span>
                            <span className="admin-image-preview-count">
                              {previewEditImagePreviews.length} image
                              {previewEditImagePreviews.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="admin-image-preview-grid">
                            {previewEditImagePreviews.map((item, index) => (
                              <div
                                className="admin-image-preview-wrap"
                                key={item.key || `${item.preview}-${index}`}
                              >
                                <img
                                  src={item.preview}
                                  alt={`Preview edit ${index + 1}`}
                                  className="admin-image-preview"
                                />

                                <div className="admin-image-preview-overlay">
                                  <span className="admin-image-index">
                                    {index === 0 ? "New cover" : `Image ${index + 1}`}
                                  </span>

                                  <button
                                    type="button"
                                    className="admin-image-remove-btn"
                                    onClick={() =>
                                      removePreviewEditSelectedImage(index)
                                    }
                                    disabled={
                                      previewEditUploadingImage || !!editingPreviewId
                                    }
                                    aria-label={`Remove image ${index + 1}`}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}

                      <div className="admin-upload-actions">
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          onClick={handlePreviewEditUploadImage}
                          disabled={
                            !previewEditImageFiles.length ||
                            previewEditUploadingImage ||
                            !!editingPreviewId
                          }
                        >
                          {previewEditUploadingImage
                            ? "Uploading…"
                            : "Upload new images"}
                        </button>

                        <button
                          type="button"
                          className="admin-secondary-btn admin-secondary-btn--ghost"
                          onClick={resetPreviewEditImageState}
                          disabled={previewEditUploadingImage || !!editingPreviewId}
                        >
                          Clear new images
                        </button>
                      </div>

                      {previewEditUploadedImages.length ? (
                        <div className="admin-upload-success-wrap">
                          <div className="admin-upload-success">
                            <span className="admin-upload-badge">Uploaded</span>
                            <span className="admin-upload-count">
                              {previewEditUploadedImages.length} image
                              {previewEditUploadedImages.length > 1 ? "s" : ""}
                            </span>
                            <a
                              href={previewEditUploadedImages[0].url}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-upload-link"
                            >
                              View new cover image
                            </a>
                          </div>

                          <div className="admin-uploaded-grid admin-uploaded-grid--compact">
                            {previewEditUploadedImages.map((item, index) => (
                              <a
                                key={`${item.url}-${index}`}
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-uploaded-thumb"
                              >
                                <img
                                  src={item.url}
                                  alt={`Uploaded preview replacement ${index + 1}`}
                                  className="admin-uploaded-thumb-img"
                                />
                                {index === 0 ? (
                                  <span className="admin-uploaded-badge">Cover</span>
                                ) : null}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {previewEditError ? (
                        <div className="admin-msg">{previewEditError}</div>
                      ) : null}
                      {previewEditMsg ? (
                        <div className="admin-msg">{previewEditMsg}</div>
                      ) : null}
                    </div>
                  </aside>
                </div>

                <div className="admin-modal-actions admin-modal-actions--sticky">
                  <button
                    type="button"
                    className="admin-secondary-btn admin-secondary-btn--ghost"
                    onClick={closePreviewEditModal}
                    disabled={!!editingPreviewId}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="admin-btn"
                    onClick={handleSavePreviewEdit}
                    disabled={!!editingPreviewId || previewEditUploadingImage}
                  >
                    {editingPreviewId ? "Saving…" : "Save preview row"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editModalOpen && productToEdit ? (
        <div
          className="admin-modal-backdrop"
          onClick={closeEditModal}
          role="presentation"
        >
          <div
            className="admin-modal admin-modal--fullscreen"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-edit-title"
          >
            <div className="admin-modal-head">
              <h3 id="admin-edit-title" className="admin-modal-title">
                Edit product
              </h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeEditModal}
                disabled={!!editingId}
                aria-label="Close edit modal"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-scroll">
              <div className="admin-modal-inner">
                <div className="admin-edit-layout">
                  <div className="admin-edit-main">
                    <div className="admin-form admin-form--compact">
                      <div className="admin-edit-section">
                        <h4 className="admin-edit-section-title">
                          Basic information
                        </h4>

                        <label className="admin-field">
                          <span>Name</span>
                          <input
                            value={editForm.name}
                            onChange={setEditField("name")}
                            placeholder="e.g. Classic Hoodie"
                            autoComplete="off"
                            disabled={!!editingId}
                          />
                        </label>

                        <label className="admin-field">
                          <span>Brand (optional)</span>
                          <input
                            value={editForm.brand}
                            onChange={setEditField("brand")}
                            placeholder="e.g. Lattafa"
                            autoComplete="off"
                            disabled={!!editingId}
                          />
                        </label>

                        <div className="admin-row">
                          <label className="admin-field">
                            <span>Price (GHS)</span>
                            <input
                              inputMode="decimal"
                              value={editForm.price}
                              onChange={setEditField("price")}
                              placeholder="e.g. 180"
                              disabled={!!editingId}
                            />
                          </label>

                          <label className="admin-field">
                            <span>Old price (optional)</span>
                            <input
                              inputMode="decimal"
                              value={editForm.oldPrice}
                              onChange={setEditField("oldPrice")}
                              placeholder="e.g. 220"
                              disabled={!!editingId}
                            />
                          </label>
                        </div>

                        <label className="admin-field">
                          <span>Description (optional)</span>
                          <textarea
                            value={editForm.description}
                            onChange={setEditField("description")}
                            placeholder="Write a short product description..."
                            rows={4}
                            disabled={!!editingId}
                          />
                        </label>
                      </div>

                      <div className="admin-edit-section">
                        <h4 className="admin-edit-section-title">
                          Store placement
                        </h4>

                        <div className="admin-shop-card">
                          <div className="admin-shop-head">
                            <h3 className="admin-shop-title">Store placement</h3>
                            <p className="admin-shop-sub">
                              {isSuperAdmin
                                ? "You can move only your own uploaded product between storefronts."
                                : "Your product stays locked to your assigned shop unless your account scope changes."}
                            </p>
                          </div>

                          <div className="admin-store-pills">
                            {availableShops.map((shopKey) => {
                              const shopMeta = SHOPS.find(
                                (shop) => shop.key === shopKey
                              );
                              return (
                                <button
                                  key={shopKey}
                                  type="button"
                                  className={
                                    normalizeShopKey(editForm.shop) === shopKey
                                      ? "admin-store-pill active"
                                      : "admin-store-pill"
                                  }
                                  onClick={() =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      shop: shopKey,
                                    }))
                                  }
                                  disabled={isShopAdmin || !!editingId}
                                >
                                  {shopMeta?.label || titleize(shopKey)}
                                </button>
                              );
                            })}
                          </div>

                          <label className="admin-field">
                            <span>Shop</span>
                            <select
                              value={editForm.shop}
                              onChange={setEditField("shop")}
                              disabled={isShopAdmin || !!editingId}
                            >
                              {availableShops.map((shopKey) => {
                                const shopMeta = SHOPS.find(
                                  (shop) => shop.key === shopKey
                                );
                                return (
                                  <option key={shopKey} value={shopKey}>
                                    {shopMeta?.label || titleize(shopKey)}
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                        </div>

                        <div className="admin-row">
                          <label className="admin-field">
                            <span>Department</span>
                            <select
                              value={editForm.dept}
                              onChange={setEditField("dept")}
                              disabled={!!editingId}
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
                              disabled={!!editingId}
                            >
                              {KINDS.map((k) => (
                                <option key={k.key} value={k.key}>
                                  {k.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="admin-toggles">
                          <label className="admin-switch admin-switch--stock">
                            <input
                              type="checkbox"
                              checked={editForm.inStock}
                              onChange={setEditField("inStock")}
                              disabled={!!editingId}
                            />
                            <span className="admin-switch-ui" />
                            <span className="admin-switch-label">In stock</span>
                          </label>

                          <label className="admin-switch admin-switch--featured">
                            <input
                              type="checkbox"
                              checked={editForm.featured}
                              onChange={setEditField("featured")}
                              disabled={!!editingId}
                            />
                            <span className="admin-switch-ui" />
                            <span className="admin-switch-label">Featured</span>
                          </label>

                          <label className="admin-switch admin-switch--imported">
                            <input
                              type="checkbox"
                              checked={editForm.shipsFromAbroad}
                              onChange={setEditField("shipsFromAbroad")}
                              disabled={!!editingId}
                            />
                            <span className="admin-switch-ui" />
                            <span className="admin-switch-label">
                              Ships from abroad
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="admin-edit-section">
                        <h4 className="admin-edit-section-title">
                          Product customizations
                        </h4>

                        <div className="admin-options-card">
                          <div className="admin-options-head">
                            <div>
                              <h3 className="admin-options-title">
                                Product customizations
                              </h3>
                              <p className="admin-options-sub">
                                Update options like Storage, Color, Size, RAM,
                                Material, Scent, Edition, Bundle and more.
                              </p>
                            </div>

                            <button
                              type="button"
                              className="admin-options-add"
                              onClick={addEditCustomizationGroup}
                              disabled={!!editingId}
                            >
                              + Add option group
                            </button>
                          </div>

                          {!editForm.customizations.length ? (
                            <div className="admin-options-empty">
                              No customization groups yet.
                            </div>
                          ) : (
                            <div className="admin-options-list">
                              {editForm.customizations.map((group, index) => (
                                <div className="admin-option-group" key={group.id}>
                                  <div className="admin-option-group-head">
                                    <strong>Option group {index + 1}</strong>
                                    <button
                                      type="button"
                                      className="admin-option-remove"
                                      onClick={() =>
                                        removeEditCustomizationGroup(group.id)
                                      }
                                      disabled={!!editingId}
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
                                        placeholder="e.g. Storage"
                                        disabled={!!editingId}
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
                                        disabled={!!editingId}
                                      >
                                        <option value="buttons">Buttons</option>
                                        <option value="select">Dropdown</option>
                                      </select>
                                    </label>
                                  </div>

                                  <label className="admin-field">
                                    <span>Values (comma separated)</span>
                                    <input
                                      value={group.valuesText}
                                      onChange={(e) =>
                                        updateEditCustomizationGroup(
                                          group.id,
                                          "valuesText",
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g. 128GB, 256GB, 512GB"
                                      disabled={!!editingId}
                                    />
                                  </label>

                                  <label className="admin-checkline">
                                    <input
                                      type="checkbox"
                                      checked={group.required}
                                      onChange={(e) =>
                                        updateEditCustomizationGroup(
                                          group.id,
                                          "required",
                                          e.target.checked
                                        )
                                      }
                                      disabled={!!editingId}
                                    />
                                    <span>Required selection</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="admin-edit-side">
                    <div className="admin-edit-side-card">
                      <h4 className="admin-edit-section-title">Images</h4>

                      {Array.isArray(productToEdit.images) &&
                      productToEdit.images.length ? (
                        <>
                          <div className="admin-image-preview-head">
                            <span className="admin-image-preview-title">
                              Current product images
                            </span>
                            <span className="admin-image-preview-count">
                              {productToEdit.images.length} image
                              {productToEdit.images.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="admin-uploaded-grid admin-uploaded-grid--compact">
                            {productToEdit.images.map((src, index) => (
                              <a
                                key={`${src}-${index}`}
                                href={src}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-uploaded-thumb"
                              >
                                <img
                                  src={src}
                                  alt={`Current product ${index + 1}`}
                                  className="admin-uploaded-thumb-img"
                                />
                                {index === 0 ? (
                                  <span className="admin-uploaded-badge">Cover</span>
                                ) : null}
                              </a>
                            ))}
                          </div>
                        </>
                      ) : null}

                      <label className="admin-field">
                        <span>Choose new images (optional)</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          onChange={handleEditImageChange}
                          disabled={!!editingId}
                        />
                      </label>

                      {editImagePreviews.length ? (
                        <>
                          <div className="admin-image-preview-head">
                            <span className="admin-image-preview-title">
                              Selected new images
                            </span>
                            <span className="admin-image-preview-count">
                              {editImagePreviews.length} image
                              {editImagePreviews.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="admin-image-preview-grid">
                            {editImagePreviews.map((item, index) => (
                              <div
                                className="admin-image-preview-wrap"
                                key={item.key || `${item.preview}-${index}`}
                              >
                                <img
                                  src={item.preview}
                                  alt={`Edit preview ${index + 1}`}
                                  className="admin-image-preview"
                                />

                                <div className="admin-image-preview-overlay">
                                  <span className="admin-image-index">
                                    {index === 0 ? "New cover" : `Image ${index + 1}`}
                                  </span>

                                  <button
                                    type="button"
                                    className="admin-image-remove-btn"
                                    onClick={() => removeEditSelectedImage(index)}
                                    disabled={editUploadingImage || !!editingId}
                                    aria-label={`Remove image ${index + 1}`}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}

                      <div className="admin-upload-actions">
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          onClick={handleEditUploadImage}
                          disabled={
                            !editImageFiles.length ||
                            editUploadingImage ||
                            !!editingId
                          }
                        >
                          {editUploadingImage ? "Uploading…" : "Upload new images"}
                        </button>

                        <button
                          type="button"
                          className="admin-secondary-btn admin-secondary-btn--ghost"
                          onClick={resetEditImageState}
                          disabled={editUploadingImage || !!editingId}
                        >
                          Clear new images
                        </button>
                      </div>

                      {editUploadedImages.length ? (
                        <div className="admin-upload-success-wrap">
                          <div className="admin-upload-success">
                            <span className="admin-upload-badge">Uploaded</span>
                            <span className="admin-upload-count">
                              {editUploadedImages.length} image
                              {editUploadedImages.length > 1 ? "s" : ""}
                            </span>
                            <a
                              href={editUploadedImages[0].url}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-upload-link"
                            >
                              View new cover image
                            </a>
                          </div>

                          <div className="admin-uploaded-grid admin-uploaded-grid--compact">
                            {editUploadedImages.map((item, index) => (
                              <a
                                key={`${item.url}-${index}`}
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-uploaded-thumb"
                              >
                                <img
                                  src={item.url}
                                  alt={`Uploaded replacement ${index + 1}`}
                                  className="admin-uploaded-thumb-img"
                                />
                                {index === 0 ? (
                                  <span className="admin-uploaded-badge">Cover</span>
                                ) : null}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <p className="admin-modal-text admin-modal-text--danger">
                        Enter your admin password to authorize this update.
                      </p>

                      <label className="admin-field">
                        <span>Admin password</span>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Enter your current password"
                          autoComplete="current-password"
                          disabled={!!editingId}
                        />
                      </label>

                      {editError ? <div className="admin-msg">{editError}</div> : null}
                      {editMsg ? <div className="admin-msg">{editMsg}</div> : null}
                    </div>
                  </aside>
                </div>

                <div className="admin-modal-actions admin-modal-actions--sticky">
                  <button
                    type="button"
                    className="admin-secondary-btn admin-secondary-btn--ghost"
                    onClick={closeEditModal}
                    disabled={!!editingId}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="admin-btn"
                    onClick={handleUpdateProduct}
                    disabled={!!editingId || editUploadingImage}
                  >
                    {editingId ? "Verifying & saving…" : "Verify and save changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalOpen && productToDelete ? (
        <div
          className="admin-modal-backdrop"
          onClick={closeDeleteModal}
          role="presentation"
        >
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-delete-title"
          >
            <div className="admin-modal-head">
              <h3 id="admin-delete-title" className="admin-modal-title">
                Confirm product deletion
              </h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeDeleteModal}
                disabled={!!deletingId}
                aria-label="Close delete modal"
              >
                ×
              </button>
            </div>

            <p className="admin-modal-text">
              You are about to permanently delete{" "}
              <strong>{productToDelete.name}</strong>.
            </p>

            <p className="admin-modal-text admin-modal-text--danger">
              Enter your admin password to authorize this action.
            </p>

            <label className="admin-field">
              <span>Admin password</span>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                disabled={!!deletingId}
              />
            </label>

            {deleteError ? <div className="admin-msg">{deleteError}</div> : null}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={closeDeleteModal}
                disabled={!!deletingId}
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-danger-btn"
                onClick={handleDeleteProduct}
                disabled={!!deletingId}
              >
                {deletingId ? "Verifying & deleting…" : "Verify and delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkDeleteModalOpen ? (
        <div
          className="admin-modal-backdrop"
          onClick={closeBulkDeleteModal}
          role="presentation"
        >
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-bulk-delete-title"
          >
            <div className="admin-modal-head">
              <h3 id="admin-bulk-delete-title" className="admin-modal-title">
                Delete selected products
              </h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeBulkDeleteModal}
                disabled={bulkDeleting}
                aria-label="Close bulk delete modal"
              >
                ×
              </button>
            </div>

            <p className="admin-modal-text">
              You are about to permanently delete{" "}
              <strong>
                {selectedProducts.length} selected product
                {selectedProducts.length === 1 ? "" : "s"}
              </strong>.
            </p>

            <div
              style={{
                maxHeight: 220,
                overflowY: "auto",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 10,
                marginBottom: 12,
                display: "grid",
                gap: 8,
              }}
            >
              {selectedProducts.map((product) => (
                <div
                  key={product.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: 14,
                    opacity: 0.9,
                  }}
                >
                  <span style={{ minWidth: 0 }}>{product.name}</span>
                  <span style={{ whiteSpace: "nowrap" }}>
                    {formatMoney(product.price)}
                  </span>
                </div>
              ))}
            </div>

            <p className="admin-modal-text admin-modal-text--danger">
              Enter your admin password to authorize this bulk delete action.
            </p>

            <label className="admin-field">
              <span>Admin password</span>
              <input
                type="password"
                value={bulkDeletePassword}
                onChange={(e) => setBulkDeletePassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                disabled={bulkDeleting}
              />
            </label>

            {bulkDeleteError ? <div className="admin-msg">{bulkDeleteError}</div> : null}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={closeBulkDeleteModal}
                disabled={bulkDeleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-danger-btn"
                onClick={handleBulkDeleteProducts}
                disabled={bulkDeleting}
              >
                {bulkDeleting
                  ? "Verifying & deleting…"
                  : `Delete ${selectedProducts.length} selected`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
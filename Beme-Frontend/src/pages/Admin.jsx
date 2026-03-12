// src/pages/Admin.jsx
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
  price: "",
  oldPrice: "",
  description: "",
  dept: "men",
  kind: "fashion",
  shop: "fashion",
  inStock: true,
  featured: false,
  customizations: [],
};

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
    price: Number(d.price || 0),
    oldPrice:
      d.oldPrice !== undefined && d.oldPrice !== null
        ? Number(d.oldPrice || 0)
        : null,
    image: cover,
    images: images.length ? images : cover ? [cover] : [],
    dept: String(d.dept || "").trim().toLowerCase(),
    kind: String(d.kind || "").trim().toLowerCase(),
    shop: normalizeShopKey(d.shop || "fashion"),
    ownerId: String(d.ownerId || "").trim(),
    ownerName: String(d.ownerName || d.sellerName || "").trim(),
    ownerEmail: String(d.ownerEmail || "").trim(),
    featured: !!d.featured,
    inStock: !!d.inStock,
    createdAt: d.createdAt || null,
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
  const [deletingId, setDeletingId] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

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

  const setField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;

    if (key === "shop" && isShopAdmin) return;

    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addCustomizationGroup = () => {
    setForm((prev) => ({
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

  const removeCustomizationGroup = (id) => {
    setForm((prev) => ({
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
        customizations,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (form.oldPrice !== "") payload.oldPrice = Number(form.oldPrice);
      if (!payload.description) delete payload.description;
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

  const productSummary = useMemo(() => {
    const summaryMap = new Map();

    products.forEach((product) => {
      const key = product.shop || "unknown";
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          shop: key,
          label: formatShopLabel(key),
          count: 0,
          inStock: 0,
          featured: 0,
        });
      }

      const row = summaryMap.get(key);
      row.count += 1;
      if (product.inStock) row.inStock += 1;
      if (product.featured) row.featured += 1;
    });

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [products]);

  const groupedProducts = useMemo(() => {
    const groups = new Map();

    products.forEach((product) => {
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
  }, [products]);

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
              : "Delete only your shop products after password verification."}
          </p>
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
                  {shop.inStock} in stock • {shop.featured} featured
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
            {groupedProducts.map((group) => (
              <div key={group.shop} style={{ display: "grid", gap: 12 }}>
                <div className="admin-head" style={{ marginBottom: 0 }}>
                  <h3 className="admin-title" style={{ fontSize: "1.05rem" }}>
                    {group.label}
                  </h3>
                  <p className="admin-sub">
                    {group.items.length} product
                    {group.items.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="admin-products-list">
                  {group.items.map((product) => {
                    const isDeleting = deletingId === product.id;
                    const gallery = Array.isArray(product.images)
                      ? product.images
                      : product.image
                        ? [product.image]
                        : [];
                    const canDelete = canCurrentUserDeleteProduct(product);
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

                            {!canDelete ? (
                              <span className="admin-flag">Read only</span>
                            ) : null}
                          </div>

                          <div className="admin-product-actions">
                            <button
                              type="button"
                              className="admin-danger-btn"
                              onClick={() => openDeleteModal(product)}
                              disabled={!!deletingId || !canDelete}
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
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-products-empty">No products found yet.</div>
        )}
      </div>

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
    </div>
  );
}
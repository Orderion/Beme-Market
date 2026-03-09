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
  shop: "main",
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
    dept: String(d.dept || "").trim(),
    kind: String(d.kind || "").trim(),
    shop: String(d.shop || "main").trim(),
    featured: !!d.featured,
    inStock: !!d.inStock,
    createdAt: d.createdAt || null,
  };
}

export default function Admin() {
  const { user, reauthenticate } = useAuth();

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

  const deptOptions = useMemo(() => DEPARTMENTS.map((d) => d.key), []);
  const kindOptions = useMemo(() => KINDS.map((k) => k.key), []);
  const shopOptions = useMemo(() => SHOPS.map((s) => s.key), []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    setProductsError("");

    try {
      const qRef = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(qRef);
      setProducts(snap.docs.map(normalizeAdminProduct));
    } catch (error) {
      console.error("Admin products fetch error:", error);

      try {
        const fallbackRef = collection(db, COLLECTION_NAME);
        const fallbackSnap = await getDocs(fallbackRef);
        const normalized = fallbackSnap.docs.map(normalizeAdminProduct);

        normalized.sort((a, b) => {
          const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bt - at;
        });

        setProducts(normalized);
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
  }, []);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  const setField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;

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
    imagePreviews.forEach((url) => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
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

      imagePreviews.forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });

      const previews = files.map((file) => URL.createObjectURL(file));

      setImageFiles(files);
      setImagePreviews(previews);
      setUploadedImages([]);
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
      const next = [...prev];
      const removed = next[indexToRemove];
      if (removed?.startsWith("blob:")) URL.revokeObjectURL(removed);
      return next.filter((_, index) => index !== indexToRemove);
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
    if (!shopOptions.includes(form.shop)) return "Invalid shop selected.";

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

      const customizations = normalizeCustomizationGroups(form.customizations);
      const imageUrls = imagePayloads.map((item) => item.url).filter(Boolean);

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
        shop: form.shop,
        inStock: !!form.inStock,
        featured: !!form.featured,
        customizations,
        createdAt: serverTimestamp(),
      };

      if (form.oldPrice !== "") payload.oldPrice = Number(form.oldPrice);
      if (!payload.description) delete payload.description;
      if (!payload.customizations.length) delete payload.customizations;

      await addDoc(collection(db, COLLECTION_NAME), payload);

      setMsg("✅ Product added successfully.");
      setForm(initial);
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

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-head">
          <h2 className="admin-title">Add Product</h2>
          <p className="admin-sub">
            Uploads to Firestore collection: <b>{COLLECTION_NAME}</b>
          </p>
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
                  {imagePreviews.map((src, index) => (
                    <div
                      className="admin-image-preview-wrap"
                      key={`${src}-${index}`}
                    >
                      <img
                        src={src}
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
                Choose which storefront this product should appear under.
              </p>
            </div>

            <label className="admin-field">
              <span>Shop</span>
              <select value={form.shop} onChange={setField("shop")}>
                {SHOPS.map((shop) => (
                  <option key={shop.key} value={shop.key}>
                    {shop.label}
                  </option>
                ))}
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
            Delete products only after password verification.
          </p>
        </div>

        {productsError ? <div className="admin-msg">{productsError}</div> : null}

        {loadingProducts ? (
          <div className="admin-products-empty">Loading products…</div>
        ) : products.length ? (
          <div className="admin-products-list">
            {products.map((product) => {
              const isDeleting = deletingId === product.id;
              const gallery = Array.isArray(product.images)
                ? product.images
                : product.image
                ? [product.image]
                : [];

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
                          <span>{titleize(product.shop)}</span>
                          <span>{titleize(product.kind)}</span>
                          <span>{titleize(product.dept)}</span>
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
                    </div>

                    <div className="admin-product-actions">
                      <button
                        type="button"
                        className="admin-danger-btn"
                        onClick={() => openDeleteModal(product)}
                        disabled={!!deletingId}
                      >
                        {isDeleting ? "Deleting…" : "Delete product"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
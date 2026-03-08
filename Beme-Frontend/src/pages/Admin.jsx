// src/pages/Admin.jsx

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { DEPARTMENTS, KINDS } from "../constants/catalog";
import { uploadImageToCloudinary, validateImageFile } from "../lib/cloudinary";
import "./Admin.css";

const COLLECTION_NAME = "Products";

const makeOptionGroup = () => ({
  id: crypto.randomUUID(),
  name: "",
  type: "buttons", // buttons | select
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

export default function Admin() {
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [msg, setMsg] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);

  const deptOptions = useMemo(() => DEPARTMENTS.map((d) => d.key), []);
  const kindOptions = useMemo(() => KINDS.map((k) => k.key), []);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");
    setUploadedImage(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    setMsg("");

    if (!file) return;

    try {
      validateImageFile(file);

      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      const localPreview = URL.createObjectURL(file);

      setImageFile(file);
      setImagePreview(localPreview);
      setUploadedImage(null);
    } catch (err) {
      console.error("Image validation error:", err);
      setMsg(`❌ ${err.message}`);
      e.target.value = "";
    }
  };

  const handleUploadImage = async () => {
    if (!imageFile) {
      setMsg("❌ Please choose an image first.");
      return null;
    }

    setUploadingImage(true);
    setMsg("");

    try {
      const result = await uploadImageToCloudinary(imageFile);
      setUploadedImage(result);
      setMsg("✅ Image uploaded successfully.");
      return result;
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

    if (!imageFile && !uploadedImage?.url) {
      return "Product image is required.";
    }

    if (!deptOptions.includes(form.dept)) return "Invalid department selected.";
    if (!kindOptions.includes(form.kind)) return "Invalid type selected.";

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
      let imagePayload = uploadedImage;

      if (!imagePayload?.url && imageFile) {
        imagePayload = await handleUploadImage();
      }

      if (!imagePayload?.url) {
        throw new Error("Image upload did not complete successfully.");
      }

      const customizations = normalizeCustomizationGroups(form.customizations);

      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        image: imagePayload.url,
        imageMeta: {
          publicId: imagePayload.publicId || "",
          width: imagePayload.width || null,
          height: imagePayload.height || null,
          format: imagePayload.format || "",
          bytes: imagePayload.bytes || 0,
          originalFilename: imagePayload.originalFilename || "",
        },
        description: form.description.trim(),
        dept: form.dept,
        kind: form.kind,
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
    } catch (err) {
      console.error("Add product error:", err);
      setMsg(
        `❌ ${err.message || "Failed to add products. Check Firestore rules or console logs."}`
      );
    } finally {
      setSubmitting(false);
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
                <h3 className="admin-upload-title">Product image</h3>
                <p className="admin-upload-sub">
                  Upload product image to Cloudinary, then store the secure URL in Firestore.
                </p>
              </div>
            </div>

            <label className="admin-field">
              <span>Choose image</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
              />
            </label>

            {imagePreview ? (
              <div className="admin-image-preview-wrap">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="admin-image-preview"
                />
              </div>
            ) : (
              <div className="admin-image-empty">No image selected yet.</div>
            )}

            <div className="admin-upload-actions">
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={handleUploadImage}
                disabled={!imageFile || uploadingImage || submitting}
              >
                {uploadingImage ? "Uploading…" : "Upload image"}
              </button>

              <button
                type="button"
                className="admin-secondary-btn admin-secondary-btn--ghost"
                onClick={resetImageState}
                disabled={uploadingImage || submitting}
              >
                Remove image
              </button>
            </div>

            {uploadedImage?.url ? (
              <div className="admin-upload-success">
                <span className="admin-upload-badge">Uploaded</span>
                <a
                  href={uploadedImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-upload-link"
                >
                  View uploaded image
                </a>
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
                  Add options like Storage, Color, Size, RAM, Material, Scent, Edition, Bundle and more.
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
                            updateCustomizationGroup(group.id, "name", e.target.value)
                          }
                          placeholder="e.g. Storage"
                        />
                      </label>

                      <label className="admin-field">
                        <span>Style</span>
                        <select
                          value={group.type}
                          onChange={(e) =>
                            updateCustomizationGroup(group.id, "type", e.target.value)
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
                          updateCustomizationGroup(group.id, "valuesText", e.target.value)
                        }
                        placeholder="e.g. 128GB, 256GB, 512GB"
                      />
                    </label>

                    <label className="admin-checkline">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) =>
                          updateCustomizationGroup(group.id, "required", e.target.checked)
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
    </div>
  );
}
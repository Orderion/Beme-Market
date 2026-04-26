// src/components/productRequest/ProductRequestModal.jsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUserProductRequests } from "../../hooks/useProductRequests";
import "./ProductRequestModal.css";

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Electronics",
  "Fashion & Clothing",
  "Health & Beauty",
  "Home & Kitchen",
  "Sports & Outdoors",
  "Baby & Kids",
  "Food & Groceries",
  "Books & Stationery",
  "Automotive",
  "Other",
];

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6"  y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
/**
 * ProductRequestModal
 * Props:
 *  - onClose : () => void  — closes the modal
 */
export default function ProductRequestModal({ onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submitRequest, submitting, error } = useUserProductRequests();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState("form"); // "form" | "success"
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [form, setForm] = useState({
    productName:     "",
    description:     "",
    preferredBudget: "",
    category:        "",
  });

  const [fieldErrors, setFieldErrors] = useState({});

  // ── Field change ──
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  // ── Image selection ──
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, image: "Image must be under 5MB." }));
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFieldErrors((prev) => ({ ...prev, image: null }));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Validate ──
  function validate() {
    const errors = {};
    if (!form.productName.trim()) errors.productName = "Product name is required.";
    if (form.productName.trim().length > 120) errors.productName = "Max 120 characters.";
    if (!form.description.trim()) errors.description = "Please describe what you're looking for.";
    if (form.description.trim().length < 5) errors.description = "Description too short.";
    if (form.preferredBudget && isNaN(Number(form.preferredBudget))) {
      errors.preferredBudget = "Enter a valid number.";
    }
    return errors;
  }

  // ── Submit ──
  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) {
      navigate("/login");
      onClose();
      return;
    }

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      await submitRequest(form, imageFile);
      setStep("success");
    } catch {
      // error is shown via the hook's error state
    }
  }

  // ── Close on backdrop click ──
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="prm-backdrop" onClick={handleBackdropClick}>
      <div className="prm-sheet" role="dialog" aria-modal="true"
        aria-label="Request a product">

        <div className="prm-bar" />

        {/* ── SUCCESS STATE ── */}
        {step === "success" ? (
          <div className="prm-success">
            <div className="prm-success-icon">
              <IconCheck />
            </div>
            <p className="prm-success-title">Request submitted!</p>
            <p className="prm-success-sub">
              We've received your request and will notify you once the product is sourced.
            </p>
            <button
              type="button"
              className="prm-success-btn"
              onClick={() => { navigate("/account/requests"); onClose(); }}
            >
              View my requests
            </button>
          </div>
        ) : (

          /* ── FORM STATE ── */
          <>
            <div className="prm-header">
              <p className="prm-title">Request a product</p>
              <button type="button" className="prm-close-btn"
                onClick={onClose} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <p className="prm-subtitle">
              Can't find what you're looking for? Tell us and we'll source it for you.
            </p>

            <form className="prm-form" onSubmit={handleSubmit} noValidate>

              {/* Product name */}
              <div className="prm-field">
                <label className="prm-label">
                  Product name <span>*</span>
                </label>
                <input
                  className="prm-input"
                  type="text"
                  name="productName"
                  placeholder="e.g. Sony WH-1000XM5 Headphones"
                  value={form.productName}
                  onChange={handleChange}
                  maxLength={120}
                  autoComplete="off"
                />
                {fieldErrors.productName && (
                  <span className="prm-error">{fieldErrors.productName}</span>
                )}
              </div>

              {/* Description */}
              <div className="prm-field">
                <label className="prm-label">
                  Description <span>*</span>
                </label>
                <textarea
                  className="prm-textarea"
                  name="description"
                  placeholder="Describe the product — colour, size, brand, specs, etc."
                  value={form.description}
                  onChange={handleChange}
                  maxLength={1000}
                />
                {fieldErrors.description && (
                  <span className="prm-error">{fieldErrors.description}</span>
                )}
              </div>

              {/* Category + Budget row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="prm-field">
                  <label className="prm-label">Category</label>
                  <select
                    className="prm-select"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option value="">Select...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="prm-field">
                  <label className="prm-label">Budget (GH₵)</label>
                  <input
                    className="prm-input"
                    type="number"
                    name="preferredBudget"
                    placeholder="e.g. 500"
                    value={form.preferredBudget}
                    onChange={handleChange}
                    min="0"
                  />
                  {fieldErrors.preferredBudget && (
                    <span className="prm-error">{fieldErrors.preferredBudget}</span>
                  )}
                </div>
              </div>

              {/* Reference image */}
              <div className="prm-field">
                <label className="prm-label">Reference image (optional)</label>

                {imagePreview ? (
                  <div className="prm-image-preview">
                    <img src={imagePreview} alt="Reference preview" />
                    <button type="button" className="prm-image-remove"
                      onClick={removeImage} aria-label="Remove image">
                      <IconClose />
                    </button>
                  </div>
                ) : (
                  <div className="prm-upload-box">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      aria-label="Upload reference image"
                    />
                    <div className="prm-upload-icon">
                      <IconUpload />
                    </div>
                    <span className="prm-upload-text">Tap to upload</span>
                    <span className="prm-upload-sub">PNG, JPG up to 5MB</span>
                  </div>
                )}
                {fieldErrors.image && (
                  <span className="prm-error">{fieldErrors.image}</span>
                )}
              </div>

              {/* Global error */}
              {error && <div className="prm-error">{error}</div>}

              {/* Submit */}
              <button
                type="submit"
                className="prm-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <><div className="prm-spinner" /> Submitting...</>
                ) : (
                  "Submit request"
                )}
              </button>

            </form>
          </>
        )}
      </div>
    </div>
  );
}
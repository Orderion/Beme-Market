import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import "./ProductDetails.css";

function normalizeCustomizations(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((group, index) => ({
      id: group?.id || `${group?.name || "option"}-${index}`,
      name: String(group?.name || "").trim(),
      type: group?.type === "select" ? "select" : "buttons",
      required: group?.required !== false,
      values: Array.isArray(group?.values)
        ? group.values.map((v) => String(v).trim()).filter(Boolean)
        : [],
    }))
    .filter((group) => group.name && group.values.length > 0);
}

function buildSelectedOptionsLabel(selectedOptions) {
  return Object.entries(selectedOptions)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" • ");
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [optionError, setOptionError] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      const snap = await getDoc(doc(db, "Products", id));
      if (!snap.exists()) {
        setProduct(null);
        setLoading(false);
        return;
      }

      const nextProduct = { id: snap.id, ...snap.data() };
      setProduct(nextProduct);
      setLoading(false);
    };

    run();
  }, [id]);

  const customizations = useMemo(
    () => normalizeCustomizations(product?.customizations),
    [product?.customizations]
  );

  const price = useMemo(() => Number(product?.price || 0), [product]);
  const oldPrice = useMemo(() => Number(product?.oldPrice || 0), [product]);

  useEffect(() => {
    const initialSelections = {};
    customizations.forEach((group) => {
      initialSelections[group.name] = "";
    });
    setSelectedOptions(initialSelections);
    setOptionError("");
  }, [customizations, product?.id]);

  const formatMoney = (n) => `GHS ${Number(n || 0).toFixed(2)}`;

  const setOptionValue = (groupName, value) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupName]: value,
    }));
    setOptionError("");
  };

  const validateSelections = () => {
    for (const group of customizations) {
      if (group.required && !selectedOptions[group.name]) {
        return `Please choose ${group.name}.`;
      }
    }
    return "";
  };

  const buildCartItem = () => {
    if (!product) return null;

    const selectedOptionsLabel = buildSelectedOptionsLabel(selectedOptions);

    return {
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      image: product.image || "",
      qty,
      selectedOptions,
      selectedOptionsLabel,
      customizations,
    };
  };

  const handleAdd = () => {
    if (!product) return;

    const selectionError = validateSelections();
    if (selectionError) {
      setOptionError(selectionError);
      return;
    }

    const item = buildCartItem();
    if (!item) return;

    addToCart(item);
  };

  const handleBuyNow = () => {
    if (!product) return;

    const selectionError = validateSelections();
    if (selectionError) {
      setOptionError(selectionError);
      return;
    }

    const item = buildCartItem();
    if (!item) return;

    addToCart(item);
    navigate("/checkout");
  };

  if (loading) return <div className="pd-wrap">Loading...</div>;
  if (!product) return <div className="pd-wrap">Product not found.</div>;

  const name = product?.name ?? "Untitled";
  const image = product?.image ?? "";
  const desc =
    product?.description ??
    "This is a premium product from Beme Market. Add a description in Firestore to show details here.";

  return (
    <div className="pd-page">
      <div className="pd-container">
        <div className="pd-media">
          {image ? (
            <img className="pd-img" src={image} alt={name} />
          ) : (
            <div className="pd-img pd-img--empty">No image</div>
          )}
        </div>

        <div className="pd-info">
          <h1 className="pd-title">{name}</h1>

          <div className="pd-meta">
            <div className="pd-badge">
              <span className="pd-badge-icon">👜</span>
              <span>{product?.inStock === false ? "Out of stock" : "In stock"}</span>
            </div>
          </div>

          <div className="pd-price-row">
            <div className="pd-price">{formatMoney(price)}</div>

            {oldPrice > price && (
              <div className="pd-old">
                <span className="pd-old-strike">{formatMoney(oldPrice)}</span>
                <span className="pd-save">
                  Save {formatMoney(oldPrice - price)}
                </span>
              </div>
            )}
          </div>

          <div className="pd-section">
            <h3 className="pd-section-title">Description</h3>
            <p className="pd-desc">{desc}</p>
          </div>

          {customizations.length > 0 && (
            <div className="pd-section">
              <h3 className="pd-section-title">Options</h3>

              <div className="pd-options">
                {customizations.map((group) => (
                  <div className="pd-option-group" key={group.id}>
                    <div className="pd-option-head">
                      <span className="pd-option-name">{group.name}</span>
                      {group.required ? (
                        <span className="pd-option-required">Required</span>
                      ) : null}
                    </div>

                    {group.type === "select" ? (
                      <select
                        className="pd-option-select"
                        value={selectedOptions[group.name] || ""}
                        onChange={(e) => setOptionValue(group.name, e.target.value)}
                      >
                        <option value="">
                          Select {group.name.toLowerCase()}
                        </option>
                        {group.values.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="pd-option-buttons">
                        {group.values.map((value) => {
                          const active = selectedOptions[group.name] === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              className={`pd-option-btn ${active ? "active" : ""}`}
                              onClick={() => setOptionValue(group.name, value)}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {optionError ? <div className="pd-option-error">{optionError}</div> : null}
            </div>
          )}

          <div className="pd-qty-row">
            <div className="pd-qty-label">Quantity</div>

            <div className="pd-qty">
              <button
                className="pd-qty-btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                type="button"
                aria-label="Decrease"
              >
                −
              </button>
              <div className="pd-qty-num">{qty}</div>
              <button
                className="pd-qty-btn"
                onClick={() => setQty((q) => q + 1)}
                type="button"
                aria-label="Increase"
              >
                +
              </button>
            </div>
          </div>

          <div className="pd-actions">
            <button className="pd-btn pd-btn-outline" onClick={handleAdd}>
              Add to cart
            </button>

            <button className="pd-btn pd-btn-black" onClick={handleBuyNow}>
              Buy now
            </button>
          </div>

          <div className="pd-note">
            <span className="pd-note-icon">⏱</span>
            Buy it now, get it in 1–3 days (Ghana).
          </div>
        </div>
      </div>
    </div>
  );
}
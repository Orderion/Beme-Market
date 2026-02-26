// src/pages/Admin.jsx
import { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { DEPARTMENTS, KINDS } from "../constants/catalog";
import "./Admin.css";

const COLLECTION_NAME = "Products"; // ✅ must match your Firestore collection

const initial = {
  name: "",
  price: "",
  oldPrice: "",
  image: "",
  dept: "men",
  kind: "fashion",
  inStock: true,
  featured: false,
};

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function Admin() {
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const deptOptions = useMemo(() => DEPARTMENTS.map((d) => d.key), []);
  const kindOptions = useMemo(() => KINDS.map((k) => k.key), []);

  const setField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
  };

  const validate = () => {
    const name = form.name.trim();
    if (!name) return "Name is required.";

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return "Price must be a valid number ≥ 0.";

    if (form.oldPrice !== "") {
      const old = Number(form.oldPrice);
      if (!Number.isFinite(old) || old < 0) return "Old price must be a valid number ≥ 0.";
      if (old < price) return "Old price should be higher than current price.";
    }

    const image = form.image.trim();
    if (!image) return "Image URL is required.";
    if (!isValidHttpUrl(image)) return "Image must be a valid http/https URL.";

    if (!deptOptions.includes(form.dept)) return "Invalid department selected.";
    if (!kindOptions.includes(form.kind)) return "Invalid type selected.";

    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    const error = validate();
    if (error) {
      setMsg(error);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        image: form.image.trim(),
        dept: form.dept,
        kind: form.kind,
        inStock: !!form.inStock,
        featured: !!form.featured,
        createdAt: serverTimestamp(), // ✅ best practice
      };

      // only write oldPrice if provided
      if (form.oldPrice !== "") payload.oldPrice = Number(form.oldPrice);

      await addDoc(collection(db, COLLECTION_NAME), payload);

      setMsg("✅ Product added successfully.");
      setForm(initial);
    } catch (err) {
      console.error("Add product error:", err);
      setMsg("❌ Failed to add product. Check Firestore rules or console logs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-head">
          <h2 className="admin-title">Add Product</h2>
          <p className="admin-sub">Uploads to Firestore collection: <b>{COLLECTION_NAME}</b></p>
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
                inputMode="numeric"
                value={form.price}
                onChange={setField("price")}
                placeholder="e.g. 180"
              />
            </label>

            <label className="admin-field">
              <span>Old price (optional)</span>
              <input
                inputMode="numeric"
                value={form.oldPrice}
                onChange={setField("oldPrice")}
                placeholder="e.g. 220"
              />
            </label>
          </div>

          <label className="admin-field">
            <span>Image URL</span>
            <input
              value={form.image}
              onChange={setField("image")}
              placeholder="https://..."
              autoComplete="off"
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
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={setField("inStock")}
              />
              <span>In stock</span>
            </label>

            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={setField("featured")}
              />
              <span>Featured</span>
            </label>
          </div>

          {msg ? <div className="admin-msg">{msg}</div> : null}

          <button className="admin-btn" type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add product"}
          </button>
        </form>
      </div>
    </div>
  );
}
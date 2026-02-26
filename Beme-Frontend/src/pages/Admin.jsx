// src/pages/Admin.jsx
import { useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { DEPARTMENTS, KINDS } from "../constants/catalog";
import "./Admin.css";

export default function Admin() {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    price: "",
    oldPrice: "",
    image: "", // URL
    dept: "men",
    kind: "fashion",
    description: "",
    inStock: true,
  });

  const priceNum = useMemo(() => Number(form.price || 0), [form.price]);
  const oldPriceNum = useMemo(() => Number(form.oldPrice || 0), [form.oldPrice]);

  const set = (key) => (e) => {
    const val = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: val }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Product name is required";
    if (!form.image.trim()) return "Image URL is required (for now)";
    if (!(priceNum > 0)) return "Price must be a valid number";
    if (form.oldPrice && !(oldPriceNum > 0)) return "Old price must be a valid number";
    if (form.oldPrice && oldPriceNum <= priceNum) return "Old price should be greater than price";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validate();
    if (err) return alert(err);

    setLoading(true);
    try {
      await addDoc(collection(db, "products"), {
        name: form.name.trim(),
        price: priceNum,
        oldPrice: form.oldPrice ? oldPriceNum : null,
        image: form.image.trim(),
        dept: form.dept, // men|women|kids|accessories
        kind: form.kind, // fashion|tech|extras
        description: form.description.trim() || "",
        inStock: !!form.inStock,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert("✅ Product uploaded");

      setForm({
        name: "",
        price: "",
        oldPrice: "",
        image: "",
        dept: "men",
        kind: "fashion",
        description: "",
        inStock: true,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("❌ Failed to upload product. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin">
      <div className="admin-head">
        <h2 className="admin-title">Upload Product</h2>
        <p className="admin-sub">Products require dept + kind for filtering.</p>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        <label className="admin-label">
          Product name
          <input
            type="text"
            placeholder="e.g. Minimal Hoodie"
            value={form.name}
            onChange={set("name")}
            required
            disabled={loading}
          />
        </label>

        <div className="admin-row2">
          <label className="admin-label">
            Price (GHS)
            <input
              type="number"
              placeholder="e.g. 199"
              value={form.price}
              onChange={set("price")}
              required
              disabled={loading}
            />
          </label>

          <label className="admin-label">
            Old price (optional)
            <input
              type="number"
              placeholder="e.g. 249"
              value={form.oldPrice}
              onChange={set("oldPrice")}
              disabled={loading}
            />
          </label>
        </div>

        <label className="admin-label">
          Image URL (for now)
          <input
            type="url"
            placeholder="https://..."
            value={form.image}
            onChange={set("image")}
            required
            disabled={loading}
          />
        </label>

        <div className="admin-row2">
          <label className="admin-label">
            Department
            <select value={form.dept} onChange={set("dept")} disabled={loading}>
              {DEPARTMENTS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-label">
            Type
            <select value={form.kind} onChange={set("kind")} disabled={loading}>
              {KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="admin-label">
          Description (optional)
          <textarea
            placeholder="Short clean description…"
            value={form.description}
            onChange={set("description")}
            disabled={loading}
            rows={4}
          />
        </label>

        <label className="admin-check">
          <input
            type="checkbox"
            checked={form.inStock}
            onChange={set("inStock")}
            disabled={loading}
          />
          In stock
        </label>

        <button type="submit" disabled={loading} className="admin-btn">
          {loading ? "Uploading…" : "Upload"}
        </button>
      </form>
    </div>
  );
}
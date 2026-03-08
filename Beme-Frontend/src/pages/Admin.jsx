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
} from "firebase/firestore";
import { db } from "../firebase";
import { DEPARTMENTS, KINDS } from "../constants/catalog";
import "./Admin.css";

const COLLECTION_NAME = "Products";

const initial = {
  name: "",
  price: "",
  oldPrice: "",
  image: "",
  description: "",
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
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const deptOptions = useMemo(() => DEPARTMENTS.map((d) => d.key), []);
  const kindOptions = useMemo(() => KINDS.map((k) => k.key), []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"))
      );

      setProducts(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } catch (err) {
      console.error("Load products error:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const setField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
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
    }

    const image = form.image.trim();
    if (!image) return "Image URL is required.";
    if (!isValidHttpUrl(image)) return "Image must be a valid http/https URL.";

    if (!deptOptions.includes(form.dept)) return "Invalid department selected.";
    if (!kindOptions.includes(form.kind)) return "Invalid type selected.";

    return "";
  };

  const resetForm = () => {
    setForm(initial);
    setEditingId("");
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      price: String(product.price ?? ""),
      oldPrice: product.oldPrice != null ? String(product.oldPrice) : "",
      image: product.image || "",
      description: product.description || "",
      dept: product.dept || "men",
      kind: product.kind || "fashion",
      inStock: !!product.inStock,
      featured: !!product.featured,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id) => {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      setMsg("✅ Product deleted.");
      if (editingId === id) resetForm();
      loadProducts();
    } catch (err) {
      console.error("Delete product error:", err);
      setMsg("❌ Failed to delete product.");
    }
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
        description: form.description.trim(),
        dept: form.dept,
        kind: form.kind,
        inStock: !!form.inStock,
        featured: !!form.featured,
        updatedAt: serverTimestamp(),
      };

      if (form.oldPrice !== "") payload.oldPrice = Number(form.oldPrice);
      if (!payload.description) delete payload.description;

      if (editingId) {
        await updateDoc(doc(db, COLLECTION_NAME, editingId), payload);
        setMsg("✅ Product updated successfully.");
      } else {
        await addDoc(collection(db, COLLECTION_NAME), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setMsg("✅ Product added successfully.");
      }

      resetForm();
      loadProducts();
    } catch (err) {
      console.error("Save product error:", err);
      setMsg("❌ Failed to save product. Check Firestore rules or console logs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-head">
          <h2 className="admin-title">{editingId ? "Edit Product" : "Add Product"}</h2>
          <p className="admin-sub">
            Managing Firestore collection: <b>{COLLECTION_NAME}</b>
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

          {msg ? <div className="admin-msg">{msg}</div> : null}

          <div className="admin-actions-row">
            <button className="admin-btn" type="submit" disabled={submitting}>
              {submitting ? (editingId ? "Saving…" : "Adding…") : editingId ? "Save product" : "Add product"}
            </button>

            {editingId ? (
              <button
                className="admin-btn admin-btn-secondary"
                type="button"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="admin-card admin-card-list">
        <div className="admin-head">
          <h2 className="admin-title">Products</h2>
          <p className="admin-sub">Edit or delete products already in your store.</p>
        </div>

        {loadingProducts ? (
          <div className="admin-msg">Loading products...</div>
        ) : !products.length ? (
          <div className="admin-msg">No products yet.</div>
        ) : (
          <div className="admin-product-list">
            {products.map((product) => (
              <div key={product.id} className="admin-product-row">
                <div className="admin-product-main">
                  <strong>{product.name || "Untitled"}</strong>
                  <span>GHS {Number(product.price || 0).toFixed(2)}</span>
                </div>

                <div className="admin-product-actions">
                  <button type="button" onClick={() => startEdit(product)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onDelete(product.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
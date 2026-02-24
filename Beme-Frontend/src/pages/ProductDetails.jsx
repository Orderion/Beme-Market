import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import "./ProductDetails.css";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, "Products", id));
      if (!snap.exists()) {
        setProduct(null);
        setLoading(false);
        return;
      }
      setProduct({ id: snap.id, ...snap.data() });
      setLoading(false);
    };

    run();
  }, [id]);

  const price = useMemo(() => Number(product?.price || 0), [product]);
  const oldPrice = useMemo(() => Number(product?.oldPrice || 0), [product]);

  const formatMoney = (n) => `GHS ${Number(n || 0).toFixed(2)}`;

  const handleAdd = () => {
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      image: product.image || "",
      qty,
    });
  };

  const handleBuyNow = () => {
    handleAdd();
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
        {/* MEDIA */}
        <div className="pd-media">
          {image ? (
            <img className="pd-img" src={image} alt={name} />
          ) : (
            <div className="pd-img pd-img--empty">No image</div>
          )}
        </div>

        {/* INFO */}
        <div className="pd-info">
          <h1 className="pd-title">{name}</h1>

          <div className="pd-meta">
            <div className="pd-badge">
              <span className="pd-badge-icon">👜</span>
              <span>In stock</span>
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

          {/* DESCRIPTION */}
          <div className="pd-section">
            <h3 className="pd-section-title">Description</h3>
            <p className="pd-desc">{desc}</p>
          </div>

          {/* QUANTITY */}
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

          {/* ACTIONS */}
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
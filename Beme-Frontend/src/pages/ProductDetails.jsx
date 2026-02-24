import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useCart } from "../context/CartContext";

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

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!product) return <div style={{ padding: 24 }}>Product not found.</div>;

  const price = Number(product.price || 0);

  const handleAdd = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price,
      image: product.image || "",
      qty,
    });
  };

  return (
    <div className="pd">
      <div className="pdGrid">
        <div className="pdMedia">
          {product.image ? (
            <img className="pdImage" src={product.image} alt={product.name} />
          ) : (
            <div className="pdPlaceholder">No image</div>
          )}
        </div>

        <div className="pdInfo">
          <h1 className="pdTitle">{product.name}</h1>

          <div className="pdPriceRow">
            <div className="pdPrice">GHS {price.toFixed(2)}</div>
            {product.oldPrice ? (
              <div className="pdOld">GHS {Number(product.oldPrice).toFixed(2)}</div>
            ) : null}
          </div>

          {product.description ? (
            <p className="pdDesc">{product.description}</p>
          ) : null}

          <div className="pdQty">
            <span>Quantity</span>
            <div className="pdQtyControl">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <div>{qty}</div>
              <button onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>

          <div className="pdActions">
            <button className="btnPrimary" onClick={handleAdd}>Add to cart</button>
            <button className="btnGhost" onClick={() => { handleAdd(); navigate("/checkout"); }}>
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
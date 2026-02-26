// src/pages/OrderSuccess.jsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { paystackVerify } from "../services/api";
import { useCart } from "../context/CartContext";
import "./OrderSuccess.css";

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const reference = params.get("reference");

  const { clearCart } = useCart();

  const [status, setStatus] = useState("verifying"); 
  // verifying | paid | failed | cod

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      // COD flow (no Paystack reference)
      if (!reference) {
        if (!cancelled) {
          clearCart();
          setStatus("cod");
        }
        return;
      }

      try {
        const res = await paystackVerify(reference);
        const ok = !!res?.data?.isSuccess;

        if (cancelled) return;

        if (ok) {
          clearCart();
          setStatus("paid");
        } else {
          setStatus("failed");
        }
      } catch (e) {
        console.error("Verification error:", e);
        if (!cancelled) setStatus("failed");
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [reference, clearCart]);

  return (
    <div className="page">
      <div className="order-success-card">
        {status === "verifying" && (
          <>
            <div className="order-success-icon">…</div>
            <h2 className="order-success-title">Verifying payment</h2>
            <p className="order-success-sub">
              Please wait while we confirm your transaction.
            </p>
          </>
        )}

        {status === "paid" && (
          <>
            <div className="order-success-icon">✓</div>
            <h2 className="order-success-title">Payment successful</h2>
            <p className="order-success-sub">
              Your order has been confirmed. Thank you for shopping with us.
            </p>

            <div className="order-success-actions">
              <Link to="/shop" className="order-success-btn">
                Continue shopping
              </Link>
            </div>
          </>
        )}

        {status === "cod" && (
          <>
            <div className="order-success-icon">✓</div>
            <h2 className="order-success-title">Order placed</h2>
            <p className="order-success-sub">
              Pay on delivery selected. Our team will contact you shortly.
            </p>

            <div className="order-success-actions">
              <Link to="/shop" className="order-success-btn">
                Continue shopping
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="order-success-icon">!</div>
            <h2 className="order-success-title">Payment not confirmed</h2>
            <p className="order-success-sub">
              If you were charged, contact support with your reference.
            </p>

            <Link to="/checkout" className="order-success-link">
              Back to checkout
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
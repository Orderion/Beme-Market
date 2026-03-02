// src/pages/OrderSuccess.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { paystackVerify } from "../services/api";
import { useCart } from "../context/CartContext";
import "./OrderSuccess.css";

function formatDateGH(date) {
  return new Intl.DateTimeFormat("en-GH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default function OrderSuccess() {
  const [params] = useSearchParams();

  const reference = params.get("reference");
  const urlStatus = params.get("status"); // success | failed | verify_error | etc.

  const { clearCart } = useCart();

  const [status, setStatus] = useState("verifying"); // verifying | paid | failed | cod
  const [orderId, setOrderId] = useState(null);

  const etaText = useMemo(() => {
    // Ghana estimate: 1–3 days
    const now = new Date();
    const from = addDays(now, 1);
    const to = addDays(now, 3);
    return `${formatDateGH(from)} – ${formatDateGH(to)}`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // COD flow: no reference
      if (!reference) {
        if (!cancelled) {
          clearCart();
          setStatus("cod");
        }
        return;
      }

      // If backend already redirected with status=success
      if (urlStatus === "success") {
        if (!cancelled) {
          clearCart();
          setStatus("paid");
          // orderId is embedded inside reference format BM_<id>
          // reference is BM_<orderId>
          const derivedId = reference.startsWith("BM_") ? reference.replace("BM_", "") : null;
          setOrderId(derivedId);
        }
        return;
      }

      // Any non-success status in URL means fail state
      if (urlStatus && urlStatus !== "success") {
        if (!cancelled) setStatus("failed");
        return;
      }

      // Fallback: verify via backend
      try {
        const data = await paystackVerify(reference);

        if (cancelled) return;

        if (data?.ok && data?.status === "success") {
          clearCart();
          setStatus("paid");
          setOrderId(data?.orderId || (reference.startsWith("BM_") ? reference.replace("BM_", "") : null));
        } else {
          setStatus("failed");
          setOrderId(data?.orderId || null);
        }
      } catch (e) {
        console.error("Verification error:", e);
        if (!cancelled) setStatus("failed");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [reference, urlStatus, clearCart]);

  return (
    <div className="page">
      <div className={`order-success-card ${status}`}>
        {status === "verifying" && (
          <>
            <div className="order-success-icon">
              <span className="spinner" aria-label="Loading" />
            </div>
            <h2 className="order-success-title">Verifying payment</h2>
            <p className="order-success-sub">Please wait while we confirm your transaction.</p>

            {reference ? (
              <div className="order-success-meta">
                <div><span>Reference</span><b>{reference}</b></div>
              </div>
            ) : null}
          </>
        )}

        {status === "paid" && (
          <>
            <div className="order-success-icon">✓</div>
            <h2 className="order-success-title">Payment successful</h2>
            <p className="order-success-sub">
              Your order has been confirmed. Estimated delivery: <b>{etaText}</b>
            </p>

            <div className="order-success-meta">
              {orderId ? (
                <div><span>Order number</span><b>{orderId}</b></div>
              ) : null}
              <div><span>Reference</span><b>{reference}</b></div>
            </div>

            <div className="order-success-actions">
              <Link to="/shop" className="order-success-btn">Continue shopping</Link>
            </div>
          </>
        )}

        {status === "cod" && (
          <>
            <div className="order-success-icon">✓</div>
            <h2 className="order-success-title">Order placed</h2>
            <p className="order-success-sub">
              Pay on delivery selected. Estimated delivery: <b>{etaText}</b>
            </p>

            <div className="order-success-actions">
              <Link to="/shop" className="order-success-btn">Continue shopping</Link>
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

            <div className="order-success-meta">
              {orderId ? (
                <div><span>Order number</span><b>{orderId}</b></div>
              ) : null}
              {reference ? (
                <div><span>Reference</span><b>{reference}</b></div>
              ) : null}
            </div>

            <Link to="/checkout" className="order-success-link">Back to checkout</Link>
          </>
        )}
      </div>
    </div>
  );
}
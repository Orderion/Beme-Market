import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { paystackVerify } from "../services/api";
import { useCart, clearCartStorage } from "../context/CartContext";
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

function AnimatedTitle({ text }) {
  return (
    <span className="order-success-letters" aria-label={text}>
      {text.split("").map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="order-success-letter"
          style={{ animationDelay: `${index * 0.035}s` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export default function OrderSuccess() {
  const [params] = useSearchParams();

  const reference = String(params.get("reference") || "").trim();
  const urlStatus = normalizeStatus(params.get("status"));

  const { clearCart } = useCart();

  const [status, setStatus] = useState("verifying");
  const [orderId, setOrderId] = useState(null);
  const [referenceText, setReferenceText] = useState(reference || null);

  const hasClearedCartRef = useRef(false);
  const hasVerifiedRef = useRef(false);

  const etaText = useMemo(() => {
    const now = new Date();
    const from = addDays(now, 1);
    const to = addDays(now, 3);
    return `${formatDateGH(from)} – ${formatDateGH(to)}`;
  }, []);

  const clearCartEverywhere = () => {
    if (hasClearedCartRef.current) return;
    hasClearedCartRef.current = true;

    try {
      clearCartStorage();
    } catch (error) {
      console.error("Failed to clear cart storage:", error);
    }

    try {
      clearCart();
    } catch (error) {
      console.error("Failed to clear cart context:", error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (hasVerifiedRef.current) return;
      hasVerifiedRef.current = true;

      if (!reference) {
        if (!cancelled) {
          clearCartEverywhere();
          setReferenceText(null);
          setStatus("cod");
        }
        return;
      }

      setReferenceText(reference);

      if (urlStatus === "success") {
        if (!cancelled) {
          clearCartEverywhere();
          setStatus("paid");
          setOrderId(
            reference.startsWith("BM_") ? reference.replace("BM_", "") : null
          );
        }
        return;
      }

      if (urlStatus === "verifying") {
        try {
          const data = await paystackVerify(reference);

          if (cancelled) return;

          if (data?.ok && normalizeStatus(data?.status) === "success") {
            clearCartEverywhere();
            setStatus("paid");
            setOrderId(
              data?.orderId ||
                (reference.startsWith("BM_")
                  ? reference.replace("BM_", "")
                  : null)
            );
            return;
          }

          setStatus("failed");
          setOrderId(data?.orderId || null);
        } catch (error) {
          console.error("Verification error:", error);
          if (!cancelled) setStatus("failed");
        }
        return;
      }

      if (
        urlStatus &&
        [
          "failed",
          "verify_error",
          "missing_reference",
          "amount_mismatch",
          "invalid_metadata_type",
          "invalid_user",
          "user_mismatch",
          "not_found",
          "abandoned",
          "reversed",
          "cancelled",
          "error",
          "pending",
        ].includes(urlStatus)
      ) {
        try {
          const data = await paystackVerify(reference);

          if (cancelled) return;

          if (data?.ok && normalizeStatus(data?.status) === "success") {
            clearCartEverywhere();
            setStatus("paid");
            setOrderId(
              data?.orderId ||
                (reference.startsWith("BM_")
                  ? reference.replace("BM_", "")
                  : null)
            );
            return;
          }

          setStatus("failed");
          setOrderId(data?.orderId || null);
        } catch (error) {
          console.error("Verification error:", error);
          if (!cancelled) setStatus("failed");
        }
        return;
      }

      try {
        const data = await paystackVerify(reference);

        if (cancelled) return;

        if (data?.ok && normalizeStatus(data?.status) === "success") {
          clearCartEverywhere();
          setStatus("paid");
          setOrderId(
            data?.orderId ||
              (reference.startsWith("BM_") ? reference.replace("BM_", "") : null)
          );
        } else {
          setStatus("failed");
          setOrderId(data?.orderId || null);
        }
      } catch (error) {
        console.error("Verification error:", error);
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
        <div className="order-success-glow" aria-hidden="true" />

        {status === "verifying" && (
          <>
            <div className="order-success-icon">
              <span className="spinner" aria-label="Loading" />
            </div>
            <h2 className="order-success-title">Verifying payment</h2>
            <p className="order-success-sub">
              Please wait while we confirm your transaction.
            </p>

            {referenceText ? (
              <div className="order-success-meta">
                <div>
                  <span>Reference</span>
                  <b>{referenceText}</b>
                </div>
              </div>
            ) : null}
          </>
        )}

        {status === "paid" && (
          <>
            <div className="order-success-icon order-success-icon--success">
              ✓
            </div>
            <h2 className="order-success-title">
              <AnimatedTitle text="Order Complete" />
            </h2>
            <p className="order-success-sub">
              Your payment was successful and your order has been confirmed.
              Estimated delivery: <b>{etaText}</b>
            </p>

            <div className="order-success-meta">
              {orderId ? (
                <div>
                  <span>Order number</span>
                  <b>{orderId}</b>
                </div>
              ) : null}
              {referenceText ? (
                <div>
                  <span>Reference</span>
                  <b>{referenceText}</b>
                </div>
              ) : null}
            </div>

            <div className="order-success-actions">
              <Link to="/orders" className="order-success-btn">
                View my orders
              </Link>
              <Link
                to="/shop"
                className="order-success-btn order-success-btn--ghost"
              >
                Continue shopping
              </Link>
            </div>
          </>
        )}

        {status === "cod" && (
          <>
            <div className="order-success-icon order-success-icon--success">
              ✓
            </div>
            <h2 className="order-success-title">
              <AnimatedTitle text="Order Received" />
            </h2>
            <p className="order-success-sub">
              Your order has been placed successfully with pay on delivery.
              Estimated delivery: <b>{etaText}</b>
            </p>

            <div className="order-success-meta">
              <div>
                <span>Payment method</span>
                <b>Pay on Delivery</b>
              </div>
              <div>
                <span>Status</span>
                <b>Pending confirmation</b>
              </div>
            </div>

            <div className="order-success-actions">
              <Link to="/orders" className="order-success-btn">
                View my orders
              </Link>
              <Link
                to="/shop"
                className="order-success-btn order-success-btn--ghost"
              >
                Continue shopping
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="order-success-icon order-success-icon--failed">
              !
            </div>
            <h2 className="order-success-title">Payment not confirmed</h2>
            <p className="order-success-sub">
              We could not confirm this payment yet. If you were charged, contact
              support and share your payment reference.
            </p>

            <div className="order-success-meta">
              {orderId ? (
                <div>
                  <span>Order number</span>
                  <b>{orderId}</b>
                </div>
              ) : null}
              {referenceText ? (
                <div>
                  <span>Reference</span>
                  <b>{referenceText}</b>
                </div>
              ) : null}
            </div>

            <div className="order-success-actions">
              <Link to="/checkout" className="order-success-btn">
                Back to checkout
              </Link>
              <Link
                to="/support"
                className="order-success-btn order-success-btn--ghost"
              >
                Contact support
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
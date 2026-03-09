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

export default function OrderSuccess() {
  const [params] = useSearchParams();

  const reference = params.get("reference");
  const urlStatus = params.get("status");

  const { clearCart } = useCart();

  const [status, setStatus] = useState("verifying");
  const [orderId, setOrderId] = useState(null);

  const etaText = useMemo(() => {
    const now = new Date();
    const from = addDays(now, 1);
    const to = addDays(now, 3);
    return `${formatDateGH(from)} – ${formatDateGH(to)}`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!reference) {
        if (!cancelled) {
          clearCart();
          setStatus("cod");
        }
        return;
      }

      if (urlStatus === "success") {
        if (!cancelled) {
          clearCart();
          setStatus("paid");
          const derivedId = reference.startsWith("BM_")
            ? reference.replace("BM_", "")
            : null;
          setOrderId(derivedId);
        }
        return;
      }

      if (urlStatus && urlStatus !== "success") {
        if (!cancelled) setStatus("failed");
        return;
      }

      try {
        const data = await paystackVerify(reference);

        if (cancelled) return;

        if (data?.ok && data?.status === "success") {
          clearCart();
          setStatus("paid");
          setOrderId(
            data?.orderId ||
              (reference.startsWith("BM_") ? reference.replace("BM_", "") : null)
          );
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

            {reference ? (
              <div className="order-success-meta">
                <div>
                  <span>Reference</span>
                  <b>{reference}</b>
                </div>
              </div>
            ) : null}
          </>
        )}

        {status === "paid" && (
          <>
            <div className="order-success-icon order-success-icon--success">✓</div>
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
              <div>
                <span>Reference</span>
                <b>{reference}</b>
              </div>
            </div>

            <div className="order-success-actions">
              <Link to="/shop" className="order-success-btn">
                Continue shopping
              </Link>
            </div>
          </>
        )}

        {status === "cod" && (
          <>
            <div className="order-success-icon order-success-icon--success">✓</div>
            <h2 className="order-success-title">
              <AnimatedTitle text="Order Received" />
            </h2>
            <p className="order-success-sub">
              Pay on delivery selected. Estimated delivery: <b>{etaText}</b>
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
            <div className="order-success-icon order-success-icon--failed">!</div>
            <h2 className="order-success-title">Payment not confirmed</h2>
            <p className="order-success-sub">
              If you were charged, contact support with your reference.
            </p>

            <div className="order-success-meta">
              {orderId ? (
                <div>
                  <span>Order number</span>
                  <b>{orderId}</b>
                </div>
              ) : null}
              {reference ? (
                <div>
                  <span>Reference</span>
                  <b>{reference}</b>
                </div>
              ) : null}
            </div>

            <Link to="/checkout" className="order-success-link">
              Back to checkout
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
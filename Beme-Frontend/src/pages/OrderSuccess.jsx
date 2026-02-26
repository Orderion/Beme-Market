// src/pages/OrderSuccess.jsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { paystackVerify } from "../services/api";
import "./OrderSuccess.css"; // optional if you have it

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const reference = params.get("reference");

  const [status, setStatus] = useState("verifying"); // verifying | paid | failed | cod

  useEffect(() => {
    if (!reference) {
      setStatus("cod"); // COD flow lands here without reference
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await paystackVerify(reference);
        const ok = !!res?.data?.isSuccess;

        if (cancelled) return;
        setStatus(ok ? "paid" : "failed");
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <div className="page" style={{ padding: 24 }}>
      {status === "verifying" && <p>Verifying payment…</p>}

      {status === "paid" && (
        <>
          <h2>Payment successful ✅</h2>
          <p>Your order has been confirmed.</p>
          <Link to="/shop">Continue shopping</Link>
        </>
      )}

      {status === "cod" && (
        <>
          <h2>Order placed ✅</h2>
          <p>Pay on delivery selected. We’ll contact you soon.</p>
          <Link to="/shop">Continue shopping</Link>
        </>
      )}

      {status === "failed" && (
        <>
          <h2>Payment not confirmed ❌</h2>
          <p>If you were charged, contact support with your reference.</p>
          <Link to="/checkout">Back to checkout</Link>
        </>
      )}
    </div>
  );
}
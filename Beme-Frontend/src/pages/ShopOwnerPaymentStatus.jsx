import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyShopOwnerPayment } from "../lib/checkout";
import "./AdminLogin.css";

export default function ShopOwnerPaymentStatus() {
  const [params] = useSearchParams();
  const reference = params.get("reference") || "";
  const statusParam = params.get("status") || "";

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({
    ok: false,
    status: "",
    message: "",
    applicationId: "",
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!reference) {
        if (!alive) return;
        setResult({
          ok: false,
          status: "missing_reference",
          message: "Missing payment reference.",
          applicationId: "",
        });
        setLoading(false);
        return;
      }

      try {
        const data = await verifyShopOwnerPayment(reference);
        if (!alive) return;

        const paid = data?.status === "success";
        setResult({
          ok: paid,
          status: data?.status || statusParam || "unknown",
          message: paid
            ? "Payment verified successfully. Your application is now waiting for admin approval."
            : `Payment status: ${data?.status || statusParam || "unknown"}`,
          applicationId: data?.applicationId || "",
        });
      } catch (error) {
        if (!alive) return;
        setResult({
          ok: false,
          status: statusParam || "verify_error",
          message: error?.message || "We could not verify this payment.",
          applicationId: "",
        });
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [reference, statusParam]);

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <p className="admin-login-eyebrow">Beme Market Marketplace</p>
        <h1 className="admin-login-title">Shop Payment Status</h1>
        <p className="admin-login-subtitle">
          {loading ? "Verifying your payment..." : result.message}
        </p>

        {!loading ? (
          <>
            <div className="admin-login-error" style={{ color: result.ok ? "green" : "inherit" }}>
              Reference: {reference || "—"}
              <br />
              Status: {result.status || "—"}
              {result.applicationId ? (
                <>
                  <br />
                  Application ID: {result.applicationId}
                </>
              ) : null}
            </div>

            <div className="admin-login-footer" style={{ marginTop: 20 }}>
              <Link to="/own-a-shop" className="admin-login-link">
                Back to Own a Shop
              </Link>
              <Link to="/" className="admin-login-link">
                Go Home
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
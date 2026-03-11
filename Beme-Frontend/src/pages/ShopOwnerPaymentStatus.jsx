import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyShopOwnerPayment } from "../lib/checkout";
import { useAuth } from "../context/AuthContext";
import "./AdminLogin.css";

export default function ShopOwnerPaymentStatus() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshProfile } = useAuth();

  const reference = params.get("reference") || "";
  const statusParam = params.get("status") || "";
  const activatedParam = params.get("activated") === "1";

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({
    ok: false,
    status: "",
    message: "",
    applicationId: "",
    shop: "",
    activated: false,
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
          shop: "",
          activated: false,
        });
        setLoading(false);
        return;
      }

      try {
        const data = await verifyShopOwnerPayment(reference);
        if (!alive) return;

        const paid = data?.status === "success";
        const activated = paid || !!data?.activated || activatedParam;

        if (activated) {
          await refreshProfile().catch(() => null);
        }

        setResult({
          ok: paid,
          status: data?.status || statusParam || "unknown",
          message: activated
            ? "Payment verified successfully. Your shop access is now active."
            : `Payment status: ${data?.status || statusParam || "unknown"}`,
          applicationId: data?.applicationId || "",
          shop: data?.shop || "",
          activated,
        });

        if (activated) {
          window.setTimeout(() => {
            navigate("/admin", { replace: true });
          }, 1800);
        }
      } catch (error) {
        if (!alive) return;
        setResult({
          ok: false,
          status: statusParam || "verify_error",
          message: error?.message || "We could not verify this payment.",
          applicationId: "",
          shop: "",
          activated: false,
        });
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [reference, statusParam, activatedParam, refreshProfile, navigate]);

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <p className="admin-login-eyebrow">Beme Market Marketplace</p>
        <h1 className="admin-login-title">Shop Payment Status</h1>
        <p className="admin-login-subtitle">
          {loading
            ? "Verifying your payment..."
            : result.activated
              ? `${result.message} Redirecting you to admin...`
              : result.message}
        </p>

        {!loading ? (
          <>
            <div className="admin-login-error" style={{ color: result.ok ? "green" : "inherit" }}>
              Reference: {reference || "—"}
              <br />
              Status: {result.status || "—"}
              {result.shop ? (
                <>
                  <br />
                  Shop: {result.shop}
                </>
              ) : null}
              {result.applicationId ? (
                <>
                  <br />
                  Application ID: {result.applicationId}
                </>
              ) : null}
            </div>

            <div className="admin-login-footer" style={{ marginTop: 20 }}>
              {!result.activated ? (
                <Link to="/own-a-shop" className="admin-login-link">
                  Back to Own a Shop
                </Link>
              ) : (
                <Link to="/admin" className="admin-login-link">
                  Go to Admin
                </Link>
              )}

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
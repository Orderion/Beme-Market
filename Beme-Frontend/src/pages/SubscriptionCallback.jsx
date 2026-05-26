import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifySubscriptionPayment } from "../services/subscriptionService";

export default function SubscriptionCallback() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const [status,     setStatus]     = useState("verifying"); // verifying | success | failed
  const [planId,     setPlanId]     = useState("");
  const [billing,    setBilling]    = useState("");
  const [amountGHS,  setAmountGHS]  = useState(0);
  const [error,      setError]      = useState("");

  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) {
      setStatus("failed");
      setError("No payment reference found. Please contact support.");
      return;
    }

    (async () => {
      try {
        const data = await verifySubscriptionPayment(reference);
        setPlanId(data.planId || "");
        setBilling(data.billing || "monthly");
        setAmountGHS(data.amountGHS || 0);
        setStatus("success");
        // Redirect to success page after 2s
        setTimeout(() => {
          navigate(`/subscription/success?plan=${data.planId}&billing=${data.billing}`, { replace: true });
        }, 2000);
      } catch (e) {
        setStatus("failed");
        setError(e.message || "Payment verification failed.");
      }
    })();
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f7fa",
      fontFamily: "var(--font-main,'Nunito',sans-serif)",
      padding: 24,
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: "48px 40px",
        maxWidth: 440,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
        border: "1px solid rgba(0,0,0,0.07)",
      }}>

        {status === "verifying" && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%",
              background: "rgba(4,110,242,0.1)", display: "flex",
              alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <div style={{ width: 28, height: 28, border: "3px solid rgba(4,110,242,0.2)",
                borderTopColor: "#046EF2", borderRadius: "50%",
                animation: "spin 0.9s linear infinite" }}/>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 8 }}>
              Verifying payment…
            </div>
            <div style={{ fontSize: 14, color: "#9ca3af", fontWeight: 500 }}>
              Please wait — we're confirming your payment with Paystack.
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%",
              background: "#f0fdf4", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 8 }}>
              Payment confirmed!
            </div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6, fontWeight: 500 }}>
              GHS {Number(amountGHS).toFixed(2)} received
            </div>
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20,
              background: "rgba(4,110,242,0.08)", color: "#046EF2",
              fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              {planId.charAt(0).toUpperCase() + planId.slice(1)} Plan · {billing === "yearly" ? "Yearly" : "Monthly"}
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>
              Redirecting to your dashboard…
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%",
              background: "#fef2f2", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 8 }}>
              Payment verification failed
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
              {error}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => navigate("/seller-dashboard?tab=subscription")}
                style={{ padding: "11px 24px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.12)",
                  background: "#f5f7fa", color: "#111", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit" }}>
                Back to Plans
              </button>
              <a href="mailto:support@bememarket.store"
                style={{ padding: "11px 24px", borderRadius: 10, border: "none",
                  background: "#046EF2", color: "#fff", fontSize: 13, fontWeight: 700,
                  textDecoration: "none", display: "inline-block" }}>
                Contact Support
              </a>
            </div>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifySubscriptionPayment } from "../services/subscriptionService";
import "./SubscriptionSuccess.css";

export default function SubscriptionSuccess() {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const { user, refreshProfile } = useAuth();

  const reference = params.get("reference") || params.get("trxref");
  const status    = params.get("status"); // "free" | "pending" | null

  const [phase, setPhase]     = useState("verifying"); // "verifying" | "success" | "error"
  const [message, setMessage] = useState("Verifying your payment…");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    let isMounted = true;
    const process = async () => {
      if (status === "free") {
        setPhase("success");
        setMessage("Your free store is ready!");
        await refreshProfile?.();
        return;
      }
      if (!reference) {
        setPhase("error");
        setMessage("No payment reference found. Please contact support.");
        return;
      }
      setMessage("Confirming payment with Paystack…");
      try {
        const result = await verifySubscriptionPayment(reference);
        if (!isMounted) return;
        if (result?.success) {
          setStoreName(result.shopName || "Your Store");
          setPhase("success");
          setMessage("Payment confirmed! Setting up your store…");
          await refreshProfile?.();
        } else {
          throw new Error(result?.error || "Verification failed.");
        }
      } catch (err) {
        if (!isMounted) return;
        setPhase("error");
        setMessage(err.message || "Something went wrong. Please contact support.");
      }
    };
    process();
    return () => { isMounted = false; };
  }, [reference, status]);

  const handleGoToDashboard = () => navigate("/seller-dashboard", { replace: true });

  return (
    <div className="succ-root">
      {/* Confetti effect (CSS only) */}
      {phase === "success" && (
        <div className="succ-confetti">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="succ-confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              background: ["#046EF2","#22C55E","#F59E0B","#7C3AED","#EF4444"][i % 5],
            }} />
          ))}
        </div>
      )}

      <div className="succ-card">
        {/* Phase: verifying */}
        {phase === "verifying" && (
          <>
            <div className="succ-spinner" />
            <h2 className="succ-title">Setting Up Your Store</h2>
            <p className="succ-sub">{message}</p>
            <div className="succ-steps">
              {["Confirming payment", "Creating your storefront", "Activating your account"].map((s, i) => (
                <div key={s} className="succ-step-item">
                  <div className="succ-step-dot succ-step-loading" style={{ animationDelay: `${i * 0.3}s` }} />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Phase: success */}
        {phase === "success" && (
          <>
            <div className="succ-icon-wrap">
              <div className="succ-icon-circle">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
            <h2 className="succ-title">Welcome to Beme Market! 🎉</h2>
            <p className="succ-sub">
              {storeName ? `${storeName} is now live!` : "Your store is live!"} Start adding products and sharing your store link with customers.
            </p>
            <div className="succ-checklist">
              {["Store created and activated","Payment confirmed","Seller dashboard ready","Products can be listed now"].map((c) => (
                <div key={c} className="succ-check-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {c}
                </div>
              ))}
            </div>
            <button className="succ-cta-btn" onClick={handleGoToDashboard}>
              Go to My Dashboard →
            </button>
            <div className="succ-support">
              Need help? <a href="/support" style={{ color: "#046EF2" }}>Contact support</a>
            </div>
          </>
        )}

        {/* Phase: error */}
        {phase === "error" && (
          <>
            <div className="succ-icon-wrap">
              <div className="succ-icon-circle" style={{ background: "#EF4444" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>
            <h2 className="succ-title">Something Went Wrong</h2>
            <p className="succ-sub">{message}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button className="succ-cta-btn" style={{ background: "#EF4444" }} onClick={() => navigate("/store-plans")}>Try Again</button>
              <button className="succ-cta-btn" style={{ background: "rgba(0,0,0,0.08)", color: "#111" }} onClick={() => navigate("/support")}>Contact Support</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


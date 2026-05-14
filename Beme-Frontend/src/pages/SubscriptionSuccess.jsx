import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifySubscriptionPayment } from "../services/subscriptionService";
import { SELLER_APPLIED_KEY } from "../components/SellerRoute";
import "./SubscriptionSuccess.css";

function SpinnerIcon() {
  return <div className="succ-spinner" />;
}

function SuccessIcon() {
  return (
    <div className="succ-icon-wrap">
      <div className="succ-icon-circle">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="succ-icon-wrap">
      <div className="succ-icon-circle" style={{ background: "#EF4444" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
    </div>
  );
}

function CheckItem({ label }) {
  return (
    <div className="succ-check-item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      {label}
    </div>
  );
}

export default function SubscriptionSuccess() {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const { user, refreshProfile } = useAuth();

  const reference = params.get("reference") || params.get("trxref");
  const status    = params.get("status");

  const [phase,   setPhase]   = useState("verifying");
  const [message, setMessage] = useState("Verifying your payment…");

  useEffect(() => {
    let mounted = true;

    const process = async () => {
      // ── Free / basic plan ───────────────────────────────────────────────────
      if (status === "free") {
        if (user?.uid) {
          // Mark this user as having completed onboarding on this device.
          // SellerRoute checks this flag to grant dashboard access until
          // Cloud Functions deploy and set role="seller" in Firestore.
          localStorage.setItem(SELLER_APPLIED_KEY, user.uid);
          await refreshProfile?.();
        }
        if (mounted) {
          setPhase("success");
          setMessage("Your free store is ready!");
        }
        return;
      }

      // ── Paid plan — verify Paystack reference ────────────────────────────────
      if (!reference) {
        if (mounted) {
          setPhase("error");
          setMessage("No payment reference found. Please contact support.");
        }
        return;
      }

      setMessage("Confirming payment with Paystack…");

      try {
        const result = await verifySubscriptionPayment(reference);
        if (!mounted) return;
        if (result?.success) {
          // Mark onboarding complete
          if (user?.uid) localStorage.setItem(SELLER_APPLIED_KEY, user.uid);
          await refreshProfile?.();
          setPhase("success");
        } else {
          throw new Error(result?.error || "Verification failed.");
        }
      } catch (err) {
        if (!mounted) return;
        setPhase("error");
        setMessage(err.message || "Something went wrong. Please contact support.");
      }
    };

    process();
    return () => { mounted = false; };
  }, [reference, status, user?.uid]);

  const goToDashboard = () => {
    // Navigate directly — SellerRoute will allow through because of localStorage flag
    navigate("/seller-dashboard", { replace: true });
  };

  return (
    <div className="succ-root">
      {/* Confetti on success */}
      {phase === "success" && (
        <div className="succ-confetti" aria-hidden="true">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="succ-confetti-piece" style={{
              left: `${(i / 18) * 100}%`,
              animationDelay: `${(i % 5) * 0.3}s`,
              background: ["#046EF2","#22C55E","#F59E0B","#7C3AED","#EF4444"][i % 5],
            }}/>
          ))}
        </div>
      )}

      <div className="succ-card">

        {/* ── Verifying ── */}
        {phase === "verifying" && (
          <>
            <SpinnerIcon />
            <h2 className="succ-title">Setting Up Your Store</h2>
            <p className="succ-sub">{message}</p>
            <div className="succ-steps">
              {["Confirming payment","Creating your storefront","Activating your account"].map((s, i) => (
                <div key={s} className="succ-step-item">
                  <div className="succ-step-dot succ-step-loading"
                    style={{ animationDelay: `${i * 0.3}s` }}/>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Success ── */}
        {phase === "success" && (
          <>
            <SuccessIcon />
            <h2 className="succ-title">Welcome to Beme Market!</h2>
            <p className="succ-sub">
              Your store is live! Start adding products and sharing your store link with customers.
            </p>
            <div className="succ-checklist">
              <CheckItem label="Store created and activated" />
              <CheckItem label="Payment confirmed" />
              <CheckItem label="Seller dashboard ready" />
              <CheckItem label="Products can be listed now" />
            </div>
            <button className="succ-cta-btn" onClick={goToDashboard}>
              Go to My Dashboard →
            </button>
            <div className="succ-support">
              Need help?{" "}
              <a href="/support" style={{ color: "#046EF2" }}>Contact support</a>
            </div>
          </>
        )}

        {/* ── Error ── */}
        {phase === "error" && (
          <>
            <ErrorIcon />
            <h2 className="succ-title">Something Went Wrong</h2>
            <p className="succ-sub">{message}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              <button className="succ-cta-btn" style={{ background: "#EF4444" }}
                onClick={() => navigate("/store-plans")}>
                Try Again
              </button>
              <button className="succ-cta-btn"
                style={{ background: "rgba(0,0,0,0.08)", color: "#111" }}
                onClick={() => navigate("/support")}>
                Contact Support
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
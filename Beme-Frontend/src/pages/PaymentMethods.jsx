import { useNavigate } from "react-router-dom";
import SubPageHeader from "../components/SubPageHeader";
import "./PaymentMethods.css"; // ← now uses its own CSS

export default function PaymentMethods({ hasCompletedOrder = false }) {
  const navigate = useNavigate();

  return (
    <div className="pm-page">
      <SubPageHeader title="Payment Methods" />

      <div className="pm-body">

        {/* ── Paystack ── */}
        <div className="pm-card">
          <div className="pm-card__top">
            <div className="pm-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div>
              <p className="pm-card__title">Pay with Paystack</p>
              <p className="pm-card__sub">Card · Mobile Money · Bank Transfer</p>
            </div>
          </div>

          <p className="pm-card__desc">
            Paystack is a trusted, PCI-DSS compliant payment processor used by thousands of businesses across Africa. Your card details are never stored on our servers.
          </p>

          <div className="pm-badges">
            <span className="pm-badge pm-badge--green">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              SSL Secured
            </span>
            <span className="pm-badge pm-badge--green">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Verified
            </span>
          </div>
        </div>

        {/* ── Payment on Delivery ── */}
        <div className={`pm-card${!hasCompletedOrder ? " pm-card--disabled" : ""}`}>
          <div className="pm-card__top">
            <div className="pm-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M17 21v-2a1 1 0 00-1-1H8a1 1 0 00-1 1v2" />
                <circle cx="12" cy="14" r="3" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p className="pm-card__title">Payment on Delivery</p>
              {!hasCompletedOrder ? (
                <span className="pm-badge pm-badge--warn">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Unlocks after 1st order
                </span>
              ) : (
                <span className="pm-badge pm-badge--green">Available</span>
              )}
            </div>
          </div>

          <p className="pm-card__desc">
            {hasCompletedOrder
              ? "Available on locally stocked items only. Select this at checkout and pay the delivery rider when your order arrives."
              : "Complete your first order with Paystack to unlock Payment on Delivery for future purchases."}
          </p>

          <div className="pm-notice">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>Not available for International / Global shipping items.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
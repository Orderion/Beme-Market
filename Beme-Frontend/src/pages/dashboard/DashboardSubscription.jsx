import { useState, useEffect } from "react";
import { useSubscription } from "../../hooks/useSubscription";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getTransactionHistory, initSubscriptionPayment, redirectToPaystack, PLAN_PRICES, PLAN_NAMES } from "../../services/subscriptionService";
import { useAuth } from "../../context/AuthContext";

const PLAN_FEATURES = {
  basic:    ["1 store", "25 products", "Basic storefront", "MoMo & card checkout", "Basic analytics"],
  standard: ["500 products", "Premium themes", "Live customer chat", "Discount codes & flash sales", "Customer analytics", "Featured boosts", "Verified badge eligible"],
  pro:      ["Unlimited products", "Custom domain", "AI captions & auto-replies", "Live selling", "Loyalty & referral system", "Priority support", "Homepage ranking boosts", "Verified Pro badge"],
};

function PlanCard({ planId, currentPlan, price, onUpgrade, loading }) {
  const isActive = planId === currentPlan;
  const isFree   = price === 0;
  const isHigher = ["basic","standard","pro"].indexOf(planId) > ["basic","standard","pro"].indexOf(currentPlan);

  return (
    <div className="sd-panel" style={{
      border: isActive ? "2px solid #046EF2" : "1px solid rgba(0,0,0,0.08)",
      position: "relative",
    }}>
      {isActive && (
        <div style={{ position: "absolute", top: -12, left: 16, background: "#046EF2", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 100 }}>
          Current Plan
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1D3B", marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
            {PLAN_NAMES[planId]}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#046EF2", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.04em" }}>
            {isFree ? "Free" : `GHS ${price}`}
            {!isFree && <span style={{ fontSize: 13, fontWeight: 500, color: "#8B8FA8" }}>/month</span>}
          </div>
        </div>
        <span className={`sd-badge ${isActive ? "sd-badge-blue" : "sd-badge-gray"}`}>
          {planId.charAt(0).toUpperCase() + planId.slice(1)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {(PLAN_FEATURES[planId] || []).map((f) => (
          <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#1A1D3B" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
            {f}
          </div>
        ))}
      </div>

      {!isActive && isHigher && (
        <button className="sd-btn sd-btn-primary" style={{ width: "100%" }} onClick={() => onUpgrade(planId)} disabled={loading}>
          {loading ? "Processing…" : `Upgrade to ${PLAN_NAMES[planId]}`}
        </button>
      )}
      {isActive && (
        <div style={{ fontSize: 12, color: "#8B8FA8", textAlign: "center" }}>✓ Your current plan</div>
      )}
    </div>
  );
}

export default function DashboardSubscription() {
  const { user }  = useAuth();
  const { subscription, isActive, isGrace, plan, daysUntilRenewal, renewalDateStr, loading } = useSubscription();
  const { subscriptionPlan } = useSellerAuth();
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading]       = useState(true);
  const [upgrading, setUpgrading]       = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getTransactionHistory(user.uid)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setTxLoading(false));
  }, [user?.uid]);

  const handleUpgrade = async (planId) => {
    if (!user?.email) return;
    setUpgrading(true);
    try {
      const result = await initSubscriptionPayment({ planId, uid: user.uid, email: user.email, shopId: subscription?.shopId });
      if (result?.authorization_url) redirectToPaystack(result.authorization_url);
    } catch (err) {
      alert(err.message || "Failed to start payment.");
    } finally {
      setUpgrading(false);
    }
  };

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
    return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div>
      <div className="sd-page-head">
        <div className="sd-page-title">Subscription</div>
        <div className="sd-page-sub">Manage your plan and billing</div>
      </div>

      {/* Status banner */}
      {isGrace && (
        <div className="sd-info-panel warning" style={{ marginBottom: 14 }}>
          <div className="sd-info-text">⚠️ Your subscription has expired and is in a grace period. Renew now to avoid store suspension.</div>
        </div>
      )}
      {isActive && daysUntilRenewal !== null && daysUntilRenewal <= 5 && (
        <div className="sd-info-panel info" style={{ marginBottom: 14 }}>
          <div className="sd-info-text">🔔 Your subscription renews in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? "s" : ""} on {renewalDateStr}.</div>
        </div>
      )}

      {/* Subscription status card */}
      {subscription && (
        <div className="sd-panel" style={{ marginBottom: 14 }}>
          <div className="sd-panel-head">
            <span className="sd-panel-title">Current Status</span>
            <span className={`sd-badge ${isActive ? "sd-badge-green" : isGrace ? "sd-badge-yellow" : "sd-badge-red"}`}>
              {subscription.status?.charAt(0).toUpperCase() + subscription.status?.slice(1)}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {[
              { l: "Current Plan", v: PLAN_NAMES[plan] || plan },
              { l: "Renewal Date", v: renewalDateStr || "—" },
              { l: "Days Remaining", v: daysUntilRenewal !== null ? `${daysUntilRenewal} days` : "—" },
              { l: "Plan Price", v: `GHS ${PLAN_PRICES[plan] || 0}/mo` },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: "#8B8FA8", marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1D3B", fontFamily: "'Space Grotesk', sans-serif" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 24 }}>
        {["basic", "standard", "pro"].map((p) => (
          <PlanCard key={p} planId={p} currentPlan={subscriptionPlan} price={PLAN_PRICES[p]} onUpgrade={handleUpgrade} loading={upgrading} />
        ))}
      </div>

      {/* Transaction history */}
      <div className="sd-panel">
        <div className="sd-panel-head">
          <span className="sd-panel-title">Billing History</span>
        </div>
        {txLoading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 42, marginBottom: 8, borderRadius: 6 }} />)
          : transactions.length === 0
            ? <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#8B8FA8" }}>No billing history yet.</div>
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td style={{ color: "#8B8FA8", fontSize: 12 }}>{fmtDate(t.createdAt)}</td>
                        <td>{PLAN_NAMES[t.planId] || t.planId} Plan — {t.type}</td>
                        <td style={{ fontWeight: 700 }}>GHS {Number(t.amount || 0).toFixed(2)}</td>
                        <td><span className={`sd-badge ${t.status === "success" ? "sd-badge-green" : t.status === "pending" ? "sd-badge-yellow" : "sd-badge-red"}`}>{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}


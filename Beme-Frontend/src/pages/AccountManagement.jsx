import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AccountManagement.css";

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatRoleLabel(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "shop_admin") return "Shop Admin";
  if (role === "customer") return "Customer";
  return "Guest";
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-GH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

export default function AccountManagement() {
  const navigate = useNavigate();
  const {
    user,
    role,
    adminShop,
    capabilities,
    profile,
    isSuperAdmin,
    isShopAdmin,
    refreshProfile,
    logout,
  } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const accountEmail = user?.email || profile?.email || "—";
  const accountRole = formatRoleLabel(role);
  const shopLabel = adminShop ? titleize(adminShop) : "Not assigned";
  const createdAt = formatDate(profile?.createdAt);

  const capabilityList = useMemo(() => {
    if (!Array.isArray(capabilities) || !capabilities.length) return [];
    return capabilities.map((item) => titleize(item));
  }, [capabilities]);

  const scopeSummary = useMemo(() => {
    if (isSuperAdmin) {
      return {
        title: "Marketplace-wide visibility",
        text: "You can review products, orders, analytics, payout requests, and shop applications across the marketplace, while preserving shop isolation for shop admins.",
      };
    }

    if (isShopAdmin) {
      return {
        title: "Shop-restricted visibility",
        text: "Your admin access is limited to your own shop, products, orders, payouts, and analytics only.",
      };
    }

    return {
      title: "No admin scope",
      text: "This account does not currently have admin access.",
    };
  }, [isSuperAdmin, isShopAdmin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMsg("");
    setErr("");

    try {
      await refreshProfile();
      setMsg("Account profile refreshed successfully.");
    } catch (error) {
      console.error("Account refresh error:", error);
      setErr(error?.message || "Failed to refresh account profile.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setMsg("");
    setErr("");

    try {
      await logout();
      navigate("/admin-login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      setErr(error?.message || "Failed to log out.");
      setLoggingOut(false);
    }
  };

  return (
    <div className="account-page">
      <div className="account-shell">
        <div className="account-hero">
          <div className="account-hero-copy">
            <span className="account-eyebrow">Admin Account</span>
            <h1 className="account-title">Account Management</h1>
            <p className="account-sub">
              Review your admin identity, account scope, assigned shop, and
              current access status.
            </p>
          </div>

          <div className="account-hero-actions">
            <button
              type="button"
              className="account-btn account-btn--ghost"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh profile"}
            </button>

            <button
              type="button"
              className="account-btn account-btn--solid"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>

        {msg ? <div className="account-alert">{msg}</div> : null}
        {err ? <div className="account-alert account-alert--error">{err}</div> : null}

        <section className="account-grid">
          <article className="account-card">
            <div className="account-card-head">
              <h2>Identity</h2>
              <span className="account-badge">{accountRole}</span>
            </div>

            <div className="account-list">
              <div className="account-list-row">
                <span className="account-list-label">Email</span>
                <strong className="account-list-value">{accountEmail}</strong>
              </div>

              <div className="account-list-row">
                <span className="account-list-label">User ID</span>
                <strong className="account-list-value account-list-value--mono">
                  {user?.uid || "—"}
                </strong>
              </div>

              <div className="account-list-row">
                <span className="account-list-label">Profile created</span>
                <strong className="account-list-value">{createdAt}</strong>
              </div>
            </div>
          </article>

          <article className="account-card">
            <div className="account-card-head">
              <h2>Access Scope</h2>
              <span className="account-badge account-badge--soft">
                {isSuperAdmin ? "Global" : isShopAdmin ? "Shop-only" : "None"}
              </span>
            </div>

            <div className="account-scope">
              <h3>{scopeSummary.title}</h3>
              <p>{scopeSummary.text}</p>
            </div>

            <div className="account-list">
              <div className="account-list-row">
                <span className="account-list-label">Assigned shop</span>
                <strong className="account-list-value">{shopLabel}</strong>
              </div>

              <div className="account-list-row">
                <span className="account-list-label">Role key</span>
                <strong className="account-list-value account-list-value--mono">
                  {role || "guest"}
                </strong>
              </div>
            </div>
          </article>

          <article className="account-card">
            <div className="account-card-head">
              <h2>Capabilities</h2>
              <span className="account-badge account-badge--soft">
                {capabilityList.length}
              </span>
            </div>

            {capabilityList.length ? (
              <div className="account-pill-wrap">
                {capabilityList.map((item) => (
                  <span key={item} className="account-pill">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <div className="account-empty">
                No extra capability flags are assigned to this account yet.
              </div>
            )}
          </article>

          <article className="account-card account-card--wide">
            <div className="account-card-head">
              <h2>Admin Visibility Summary</h2>
            </div>

            <div className="account-summary-grid">
              <div className="account-summary-block">
                <span className="account-summary-label">Products</span>
                <p className="account-summary-text">
                  {isSuperAdmin
                    ? "You can see products across all shops in admin views."
                    : "You can only see and manage products from your assigned shop."}
                </p>
              </div>

              <div className="account-summary-block">
                <span className="account-summary-label">Orders</span>
                <p className="account-summary-text">
                  {isSuperAdmin
                    ? "You can view marketplace orders across every shop."
                    : "You can only view orders that belong to your own shop."}
                </p>
              </div>

              <div className="account-summary-block">
                <span className="account-summary-label">Analytics</span>
                <p className="account-summary-text">
                  {isSuperAdmin
                    ? "Your analytics access spans the marketplace, depending on page rules and frontend scope."
                    : "Your analytics should stay isolated to your own shop only."}
                </p>
              </div>

              <div className="account-summary-block">
                <span className="account-summary-label">Payouts</span>
                <p className="account-summary-text">
                  {isSuperAdmin
                    ? "You can review payout requests from all shop admins."
                    : "You can request payouts and review only your own payout history."}
                </p>
              </div>
            </div>
          </article>

          <article className="account-card account-card--wide">
            <div className="account-card-head">
              <h2>Security Note</h2>
            </div>

            <p className="account-security-text">
              Sensitive actions such as deleting products or resetting test data
              should continue to require password reauthentication. This page is
              intentionally read-focused so it does not weaken your current admin
              security model.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}
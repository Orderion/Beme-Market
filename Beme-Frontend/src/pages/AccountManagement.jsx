import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AccountManagement.css";

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatRole(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "shop_admin") return "Shop Admin";
  if (role === "customer") return "Customer";
  return titleize(role || "guest");
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
    loading,
    refreshProfile,
    logout,
  } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const shopLabel = useMemo(() => {
    return adminShop ? titleize(adminShop) : "Not assigned";
  }, [adminShop]);

  const capabilityList = useMemo(() => {
    if (!Array.isArray(capabilities) || !capabilities.length) return [];
    return capabilities.map((item) => titleize(item));
  }, [capabilities]);

  const permissionItems = useMemo(() => {
    if (isSuperAdmin) {
      return [
        "Can see all marketplace products across all shops",
        "Can view all payout requests",
        "Can view all orders across shops",
        "Can view marketplace-wide analytics",
        "Can review shop applications",
        "Should not be restricted to a single shop",
      ];
    }

    if (isShopAdmin) {
      return [
        "Can manage only products belonging to assigned shop",
        "Can see only own shop orders",
        "Can request and view only own payouts",
        "Can view only own shop analytics",
        "Cannot access other shops",
      ];
    }

    return [
      "Customer account access only",
      "No admin tools available for this account",
    ];
  }, [isSuperAdmin, isShopAdmin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMsg("");
    setErr("");

    try {
      await refreshProfile();
      setMsg("Account profile refreshed successfully.");
    } catch (error) {
      console.error("Account profile refresh error:", error);
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
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      setErr(error?.message || "Failed to log out.");
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-shell">
          <div className="account-card">
            <h1 className="account-title">Account Management</h1>
            <p className="account-sub">Loading your account details…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-shell">
          <div className="account-card">
            <h1 className="account-title">Account Management</h1>
            <p className="account-sub">No authenticated session found.</p>
            <div className="account-actions">
              <button
                type="button"
                className="account-btn account-btn--primary"
                onClick={() => navigate("/admin-login")}
              >
                Go to admin login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-shell">
        <div className="account-head">
          <div>
            <h1 className="account-title">Account Management</h1>
            <p className="account-sub">
              View your admin identity, shop assignment, and current access
              scope.
            </p>
          </div>

          <div className="account-actions">
            <button
              type="button"
              className="account-btn account-btn--ghost"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh profile"}
            </button>

            <button
              type="button"
              className="account-btn account-btn--primary"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>

        {msg ? <div className="account-msg">{msg}</div> : null}
        {err ? <div className="account-msg account-msg--error">{err}</div> : null}

        <section className="account-grid">
          <div className="account-card">
            <div className="account-card-head">
              <h2>Profile</h2>
              <span className="account-chip">{formatRole(role)}</span>
            </div>

            <div className="account-list">
              <div className="account-list-row">
                <span className="account-label">Email</span>
                <strong className="account-value">
                  {user.email || profile?.email || "—"}
                </strong>
              </div>

              <div className="account-list-row">
                <span className="account-label">User ID</span>
                <strong className="account-value account-value--mono">
                  {user.uid || "—"}
                </strong>
              </div>

              <div className="account-list-row">
                <span className="account-label">Role</span>
                <strong className="account-value">{formatRole(role)}</strong>
              </div>

              <div className="account-list-row">
                <span className="account-label">Assigned shop</span>
                <strong className="account-value">{shopLabel}</strong>
              </div>
            </div>
          </div>

          <div className="account-card">
            <div className="account-card-head">
              <h2>Access summary</h2>
              <span className="account-chip account-chip--muted">
                {isSuperAdmin ? "Global" : isShopAdmin ? "Shop Scoped" : "Basic"}
              </span>
            </div>

            <div className="account-permissions">
              {permissionItems.map((item) => (
                <div className="account-permission-item" key={item}>
                  <span className="account-permission-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="account-card">
            <div className="account-card-head">
              <h2>Capabilities</h2>
              <span className="account-chip account-chip--muted">
                {capabilityList.length} item{capabilityList.length === 1 ? "" : "s"}
              </span>
            </div>

            {capabilityList.length ? (
              <div className="account-capabilities">
                {capabilityList.map((item) => (
                  <span key={item} className="account-capability-pill">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="account-empty">
                No extra capabilities are currently assigned to this account.
              </p>
            )}
          </div>

          <div className="account-card">
            <div className="account-card-head">
              <h2>Security & session</h2>
              <span className="account-chip account-chip--muted">Live session</span>
            </div>

            <div className="account-list">
              <div className="account-list-row">
                <span className="account-label">Email verified</span>
                <strong className="account-value">
                  {user.emailVerified ? "Verified" : "Not verified"}
                </strong>
              </div>

              <div className="account-list-row">
                <span className="account-label">Provider</span>
                <strong className="account-value">
                  {user.providerData?.[0]?.providerId || "password"}
                </strong>
              </div>

              <div className="account-list-row">
                <span className="account-label">Shop isolation</span>
                <strong className="account-value">
                  {isSuperAdmin
                    ? "Not shop-limited"
                    : isShopAdmin
                    ? `Restricted to ${shopLabel}`
                    : "Not an admin account"}
                </strong>
              </div>
            </div>

            <div className="account-security-note">
              For destructive admin actions, password re-verification should still
              be required elsewhere in the admin system.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./AdminOrders.css";

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return new Intl.DateTimeFormat("en-GH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

function normalizeStatus(value, fallback = "pending") {
  return String(value || fallback).trim().toLowerCase() || fallback;
}

const APPROVAL_OPTIONS = ["pending", "approved", "rejected"];
const PAYMENT_OPTIONS = ["pending_payment", "pending", "paid", "failed"];

export default function ShopApplications() {
  const { user, loading, isSuperAdmin } = useAuth();

  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    if (loading || !isSuperAdmin) return;

    const qRef = query(
      collection(db, "shopApplications"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const rows = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setApplications(rows);
        setError("");
      },
      (err) => {
        console.error("Shop applications snapshot error:", err);
        setError(err?.message || "Failed to load shop applications.");
      }
    );

    return () => unsub();
  }, [loading, isSuperAdmin]);

  const counts = useMemo(() => {
    return applications.reduce(
      (acc, app) => {
        acc.total += 1;
        if (normalizeStatus(app.approvalStatus) === "approved") acc.approved += 1;
        if (normalizeStatus(app.approvalStatus) === "pending") acc.pending += 1;
        if (normalizeStatus(app.paymentStatus) === "paid") acc.paid += 1;
        return acc;
      },
      { total: 0, approved: 0, pending: 0, paid: 0 }
    );
  }, [applications]);

  const updateApplication = async (application, changes) => {
    setUpdatingId(application.id);

    try {
      const nextApprovalStatus = normalizeStatus(
        changes.approvalStatus ?? application.approvalStatus,
        "pending"
      );
      const nextPaymentStatus = normalizeStatus(
        changes.paymentStatus ?? application.paymentStatus,
        "pending"
      );

      await updateDoc(doc(db, "shopApplications", application.id), {
        ...changes,
        updatedAt: serverTimestamp(),
      });

      const canGrantShopAdmin =
        nextApprovalStatus === "approved" && nextPaymentStatus === "paid";

      if (canGrantShopAdmin && application.userId) {
        await setDoc(
          doc(db, "users", application.userId),
          {
            role: "shop_admin",
            shop: String(application.shop || "").trim().toLowerCase(),
            capabilities: [
              "manage_products",
              "view_orders",
              "view_analytics",
              "request_payout",
            ],
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.error("Failed to update shop application:", err);
      alert(err?.message || "Failed to update application.");
    } finally {
      setUpdatingId("");
    }
  };

  if (loading) {
    return (
      <div className="admin-orders">
        <div className="muted">Loading shop applications...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="admin-orders">
        <div className="muted">Only super admin can view shop applications.</div>
      </div>
    );
  }

  return (
    <div className="admin-orders">
      <div className="admin-orders-head">
        <div>
          <h1>Shop Applications</h1>
          <div className="muted">
            Review paid shop submissions and approve access.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div className="pill">Total: {counts.total}</div>
        <div className="pill">Pending: {counts.pending}</div>
        <div className="pill">Approved: {counts.approved}</div>
        <div className="pill">Paid: {counts.paid}</div>
      </div>

      {error ? <div className="muted">{error}</div> : null}

      <div className="orders-list">
        {applications.map((app) => {
          const approvalStatus = normalizeStatus(app.approvalStatus, "pending");
          const paymentStatus = normalizeStatus(app.paymentStatus, "pending");

          return (
            <div className="order-card" key={app.id}>
              <div className="order-top">
                <div>
                  <div className="order-id">#{app.id.slice(0, 8)}</div>
                  <div className="order-meta">
                    <span>{app.businessName || "Business"}</span>
                    {app.ownerName ? <span className="muted">{app.ownerName}</span> : null}
                    {app.email ? <span className="muted">{app.email}</span> : null}
                  </div>
                </div>

                <div className="order-total">
                  {titleize(app.shopName || app.shop || "shop")}
                </div>
              </div>

              <div className="order-items">
                <div className="order-item">
                  <span>Shop key</span>
                  <span className="muted">{app.shop || "—"}</span>
                </div>

                <div className="order-item">
                  <span>Category</span>
                  <span className="muted">{app.category || "—"}</span>
                </div>

                <div className="order-item">
                  <span>Phone</span>
                  <span className="muted">{app.phone || "—"}</span>
                </div>

                <div className="order-item">
                  <span>Applied</span>
                  <span className="muted">{formatDate(app.createdAt)}</span>
                </div>

                <div className="order-item">
                  <span>Payment reference</span>
                  <span className="muted">{app.reference || "—"}</span>
                </div>

                {app.description ? (
                  <div className="order-item">
                    <span>Description</span>
                    <span className="muted">{app.description}</span>
                  </div>
                ) : null}

                {app.website ? (
                  <div className="order-item">
                    <span>Website</span>
                    <span className="muted">{app.website}</span>
                  </div>
                ) : null}

                {app.instagram ? (
                  <div className="order-item">
                    <span>Instagram</span>
                    <span className="muted">{app.instagram}</span>
                  </div>
                ) : null}
              </div>

              <div
                className="order-bottom"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <div className="pill">Approval: {approvalStatus}</div>
                  <div className="pill">Payment: {paymentStatus}</div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    className="status-select"
                    value={approvalStatus}
                    onChange={(e) =>
                      updateApplication(app, {
                        approvalStatus: e.target.value,
                        reviewedBy: user?.uid || "",
                        reviewedAt: serverTimestamp(),
                      })
                    }
                    disabled={updatingId === app.id}
                  >
                    {APPROVAL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        approval: {option}
                      </option>
                    ))}
                  </select>

                  <select
                    className="status-select"
                    value={paymentStatus}
                    onChange={(e) =>
                      updateApplication(app, {
                        paymentStatus: e.target.value,
                        reviewedBy: user?.uid || "",
                        reviewedAt: serverTimestamp(),
                      })
                    }
                    disabled={updatingId === app.id}
                  >
                    {PAYMENT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        payment: {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}

        {!error && applications.length === 0 ? (
          <div className="muted">No shop applications found.</div>
        ) : null}
      </div>
    </div>
  );
}
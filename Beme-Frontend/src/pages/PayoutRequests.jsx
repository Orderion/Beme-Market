import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./AdminOrders.css";

function formatMoney(value) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
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

function normalizeShop(value) {
  return String(value || "main").trim().toLowerCase() || "main";
}

function normalizeStatus(value) {
  return String(value || "pending").trim().toLowerCase() || "pending";
}

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getSortableTime(value) {
  if (!value) return 0;

  try {
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    return new Date(value).getTime() || 0;
  } catch {
    return 0;
  }
}

function sortByCreatedAtDesc(rows) {
  return [...rows].sort(
    (a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt)
  );
}

function getOrderTotal(order) {
  const direct =
    order?.pricing?.total ??
    order?.total ??
    order?.amount ??
    order?.grandTotal;

  if (Number.isFinite(Number(direct))) return Number(direct);

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum, item) => {
    const price = Number(item?.price || 0);
    const qty = Number(item?.qty || 0);
    return sum + price * qty;
  }, 0);
}

function orderBelongsToShop(order, shopKey) {
  if (!shopKey) return false;

  const normalizedShopKey = normalizeShop(shopKey);

  const shops = Array.isArray(order?.shops)
    ? order.shops.map((shop) => normalizeShop(shop))
    : [];

  if (shops.includes(normalizedShopKey)) return true;

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((item) => normalizeShop(item?.shop) === normalizedShopKey);
}

const STATUS_OPTIONS = ["pending", "approved", "paid", "rejected"];

export default function PayoutRequests() {
  const { user, loading, isSuperAdmin, isShopAdmin, adminShop } = useAuth();

  const [requests, setRequests] = useState([]);
  const [requestsError, setRequestsError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");

  const [form, setForm] = useState({
    amount: "",
    notes: "",
    paymentDetails: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [formErr, setFormErr] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    if (loading || !user) return undefined;

    let unsub = null;
    let cancelled = false;

    async function setupRequests() {
      try {
        if (isShopAdmin && adminShop) {
          const normalizedAdminShop = normalizeShop(adminShop);

          try {
            const qRef = query(
              collection(db, "payoutRequests"),
              where("shopAdminId", "==", user.uid),
              where("shop", "==", normalizedAdminShop),
              orderBy("createdAt", "desc")
            );

            unsub = onSnapshot(
              qRef,
              (snap) => {
                if (cancelled) return;

                const rows = sortByCreatedAtDesc(
                  snap.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data(),
                  }))
                );

                setRequests(rows);
                setRequestsError("");
              },
              async (error) => {
                console.error("Payout requests snapshot error:", error);

                try {
                  const fallbackQ = query(
                    collection(db, "payoutRequests"),
                    where("shopAdminId", "==", user.uid),
                    where("shop", "==", normalizedAdminShop)
                  );

                  const fallbackSnap = await getDocs(fallbackQ);
                  if (cancelled) return;

                  const rows = sortByCreatedAtDesc(
                    fallbackSnap.docs.map((docSnap) => ({
                      id: docSnap.id,
                      ...docSnap.data(),
                    }))
                  );

                  setRequests(rows);
                  setRequestsError("");
                } catch (fallbackError) {
                  console.error("Payout requests fallback error:", fallbackError);
                  if (cancelled) return;
                  setRequests([]);
                  setRequestsError(
                    fallbackError?.message ||
                      error?.message ||
                      "Failed to load payout requests."
                  );
                }
              }
            );
          } catch (outerError) {
            console.error("Payout requests shop query setup error:", outerError);

            const fallbackQ = query(
              collection(db, "payoutRequests"),
              where("shopAdminId", "==", user.uid),
              where("shop", "==", normalizedAdminShop)
            );

            const fallbackSnap = await getDocs(fallbackQ);
            if (cancelled) return;

            const rows = sortByCreatedAtDesc(
              fallbackSnap.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
              }))
            );

            setRequests(rows);
            setRequestsError("");
          }

          return;
        }

        if (isSuperAdmin) {
          const qRef = query(
            collection(db, "payoutRequests"),
            orderBy("createdAt", "desc")
          );

          unsub = onSnapshot(
            qRef,
            (snap) => {
              if (cancelled) return;

              const rows = sortByCreatedAtDesc(
                snap.docs.map((docSnap) => ({
                  id: docSnap.id,
                  ...docSnap.data(),
                }))
              );

              setRequests(rows);
              setRequestsError("");
            },
            async (error) => {
              console.error("Payout requests snapshot error:", error);

              try {
                const fallbackSnap = await getDocs(collection(db, "payoutRequests"));
                if (cancelled) return;

                const rows = sortByCreatedAtDesc(
                  fallbackSnap.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data(),
                  }))
                );

                setRequests(rows);
                setRequestsError("");
              } catch (fallbackError) {
                console.error("Payout requests fallback error:", fallbackError);
                if (cancelled) return;
                setRequests([]);
                setRequestsError(
                  fallbackError?.message ||
                    error?.message ||
                    "Failed to load payout requests."
                );
              }
            }
          );
          return;
        }

        setRequests([]);
        setRequestsError("");
      } catch (error) {
        console.error("Payout requests setup error:", error);
        if (!cancelled) {
          setRequests([]);
          setRequestsError(error?.message || "Failed to load payout requests.");
        }
      }
    }

    setupRequests();

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [loading, user, isSuperAdmin, isShopAdmin, adminShop]);

  useEffect(() => {
    if (loading || !user || !isShopAdmin || !adminShop) return;

    let cancelled = false;

    async function loadOrders() {
      setOrdersError("");

      try {
        try {
          const qRef = query(
            collection(db, "orders"),
            where("shops", "array-contains", normalizeShop(adminShop)),
            orderBy("createdAt", "desc")
          );

          const snap = await getDocs(qRef);
          if (cancelled) return;

          const rows = sortByCreatedAtDesc(
            snap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }))
          );

          setOrders(rows);
          return;
        } catch (error) {
          console.error("Orders payout indexed query error:", error);
        }

        const fallbackQ = query(
          collection(db, "orders"),
          where("shops", "array-contains", normalizeShop(adminShop))
        );

        const fallbackSnap = await getDocs(fallbackQ);
        if (cancelled) return;

        const rows = sortByCreatedAtDesc(
          fallbackSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        ).filter((order) => orderBelongsToShop(order, adminShop));

        setOrders(rows);
      } catch (error) {
        console.error("Failed to load orders for payout calculations:", error);
        if (cancelled) return;
        setOrders([]);
        setOrdersError(error?.message || "Failed to load shop orders.");
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [loading, user, isShopAdmin, adminShop]);

  const paidRevenue = useMemo(() => {
    if (!isShopAdmin || !adminShop) return 0;

    return orders.reduce((sum, order) => {
      const paymentStatus = String(order?.paymentStatus || "")
        .trim()
        .toLowerCase();
      const orderStatus = String(order?.status || "")
        .trim()
        .toLowerCase();

      const paid =
        order?.paid === true ||
        paymentStatus === "paid" ||
        orderStatus === "paid";

      if (!paid) return sum;

      const items = Array.isArray(order?.items) ? order.items : [];
      const shopItems = items.filter(
        (item) => normalizeShop(item?.shop) === normalizeShop(adminShop)
      );

      if (shopItems.length) {
        return (
          sum +
          shopItems.reduce((itemSum, item) => {
            return itemSum + Number(item?.price || 0) * Number(item?.qty || 0);
          }, 0)
        );
      }

      if (orderBelongsToShop(order, adminShop)) {
        return sum + getOrderTotal(order);
      }

      return sum;
    }, 0);
  }, [orders, isShopAdmin, adminShop]);

  const approvedOrPaidRequestsTotal = useMemo(() => {
    return requests.reduce((sum, request) => {
      const status = normalizeStatus(request.status);
      if (status === "approved" || status === "paid") {
        return sum + Number(request.amount || 0);
      }
      return sum;
    }, 0);
  }, [requests]);

  const pendingRequestsTotal = useMemo(() => {
    return requests.reduce((sum, request) => {
      const status = normalizeStatus(request.status);
      if (status === "pending") {
        return sum + Number(request.amount || 0);
      }
      return sum;
    }, 0);
  }, [requests]);

  const availableBalance = useMemo(() => {
    if (!isShopAdmin) return 0;
    return Math.max(
      paidRevenue - approvedOrPaidRequestsTotal - pendingRequestsTotal,
      0
    );
  }, [isShopAdmin, paidRevenue, approvedOrPaidRequestsTotal, pendingRequestsTotal]);

  const setField = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    setFormMsg("");
    setFormErr("");

    const amount = Number(form.amount);

    if (!isShopAdmin || !user?.uid || !adminShop) {
      setFormErr("Only a shop admin can request payout.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormErr("Enter a valid payout amount.");
      return;
    }

    if (amount > availableBalance) {
      setFormErr("Requested amount is greater than your available balance.");
      return;
    }

    if (!form.paymentDetails.trim()) {
      setFormErr("Enter payment details for receiving payout.");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "payoutRequests"), {
        shop: normalizeShop(adminShop),
        shopAdminId: user.uid,
        shopAdminEmail: user.email || "",
        amount,
        notes: form.notes.trim(),
        paymentDetails: form.paymentDetails.trim(),
        status: "pending",
        reviewedBy: "",
        reviewedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setForm({
        amount: "",
        notes: "",
        paymentDetails: "",
      });
      setFormMsg("Payout request submitted successfully.");
    } catch (error) {
      console.error("Payout request submit error:", error);
      setFormErr(error?.message || "Failed to submit payout request.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (requestId, status) => {
    if (!isSuperAdmin || !user?.uid) return;

    setUpdatingId(requestId);

    try {
      await updateDoc(doc(db, "payoutRequests", requestId), {
        status,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update payout request:", error);
      alert(error?.message || "Failed to update payout request.");
    } finally {
      setUpdatingId("");
    }
  };

  if (loading) {
    return (
      <div className="admin-orders">
        <div className="muted">Loading payout requests...</div>
      </div>
    );
  }

  return (
    <div className="admin-orders">
      <div className="admin-orders-head">
        <div>
          <h1>{isSuperAdmin ? "Payout Requests" : "My Payout Requests"}</h1>
          <div className="muted">
            {isSuperAdmin
              ? "Review and manage payout requests from shop owners."
              : `Shop: ${titleize(adminShop)} • Available balance ${formatMoney(
                  availableBalance
                )}`}
          </div>
        </div>
      </div>

      {isShopAdmin ? (
        <div
          className="order-card"
          style={{ marginBottom: 20, display: "grid", gap: 14 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div className="pill">Paid revenue: {formatMoney(paidRevenue)}</div>
            <div className="pill">
              Approved / paid requests: {formatMoney(approvedOrPaidRequestsTotal)}
            </div>
            <div className="pill">Pending requests: {formatMoney(pendingRequestsTotal)}</div>
            <div className="pill">Available: {formatMoney(availableBalance)}</div>
          </div>

          {ordersError ? <div className="muted">{ordersError}</div> : null}

          <form onSubmit={submitRequest} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label className="muted">Amount (GHS)</label>
              <input
                value={form.amount}
                onChange={setField("amount")}
                inputMode="decimal"
                placeholder="e.g. 500"
                className="status-select"
                style={{ width: "100%", maxWidth: 320 }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label className="muted">Payment details</label>
              <input
                value={form.paymentDetails}
                onChange={setField("paymentDetails")}
                placeholder="e.g. MTN MoMo 024xxxxxxx / Bank account details"
                className="status-select"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label className="muted">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={setField("notes")}
                placeholder="Anything the platform owner should know"
                className="status-select"
                rows={4}
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>

            {formErr ? <div className="muted">{formErr}</div> : null}
            {formMsg ? <div className="muted">{formMsg}</div> : null}

            <div>
              <button
                type="submit"
                className="chip active"
                disabled={submitting}
                style={{ border: "none" }}
              >
                {submitting ? "Submitting..." : "Request payout"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {requestsError ? <div className="muted">{requestsError}</div> : null}

      <div className="orders-list">
        {requests.map((request) => {
          const status = normalizeStatus(request.status);

          return (
            <div className="order-card" key={request.id}>
              <div className="order-top">
                <div>
                  <div className="order-id">#{request.id.slice(0, 8)}</div>
                  <div className="order-meta">
                    <span>{titleize(request.shop)}</span>
                    {request.shopAdminEmail ? (
                      <span className="muted">{request.shopAdminEmail}</span>
                    ) : null}
                    <span className="muted">
                      Requested {formatDate(request.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="order-total">{formatMoney(request.amount)}</div>
              </div>

              <div className="order-items">
                <div className="order-item">
                  <span>Payment details</span>
                  <span className="muted">{request.paymentDetails || "—"}</span>
                </div>

                {request.notes ? (
                  <div className="order-item">
                    <span>Notes</span>
                    <span className="muted">{request.notes}</span>
                  </div>
                ) : null}

                {request.reviewedAt ? (
                  <div className="order-item">
                    <span>Reviewed</span>
                    <span className="muted">{formatDate(request.reviewedAt)}</span>
                  </div>
                ) : null}
              </div>

              <div className="order-bottom">
                <div className="pill">{status}</div>

                {isSuperAdmin ? (
                  <select
                    value={status}
                    onChange={(e) => updateStatus(request.id, e.target.value)}
                    className="status-select"
                    disabled={updatingId === request.id}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>
          );
        })}

        {!requestsError && requests.length === 0 ? (
          <div className="muted">No payout requests found.</div>
        ) : null}
      </div>
    </div>
  );
}
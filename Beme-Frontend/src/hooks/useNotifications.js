// src/hooks/useProductRequests.js
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  addProductRequest,
  getAllRequests,
  getUserRequests,
  updateRequestStatus,
} from "../services/productRequestService";

// ─── USER HOOK ───────────────────────────────────────────────────────────────
/**
 * Hook for customers — submit and view their own product requests.
 *
 * Returns:
 *  - requests       : Array of the user's own requests
 *  - loading        : fetch loading state
 *  - submitting     : form submit loading state
 *  - error          : error message string or null
 *  - submitRequest  : async fn to submit a new request
 *  - refresh        : manually re-fetch requests
 */
export function useUserProductRequests() {
  const { user } = useAuth();

  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  // ── Fetch user's requests ──
  const fetchRequests = useCallback(async () => {
    if (!user?.uid) {
      setRequests([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getUserRequests(user.uid);
      setRequests(data);
    } catch (err) {
      console.error("[useUserProductRequests] fetch error:", err);
      setError("Failed to load your requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Submit a new request ──
  const submitRequest = useCallback(
    async (formData, imageFile) => {
      if (!user?.uid) throw new Error("You must be logged in to submit a request.");

      setSubmitting(true);
      setError(null);

      try {
        const requestId = await addProductRequest(formData, imageFile, {
          uid:   user.uid,
          email: user.email,
        });

        // Optimistically re-fetch so the user sees their new request immediately
        await fetchRequests();

        return requestId;
      } catch (err) {
        console.error("[useUserProductRequests] submit error:", err);
        setError("Failed to submit your request. Please try again.");
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [user, fetchRequests]
  );

  return {
    requests,
    loading,
    submitting,
    error,
    submitRequest,
    refresh: fetchRequests,
  };
}

// ─── ADMIN HOOK ──────────────────────────────────────────────────────────────
/**
 * Hook for super_admin — view all requests and update their status.
 *
 * @param {string|null} statusFilter - "pending"|"sourcing"|"available"|"rejected"|null
 *
 * Returns:
 *  - requests        : Array of all product requests
 *  - loading         : fetch loading state
 *  - updating        : update loading state
 *  - error           : error message string or null
 *  - changeStatus    : async fn to update a request's status
 *  - refresh         : manually re-fetch
 *  - statusFilter    : current filter value
 *  - setStatusFilter : update the filter
 */
export function useAdminProductRequests(initialFilter = null) {
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [updating,      setUpdating]      = useState(false);
  const [error,         setError]         = useState(null);
  const [statusFilter,  setStatusFilter]  = useState(initialFilter);

  // ── Fetch all requests ──
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRequests(statusFilter);
      setRequests(data);
    } catch (err) {
      console.error("[useAdminProductRequests] fetch error:", err);
      setError("Failed to load product requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Update request status ──
  const changeStatus = useCallback(
    async (requestId, status, extras = {}) => {
      setUpdating(true);
      setError(null);
      try {
        await updateRequestStatus(requestId, status, extras);

        // Update local state immediately for snappy UI
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status,
                  ...(extras.adminResponse   !== undefined && { adminResponse:    extras.adminResponse }),
                  ...(extras.offeredProductId !== undefined && { offeredProductId: extras.offeredProductId }),
                }
              : r
          )
        );
      } catch (err) {
        console.error("[useAdminProductRequests] update error:", err);
        setError("Failed to update request status.");
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    []
  );

  return {
    requests,
    loading,
    updating,
    error,
    changeStatus,
    refresh:         fetchRequests,
    statusFilter,
    setStatusFilter,
  };
}

// ─── STATUS HELPERS ──────────────────────────────────────────────────────────
/**
 * Returns a display label for a request status value.
 * @param {string} status
 * @returns {string}
 */
export function getStatusLabel(status) {
  const labels = {
    pending:   "Pending",
    sourcing:  "Sourcing",
    available: "Available",
    rejected:  "Rejected",
  };
  return labels[status] ?? status;
}

/**
 * Returns a CSS class suffix for a request status value.
 * Used to apply colour styles in components.
 * @param {string} status
 * @returns {"pending"|"sourcing"|"available"|"rejected"}
 */
export function getStatusClass(status) {
  const map = {
    pending:   "pending",
    sourcing:  "sourcing",
    available: "available",
    rejected:  "rejected",
  };
  return map[status] ?? "pending";
}
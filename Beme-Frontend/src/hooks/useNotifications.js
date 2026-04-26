// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToAdminNotifications,
  subscribeToAdminUnreadCount,
  subscribeToUserNotifications,
  subscribeToUserUnreadCount,
  markAdminNotifRead,
  markAllAdminNotifsRead,
  markUserNotifRead,
  markAllUserNotifsRead,
  formatNotifTime,
} from "../services/notificationService";

// ─── ADMIN NOTIFICATIONS HOOK ────────────────────────────────────────────────
/**
 * Real-time hook for super_admin notifications.
 *
 * Returns:
 *  - notifications   : Array of admin notification objects
 *  - unreadCount     : number of unread notifications
 *  - loading         : initial load state
 *  - error           : error string or null
 *  - markRead        : mark a single notification as read
 *  - markAllRead     : mark all notifications as read
 *  - formatTime      : helper to format createdAt date
 */
export function useAdminNotifications() {
  const { isSuperAdmin } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // ── Real-time listener for all notifications ──
  useEffect(() => {
    if (!isSuperAdmin) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = subscribeToAdminNotifications(
      (data) => {
        setNotifications(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useAdminNotifications] error:", err);
        setError("Failed to load notifications.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [isSuperAdmin]);

  // ── Real-time listener for unread count (badge) ──
  useEffect(() => {
    if (!isSuperAdmin) {
      setUnreadCount(0);
      return;
    }

    const unsub = subscribeToAdminUnreadCount((count) => {
      setUnreadCount(count);
    });

    return () => unsub();
  }, [isSuperAdmin]);

  // ── Mark single as read ──
  const markRead = useCallback(async (notifId) => {
    try {
      await markAdminNotifRead(notifId);
    } catch (err) {
      console.error("[useAdminNotifications] markRead error:", err);
    }
  }, []);

  // ── Mark all as read ──
  const markAllRead = useCallback(async () => {
    try {
      await markAllAdminNotifsRead();
    } catch (err) {
      console.error("[useAdminNotifications] markAllRead error:", err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    formatTime: formatNotifTime,
  };
}

// ─── USER NOTIFICATIONS HOOK ─────────────────────────────────────────────────
/**
 * Real-time hook for customer notifications.
 *
 * Returns:
 *  - notifications   : Array of user notification objects
 *  - unreadCount     : number of unread notifications
 *  - loading         : initial load state
 *  - error           : error string or null
 *  - markRead        : mark a single notification as read
 *  - markAllRead     : mark all notifications as read
 *  - formatTime      : helper to format createdAt date
 */
export function useUserNotifications() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // ── Real-time listener for all user notifications ──
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = subscribeToUserNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useUserNotifications] error:", err);
        setError("Failed to load notifications.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // ── Real-time listener for unread count (badge) ──
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    const unsub = subscribeToUserUnreadCount(user.uid, (count) => {
      setUnreadCount(count);
    });

    return () => unsub();
  }, [user?.uid]);

  // ── Mark single as read ──
  const markRead = useCallback(async (notifId) => {
    try {
      await markUserNotifRead(notifId);
    } catch (err) {
      console.error("[useUserNotifications] markRead error:", err);
    }
  }, []);

  // ── Mark all as read ──
  const markAllRead = useCallback(async () => {
    if (!user?.uid) return;
    try {
      await markAllUserNotifsRead(user.uid);
    } catch (err) {
      console.error("[useUserNotifications] markAllRead error:", err);
    }
  }, [user?.uid]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    formatTime: formatNotifTime,
  };
}

// ─── UNREAD BADGE HOOK ───────────────────────────────────────────────────────
/**
 * Lightweight hook — only subscribes to the unread count.
 * Use this in Header, BottomNav, or Account page for the badge dot.
 * Avoids fetching full notification payloads unnecessarily.
 *
 * @returns {{ unreadCount: number }}
 */
export function useUserUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    const unsub = subscribeToUserUnreadCount(user.uid, setUnreadCount);
    return () => unsub();
  }, [user?.uid]);

  return { unreadCount };
}

/**
 * Lightweight hook for admin unread badge.
 * Use in admin sidebar or header.
 *
 * @returns {{ unreadCount: number }}
 */
export function useAdminUnreadCount() {
  const { isSuperAdmin } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin) {
      setUnreadCount(0);
      return;
    }

    const unsub = subscribeToAdminUnreadCount(setUnreadCount);
    return () => unsub();
  }, [isSuperAdmin]);

  return { unreadCount };
}
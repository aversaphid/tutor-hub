"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useOnlinePresence(currentUserId?: string) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  // Check if a user is online
  const isOnline = useCallback(
    (userId?: string | null): boolean => {
      if (!userId) return false;
      return onlineUserIds.has(userId);
    },
    [onlineUserIds]
  );

  // Handle SSE presence events
  const handlePresenceEvent = useCallback((eventType: string, data: any) => {
    if (eventType === "presence-snapshot" && Array.isArray(data?.onlineUserIds)) {
      setOnlineUserIds(new Set(data.onlineUserIds));
    } else if (eventType === "presence-update" && data?.userId) {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (data.online) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch of online users
    const fetchOnlineUsers = async () => {
      try {
        const res = await fetch("/api/presence");
        if (res.ok) {
          const data = await res.json();
          if (data?.onlineUserIds && isMounted) {
            setOnlineUserIds(new Set(data.onlineUserIds));
          }
        }
      } catch {}
    };

    fetchOnlineUsers();

    // 2. Refresh online users on window focus or visibility change to visible (only as fallback when SSE is not streaming)
    let lastVisibilityCheck = 0;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (typeof window !== "undefined" && Boolean((window as any).__th_sse_active)) {
          return;
        }
        const now = Date.now();
        if (now - lastVisibilityCheck < 30_000) return;
        lastVisibilityCheck = now;
        fetchOnlineUsers();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [currentUserId]);

  return {
    onlineUserIds,
    isOnline,
    handlePresenceEvent,
  };
}

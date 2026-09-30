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

    // 2. Client heartbeat for currently logged in user
    let heartbeatInterval: NodeJS.Timeout | null = null;
    const sendHeartbeat = () => {
      if (!currentUserIdRef.current) return;
      fetch("/api/presence", { method: "POST" }).catch(() => {});
    };

    if (currentUserId) {
      sendHeartbeat();
      heartbeatInterval = setInterval(sendHeartbeat, 25_000);
    }

    // 3. Heartbeat on window focus or visibility change to visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
        fetchOnlineUsers();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // 4. Send leave beacon on tab unload/close
    const handleBeforeUnload = () => {
      if (currentUserIdRef.current && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/presence/leave");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentUserId]);

  return {
    onlineUserIds,
    isOnline,
    handlePresenceEvent,
  };
}

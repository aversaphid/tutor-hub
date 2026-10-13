"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Check support and active subscription status
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      setIsIOS(isIosDevice);
      setIsStandalone(standalone);

      if (
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
      ) {
        setIsSupported(true);
        setPermission(Notification.permission);

        navigator.serviceWorker.ready.then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            setIsSubscribed(Boolean(sub));
          }).catch(() => {});
        }).catch(() => {});
      }
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setStatusMessage("Push notifications are not supported on this browser/device.");
      return false;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      // 1. Request Permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setStatusMessage(
          perm === "denied"
            ? "Notifications blocked. Please enable them in your browser site settings."
            : "Notification permission was dismissed."
        );
        setLoading(false);
        return false;
      }

      // 2. Fetch public VAPID key
      let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        const keyRes = await fetch("/api/push/subscribe");
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          vapidPublicKey = keyData.publicKey;
        }
      }

      if (!vapidPublicKey) {
        setStatusMessage("VAPID server key unavailable.");
        setLoading(false);
        return false;
      }

      // 3. Register push manager subscription
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      // 4. Save to backend database
      const p256dh = sub.getKey("p256dh")
        ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!)))
        : "";
      const auth = sub.getKey("auth")
        ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!)))
        : "";

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh, auth },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to register subscription on server");
      }

      setIsSubscribed(true);
      setStatusMessage("Push notifications enabled!");

      // Automatically send a confirmation test push so the user immediately knows notifications are working
      try {
        await fetch("/api/push/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "LB Maths Tuition",
            body: "🔔 If you can see this, your notifications are working!",
          }),
        });
      } catch {}

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error("[usePushNotifications] Subscribe error:", err);
      setStatusMessage(err.message || "Failed to enable notifications");
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;
    setLoading(true);
    setStatusMessage(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }

      setIsSubscribed(false);
      setStatusMessage("Push notifications disabled.");
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error("[usePushNotifications] Unsubscribe error:", err);
      setStatusMessage("Failed to unsubscribe");
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  const testPush = useCallback(async () => {
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "LB Maths Tuition",
          body: "🔔 If you can see this, your notifications are working!",
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    isSupported,
    isIOS,
    isStandalone,
    permission,
    isSubscribed,
    loading,
    statusMessage,
    subscribe,
    unsubscribe,
    testPush,
    clearStatusMessage: () => setStatusMessage(null),
  };
}

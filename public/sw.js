// Service Worker for LB Maths Tuition PWA Installability
const CACHE_NAME = "lbmaths-cache-v1";
const STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Precaching warning:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API requests, SSE streams, or authentication endpoints
  if (
    url.pathname.startsWith("/api/") ||
    event.request.method !== "GET" ||
    url.pathname.includes("/events")
  ) {
    return; // Pass directly to network
  }

  // Network-first strategy for HTML pages, cache-first for static icons/assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
        );
      })
    );
  } else {
    // Navigation / other requests: fetch from network
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

// Web Push Notification Listeners
self.addEventListener("push", (event) => {
  let data = {
    title: "LB Maths Tuition",
    body: "You have a new update regarding your maths lesson.",
    url: "/",
    icon: "/icon-192.png",
    badge: "/favicon.ico",
    tag: "lbmaths-lesson-alert",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/favicon.ico",
    tag: data.tag || "lbmaths-alert",
    data: {
      url: data.url || "/",
      ...data.data,
    },
    vibrate: [200, 100, 200],
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});


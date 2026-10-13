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

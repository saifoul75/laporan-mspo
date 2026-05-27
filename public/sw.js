// Service Worker asas untuk PWA & offline shell
// Cache strategy: network-first untuk data, cache-first untuk assets statik

const VERSI_CACHE = "mspo-audit-v1";
const ASET_CACHE = [
  "/",
  "/dashboard",
  "/audit",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSI_CACHE)
      .then((cache) => cache.addAll(ASET_CACHE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nama) =>
      Promise.all(
        nama.filter((n) => n !== VERSI_CACHE).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Skip non-GET dan API calls (Supabase REST/Storage)
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;
  if (url.hostname.includes("supabase")) return;

  // Network-first dengan cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        const salinan = res.clone();
        caches.open(VERSI_CACHE).then((cache) => cache.put(req, salinan));
        return res;
      })
      .catch(() => caches.match(req).then((res) => res ?? new Response("Offline", { status: 503 })))
  );
});

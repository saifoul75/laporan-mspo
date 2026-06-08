importScripts("/sw-version.js");

const VERSI_CACHE = self.__SW_VERSION || "mspo-audit-fallback";
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
  const url = new URL(req.url);

  // 1. Tapis skema non-http(s)
  if (req.method !== "GET") return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // 2. Skip aset build Next.js (biar Next handle caching sendiri)
  if (url.pathname.startsWith("/_next/")) return;

  // 3. Skip API & luaran
  if (url.pathname.startsWith("/api/")) return;
  if (url.hostname.includes("supabase")) return;

  // Network-first untuk navigasi (HTML pages)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const salinan = res.clone();
            caches.open(VERSI_CACHE).then((cache) => cache.put(req, salinan));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached ?? new Response("Offline", { status: 503 }))
        )
    );
    return;
  }

  // Network-first untuk aset lain
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const salinan = res.clone();
          caches.open(VERSI_CACHE).then((cache) => cache.put(req, salinan));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((cached) => cached ?? new Response("Offline", { status: 503 }))
      )
  );
});

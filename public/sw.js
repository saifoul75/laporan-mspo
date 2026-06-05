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

  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;
  if (url.hostname.includes("supabase")) return;

  // Network-first untuk navigasi (HTML pages) — pastikan shell baru sentiasa dipakai
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const salinan = res.clone();
          caches.open(VERSI_CACHE).then((cache) => cache.put(req, salinan));
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
        const salinan = res.clone();
        caches.open(VERSI_CACHE).then((cache) => cache.put(req, salinan));
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((cached) => cached ?? new Response("Offline", { status: 503 }))
      )
  );
});

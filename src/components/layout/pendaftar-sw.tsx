"use client";

import { useEffect } from "react";

export function PendaftarSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const daftar = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (e) {
        console.warn("Gagal daftar service worker:", e);
      }
    };
    daftar();
  }, []);

  return null;
}

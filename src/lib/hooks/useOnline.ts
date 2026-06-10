"use client";

import { useEffect, useState } from "react";

/**
 * Hook untuk detect status online/offline.
 * Guna `navigator.onLine` + listen events `online` / `offline`.
 */
export function useOnline(): boolean {
  // Default true untuk SSR; client akan auto-correct selepas mount.
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined") return navigator.onLine;
    return true;
  });

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const naik = () => setOnline(true);
    const turun = () => setOnline(false);

    window.addEventListener("online", naik);
    window.addEventListener("offline", turun);

    return () => {
      window.removeEventListener("online", naik);
      window.removeEventListener("offline", turun);
    };
  }, []);

  return online;
}

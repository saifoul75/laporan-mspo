// Hook & utiliti untuk capture GPS

"use client";

import { useState, useCallback } from "react";

export interface KoordinatGPS {
  latitud: number;
  longitud: number;
  ketepatan: number; // dalam meter
  pada: number; // epoch ms
}

export interface KeadaanGPS {
  koordinat: KoordinatGPS | null;
  memuat: boolean;
  ralat: string | null;
  disokong: boolean;
}

export function useGPS() {
  const [keadaan, setKeadaan] = useState<KeadaanGPS>({
    koordinat: null,
    memuat: false,
    ralat: null,
    disokong: typeof navigator !== "undefined" && "geolocation" in navigator,
  });

  const dapatkan = useCallback(() => {
    if (!keadaan.disokong) {
      setKeadaan((s) => ({ ...s, ralat: "GPS tidak disokong oleh peranti" }));
      return;
    }

    setKeadaan((s) => ({ ...s, memuat: true, ralat: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setKeadaan({
          koordinat: {
            latitud: pos.coords.latitude,
            longitud: pos.coords.longitude,
            ketepatan: pos.coords.accuracy,
            pada: pos.timestamp,
          },
          memuat: false,
          ralat: null,
          disokong: true,
        });
      },
      (err) => {
        const mesej =
          err.code === err.PERMISSION_DENIED
            ? "Akses GPS ditolak. Sila benarkan akses lokasi."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Lokasi tidak dapat ditentukan."
              : err.code === err.TIMEOUT
                ? "Masa tamat untuk dapatkan lokasi."
                : "Ralat tidak dijangka semasa dapatkan lokasi.";
        setKeadaan((s) => ({ ...s, memuat: false, ralat: mesej }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [keadaan.disokong]);

  return { ...keadaan, dapatkan };
}

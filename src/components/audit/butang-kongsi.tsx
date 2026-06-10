"use client";

// ButangKongsi — Komponen klien untuk urus pautan kongsi laporan awam.
// Dipasang dalam halaman laporan yang memerlukan auth (/audit/[id]/laporan).
// Tidak memaparkan sebarang data auth-only kepada pengguna awam.

import { useState, useTransition } from "react";
import {
  aktifkanKongsi,
  nyahaktifkanKongsi,
  janaSemulaTautan,
} from "@/app/(dashboard)/audit/[id]/laporan/actions";

interface ButangKongsiProps {
  auditId: string;
  /** Token semasa dari DB (null jika belum pernah dijana) */
  tokenAsal: string | null;
  /** Status kongsi semasa dari DB */
  aktifAsal: boolean;
}

export function ButangKongsi({
  auditId,
  tokenAsal,
  aktifAsal,
}: ButangKongsiProps) {
  const [token, setToken] = useState<string | null>(tokenAsal);
  const [aktif, setAktif] = useState(aktifAsal);
  const [ralat, setRalat] = useState<string | null>(null);
  const [disalin, setDisalin] = useState(false);
  const [tunjukPanel, setTunjukPanel] = useState(false);
  const [isPending, startTransition] = useTransition();

  // URL penuh yang boleh dikongsi — dibina di klien supaya guna domain yang betul
  const urlKongsi =
    token && aktif
      ? `${window.location.origin}/share/${token}`
      : null;

  // ── Salin ke papan klip ──────────────────────────────────────────────────
  async function salinURL() {
    if (!urlKongsi) return;
    try {
      await navigator.clipboard.writeText(urlKongsi);
      setDisalin(true);
      setTimeout(() => setDisalin(false), 2000);
    } catch {
      // Fallback untuk persekitaran tanpa clipboard API
      const el = document.createElement("textarea");
      el.value = urlKongsi;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setDisalin(true);
      setTimeout(() => setDisalin(false), 2000);
    }
  }

  // ── Toggle aktif/tidak aktif ──────────────────────────────────────────────
  function toggleKongsi() {
    setRalat(null);
    startTransition(async () => {
      const hasil = aktif
        ? await nyahaktifkanKongsi(auditId)
        : await aktifkanKongsi(auditId);

      if (!hasil.berjaya) {
        setRalat(hasil.mesej);
        return;
      }

      if (hasil.berjaya) {
        if ("token" in hasil && hasil.token) setToken(hasil.token);
        if ("aktif" in hasil && hasil.aktif !== undefined) setAktif(hasil.aktif);
      }
    });
  }

  // ── Jana semula token (revoke) ────────────────────────────────────────────
  function revokeTautan() {
    if (
      !confirm(
        "Pautan lama akan TERUS tidak sah. Jana pautan baharu?"
      )
    )
      return;

    setRalat(null);
    startTransition(async () => {
      const hasil = await janaSemulaTautan(auditId);

      if (!hasil.berjaya) {
        setRalat(hasil.mesej);
        return;
      }

      if (hasil.berjaya) {
        if ("token" in hasil && hasil.token) setToken(hasil.token);
        if ("aktif" in hasil) setAktif(true);
      }
    });
  }

  return (
    <div className="relative">
      {/* ── Butang utama ── */}
      <button
        type="button"
        onClick={() => setTunjukPanel((p) => !p)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        aria-label="Kongsi laporan"
      >
        <IconKongsi />
        Kongsi
        {aktif && (
          <span className="flex h-2 w-2 rounded-full bg-green-500" aria-label="Perkongsian aktif" />
        )}
      </button>

      {/* ── Panel kongsi ── */}
      {tunjukPanel && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-card p-4 shadow-lg sm:w-96">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Kongsi Laporan</h3>
            <button
              type="button"
              onClick={() => setTunjukPanel(false)}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="Tutup panel"
            >
              <IconTutup />
            </button>
          </div>

          {/* Toggle aktif */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">
                {aktif ? "Perkongsian Aktif" : "Perkongsian Tidak Aktif"}
              </div>
              <div className="text-xs text-muted-foreground">
                {aktif
                  ? "Sesiapa yang ada pautan boleh melihat laporan ini."
                  : "Laporan ini tidak boleh diakses oleh orang luar."}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleKongsi}
              disabled={isPending}
              aria-label={aktif ? "Nyahaktifkan perkongsian" : "Aktifkan perkongsian"}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                aktif ? "bg-green-500" : "bg-gray-400"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  aktif ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* URL + Salin */}
          {urlKongsi && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                  {urlKongsi}
                </span>
                <button
                  type="button"
                  onClick={salinURL}
                  className="shrink-0 rounded p-1 hover:bg-accent"
                  aria-label="Salin pautan"
                >
                  {disalin ? <IconTick /> : <IconSalin />}
                </button>
              </div>
              {disalin && (
                <p className="text-xs text-green-600">Pautan disalin!</p>
              )}
            </div>
          )}

          {/* Revoke */}
          {token && (
            <div className="mt-3 border-t pt-3">
              <button
                type="button"
                onClick={revokeTautan}
                disabled={isPending}
                className="text-xs text-destructive hover:underline disabled:opacity-50"
              >
                Jana semula pautan (pautan lama terus tidak sah)
              </button>
            </div>
          )}

          {/* Mesej ralat */}
          {ralat && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {ralat}
            </div>
          )}

          {/* Petunjuk loading */}
          {isPending && (
            <div className="mt-2 text-xs text-muted-foreground">
              Memproses...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ikon SVG inline ──────────────────────────────────────────────────────────

function IconKongsi() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function IconSalin() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconTick() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-600"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconTutup() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14
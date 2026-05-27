"use client";

import { useState, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  kemaskiniRolPengguna,
  kemaskiniPOPengguna,
} from "@/app/(dashboard)/pengguna/actions";
import type { RolPengguna } from "@/types";
import { formatTarikh } from "@/lib/utils";

interface Pengguna {
  id: string;
  email: string;
  nama_penuh: string;
  no_telefon: string | null;
  rol: RolPengguna;
  pusat_operasi_id: string | null;
  dicipta_pada: string;
}

interface PO {
  id: string;
  kod: string;
  nama: string;
}

const LABEL_ROL: Record<RolPengguna, string> = {
  admin: "Pentadbir",
  lead_auditor: "Lead Auditor",
  auditor: "Auditor",
  po_user: "Pusat Operasi",
};

export function JadualPengguna({
  senaraiPengguna,
  senaraiPO,
  penggunaSemasaId,
}: {
  senaraiPengguna: Pengguna[];
  senaraiPO: PO[];
  penggunaSemasaId: string;
}) {
  if (senaraiPengguna.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Tiada pengguna.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Pengguna</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Pusat Operasi</th>
            <th className="p-3">Didaftar</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {senaraiPengguna.map((p) => (
            <BarisPengguna
              key={p.id}
              pengguna={p}
              senaraiPO={senaraiPO}
              adalahDiriSendiri={p.id === penggunaSemasaId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BarisPengguna({
  pengguna,
  senaraiPO,
  adalahDiriSendiri,
}: {
  pengguna: Pengguna;
  senaraiPO: PO[];
  adalahDiriSendiri: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [mesej, setMesej] = useState<string | null>(null);
  const [ralat, setRalat] = useState<string | null>(null);

  function tukarRol(rolBaru: RolPengguna) {
    setRalat(null);
    setMesej(null);
    startTransition(async () => {
      const r = await kemaskiniRolPengguna({
        pengguna_id: pengguna.id,
        rol: rolBaru,
      });
      if (!r.ok) {
        setRalat(r.ralat ?? "Gagal kemaskini");
      } else {
        setMesej("Disimpan");
        setTimeout(() => setMesej(null), 1500);
      }
    });
  }

  function tukarPO(poId: string) {
    setRalat(null);
    setMesej(null);
    startTransition(async () => {
      const r = await kemaskiniPOPengguna({
        pengguna_id: pengguna.id,
        pusat_operasi_id: poId || null,
      });
      if (!r.ok) {
        setRalat(r.ralat ?? "Gagal kemaskini");
      } else {
        setMesej("Disimpan");
        setTimeout(() => setMesej(null), 1500);
      }
    });
  }

  return (
    <tr className={pending ? "opacity-60" : ""}>
      <td className="p-3">
        <div className="font-medium">
          {pengguna.nama_penuh}
          {adalahDiriSendiri && (
            <Badge variant="outline" className="ml-2 text-xs">
              Anda
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{pengguna.email}</div>
        {pengguna.no_telefon && (
          <div className="text-xs text-muted-foreground">
            {pengguna.no_telefon}
          </div>
        )}
      </td>
      <td className="p-3">
        <Select
          value={pengguna.rol}
          onChange={(e) => tukarRol(e.target.value as RolPengguna)}
          disabled={pending || (adalahDiriSendiri && pengguna.rol === "admin")}
          className="min-w-[140px]"
        >
          {(
            ["admin", "lead_auditor", "auditor", "po_user"] as RolPengguna[]
          ).map((r) => (
            <option key={r} value={r}>
              {LABEL_ROL[r]}
            </option>
          ))}
        </Select>
        {ralat && <div className="mt-1 text-xs text-destructive">{ralat}</div>}
        {mesej && <div className="mt-1 text-xs text-emerald-700">{mesej}</div>}
      </td>
      <td className="p-3">
        <Select
          value={pengguna.pusat_operasi_id ?? ""}
          onChange={(e) => tukarPO(e.target.value)}
          disabled={pending}
          className="min-w-[180px]"
        >
          <option value="">-- Tiada --</option>
          {senaraiPO.map((po) => (
            <option key={po.id} value={po.id}>
              {po.kod} - {po.nama}
            </option>
          ))}
        </Select>
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {formatTarikh(pengguna.dicipta_pada)}
      </td>
    </tr>
  );
}

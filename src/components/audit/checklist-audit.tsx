"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Butang } from "@/components/ui/butang";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeStatus } from "@/components/ui/badge-status";
import { useGPS } from "@/lib/hooks/useGPS";
import { useOnline } from "@/lib/hooks/useOnline";
import { MuatNaikBukti } from "@/components/audit/muat-naik-bukti";
import { simpanDapatanOffline, keDapatan } from "@/lib/db/simpan-dapatan";
import type {
  Prinsip,
  Kriteria,
  ItemSemakan,
  Dapatan,
  StatusDapatan,
  GredNC,
} from "@/types";
import { cn } from "@/lib/utils";

const SEMUA_STATUS: StatusDapatan[] = ["Y", "N", "NC", "OFI", "NA", "Pending"];

interface Props {
  auditId: string;
  prinsipList: Prinsip[];
  kriteriaList: Kriteria[];
  itemList: ItemSemakan[];
  dapatanAwal: Dapatan[];
  penggunaId: string;
  klausaAwal?: string;
}

export function ChecklistAudit({
  auditId,
  prinsipList,
  kriteriaList,
  itemList,
  dapatanAwal,
  penggunaId,
  klausaAwal,
}: Props) {
  const [dapatanMap, setDapatanMap] = useState<Map<string, Partial<Dapatan>>>(
    () => {
      const m = new Map<string, Partial<Dapatan>>();
      for (const d of dapatanAwal) m.set(d.item_semakan_id, d);
      return m;
    }
  );

  // Cari item & kriteria yang sepadan dengan klausaAwal (kalau ada)
  const itemAwal = useMemo(() => {
    if (!klausaAwal) return null;
    return itemList.find((i) => i.kod === klausaAwal) ?? null;
  }, [itemList, klausaAwal]);

  const prinsipAwalId = useMemo(() => {
    if (!itemAwal) return prinsipList[0]?.id ?? "";
    const kriteria = kriteriaList.find((k) => k.id === itemAwal.kriteria_id);
    return kriteria?.prinsip_id ?? prinsipList[0]?.id ?? "";
  }, [itemAwal, kriteriaList, prinsipList]);

  const [prinsipAktif, setPrinsipAktif] = useState<string>(prinsipAwalId);
  const [itemTerbuka, setItemTerbuka] = useState<string | null>(
    itemAwal?.id ?? null
  );

  // Auto-scroll ke item bila klausaAwal disediakan
  useEffect(() => {
    if (!itemAwal) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`item-${itemAwal.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);
    return () => clearTimeout(t);
  }, [itemAwal]);

  // Group kriteria by prinsip, items by kriteria
  const kriteriaPerPrinsip = useMemo(() => {
    const m = new Map<string, Kriteria[]>();
    for (const k of kriteriaList) {
      const arr = m.get(k.prinsip_id) ?? [];
      arr.push(k);
      m.set(k.prinsip_id, arr);
    }
    return m;
  }, [kriteriaList]);

  const itemPerKriteria = useMemo(() => {
    const m = new Map<string, ItemSemakan[]>();
    for (const i of itemList) {
      const arr = m.get(i.kriteria_id) ?? [];
      arr.push(i);
      m.set(i.kriteria_id, arr);
    }
    return m;
  }, [itemList]);

  // Stats
  const stats = useMemo(() => {
    let y = 0, n = 0, nc = 0, ofi = 0, na = 0, pending = 0;
    for (const item of itemList) {
      const d = dapatanMap.get(item.id);
      const s = (d?.status ?? "Pending") as StatusDapatan;
      if (s === "Y") y++;
      else if (s === "N") n++;
      else if (s === "NC") nc++;
      else if (s === "OFI") ofi++;
      else if (s === "NA") na++;
      else pending++;
    }
    const dijawab = y + n + nc + ofi + na;
    const peratus = itemList.length > 0 ? Math.round((dijawab / itemList.length) * 100) : 0;
    return { y, n, nc, ofi, na, pending, dijawab, peratus };
  }, [itemList, dapatanMap]);

  function kemaskiniDapatan(itemId: string, patch: Partial<Dapatan>) {
    setDapatanMap((m) => {
      const baharu = new Map(m);
      const sedia = baharu.get(itemId) ?? {};
      baharu.set(itemId, { ...sedia, ...patch });
      return baharu;
    });
  }

  return (
    <div className="space-y-4">
      {/* Ringkasan progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">
                Progres: {stats.dijawab} / {itemList.length} item ({stats.peratus}%)
              </div>
              <div className="mt-2 h-2 w-64 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stats.peratus}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <BadgeStatus status="Y" /> <span className="text-sm">{stats.y}</span>
              <BadgeStatus status="N" /> <span className="text-sm">{stats.n}</span>
              <BadgeStatus status="NC" /> <span className="text-sm">{stats.nc}</span>
              <BadgeStatus status="OFI" /> <span className="text-sm">{stats.ofi}</span>
              <BadgeStatus status="NA" /> <span className="text-sm">{stats.na}</span>
              <BadgeStatus status="Pending" /> <span className="text-sm">{stats.pending}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab prinsip */}
      <div className="flex flex-wrap gap-1 border-b">
        {prinsipList.map((p) => (
          <button
            key={p.id}
            onClick={() => setPrinsipAktif(p.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              prinsipAktif === p.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {p.kod} - {p.tajuk.length > 30 ? p.tajuk.slice(0, 30) + "..." : p.tajuk}
          </button>
        ))}
      </div>

      {/* Senarai kriteria + items untuk prinsip aktif */}
      <div className="space-y-3">
        {(kriteriaPerPrinsip.get(prinsipAktif) ?? []).map((kriteria) => {
          const items = itemPerKriteria.get(kriteria.id) ?? [];
          return (
            <Card key={kriteria.id}>
              <CardContent className="p-4">
                <div className="mb-3 border-b pb-2">
                  <div className="text-xs font-mono text-muted-foreground">
                    Klausa {kriteria.kod}
                  </div>
                  <div className="font-semibold">{kriteria.tajuk}</div>
                </div>

                <div className="space-y-2">
                  {items.map((item) => {
                    const dapatan = dapatanMap.get(item.id);
                    const status = (dapatan?.status ?? "Pending") as StatusDapatan;
                    const dibuka = itemTerbuka === item.id;

                    return (
                      <div
                        key={item.id}
                        id={`item-${item.id}`}
                        className={cn(
                          "rounded-md border transition-colors scroll-mt-20",
                          dibuka && "border-primary"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setItemTerbuka(dibuka ? null : item.id)}
                          className="flex w-full items-start justify-between gap-3 p-3 text-left"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {item.kod}
                              </span>
                              {item.fail_rujukan && (
                                <Badge variant="outline" className="text-xs">
                                  Fail {item.fail_rujukan}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-sm">{item.tajuk}</div>
                          </div>
                          <BadgeStatus status={status} />
                        </button>

                        {dibuka && (
                          <BorangDapatan
                            auditId={auditId}
                            item={item}
                            dapatan={dapatan ?? {}}
                            penggunaId={penggunaId}
                            onSimpan={(patch) => kemaskiniDapatan(item.id, patch)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function BorangDapatan({
  auditId,
  item,
  dapatan,
  penggunaId,
  onSimpan,
}: {
  auditId: string;
  item: ItemSemakan;
  dapatan: Partial<Dapatan>;
  penggunaId: string;
  onSimpan: (patch: Partial<Dapatan>) => void;
}) {
  const [status, setStatus] = useState<StatusDapatan>(
    (dapatan.status as StatusDapatan) ?? "Pending"
  );
  const [gredNC, setGredNC] = useState<GredNC | "">((dapatan.gred_nc as GredNC) ?? "");
  const [catatan, setCatatan] = useState(dapatan.catatan ?? "");
  const [buktiAudit, setBuktiAudit] = useState(dapatan.bukti_audit ?? "");
  const [puncaAkar, setPuncaAkar] = useState(dapatan.punca_akar ?? "");
  const [cadangan, setCadangan] = useState(dapatan.cadangan_tindakan ?? "");
  const [pic, setPic] = useState(dapatan.pic ?? "");
  const [tarikhSiap, setTarikhSiap] = useState(dapatan.tarikh_siap_target ?? "");
  const [pending, startTransition] = useTransition();
  const [mesej, setMesej] = useState<string | null>(null);
  const gps = useGPS();
  const online = useOnline();

  const perluBesar = status === "NC" || status === "N";
  const perluCadangan = status === "NC" || status === "OFI";

  async function simpan() {
    setMesej(null);
    const payload = {
      audit_id: auditId,
      item_semakan_id: item.id,
      status,
      gred_nc: status === "NC" && gredNC ? (gredNC as GredNC) : null,
      catatan: catatan || null,
      bukti_audit: buktiAudit || null,
      punca_akar: puncaAkar || null,
      cadangan_tindakan: cadangan || null,
      pic: pic || null,
      tarikh_siap_target: tarikhSiap || null,
      latitud: gps.koordinat?.latitud ?? dapatan.latitud ?? null,
      longitud: gps.koordinat?.longitud ?? dapatan.longitud ?? null,
      ketepatan_gps: gps.koordinat?.ketepatan ?? dapatan.ketepatan_gps ?? null,
      diaudit_oleh: penggunaId,
    };

    startTransition(async () => {
      try {
        const rekod = await simpanDapatanOffline(payload, dapatan.id);
        onSimpan(keDapatan(rekod));
        setMesej(online ? "Tersimpan" : "Disimpan tempatan (sync bila online)");
        setTimeout(() => setMesej(null), 2500);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMesej("Gagal simpan: " + msg);
      }
    });
  }

  return (
    <div className="space-y-3 border-t bg-muted/30 p-4">
      {item.bukti_wajib && (
        <div className="rounded bg-card p-2 text-xs">
          <span className="font-semibold">Bukti wajib: </span>
          <span className="text-muted-foreground">{item.bukti_wajib}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`status-${item.id}`}>Status</Label>
          <Select
            id={`status-${item.id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusDapatan)}
          >
            {SEMUA_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {status === "NC" && (
          <div className="space-y-1">
            <Label htmlFor={`gred-${item.id}`}>Gred NC</Label>
            <Select
              id={`gred-${item.id}`}
              value={gredNC}
              onChange={(e) => setGredNC(e.target.value as GredNC | "")}
            >
              <option value="">-- Pilih --</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`catatan-${item.id}`}>Catatan / Dapatan</Label>
        <Textarea
          id={`catatan-${item.id}`}
          rows={2}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Penerangan ringkas dapatan..."
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`bukti-${item.id}`}>Bukti Audit</Label>
        <Textarea
          id={`bukti-${item.id}`}
          rows={2}
          value={buktiAudit}
          onChange={(e) => setBuktiAudit(e.target.value)}
          placeholder="Dokumen / pemerhatian yang disemak..."
        />
      </div>

      {perluBesar && (
        <div className="space-y-1">
          <Label htmlFor={`punca-${item.id}`}>Punca Akar (5 Whys / Fishbone)</Label>
          <Textarea
            id={`punca-${item.id}`}
            rows={2}
            value={puncaAkar}
            onChange={(e) => setPuncaAkar(e.target.value)}
          />
        </div>
      )}

      {perluCadangan && (
        <>
          <div className="space-y-1">
            <Label htmlFor={`cadangan-${item.id}`}>Cadangan Tindakan</Label>
            <Textarea
              id={`cadangan-${item.id}`}
              rows={2}
              value={cadangan}
              onChange={(e) => setCadangan(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`pic-${item.id}`}>PIC</Label>
              <Input
                id={`pic-${item.id}`}
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                placeholder="Nama / jawatan"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`siap-${item.id}`}>Tarikh Siap</Label>
              <Input
                id={`siap-${item.id}`}
                type="date"
                value={tarikhSiap}
                onChange={(e) => setTarikhSiap(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Butang
          type="button"
          variant="outline"
          size="sm"
          onClick={gps.dapatkan}
          disabled={gps.memuat}
        >
          {gps.memuat ? "Mendapatkan GPS..." : "Tag GPS"}
        </Butang>
        {gps.koordinat && (
          <span className="text-xs text-muted-foreground">
            {gps.koordinat.latitud.toFixed(5)}, {gps.koordinat.longitud.toFixed(5)} (±
            {Math.round(gps.koordinat.ketepatan)}m)
          </span>
        )}
        {gps.ralat && <span className="text-xs text-destructive">{gps.ralat}</span>}
      </div>

      <div className="flex items-center gap-2">
        <Butang type="button" onClick={simpan} disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Butang>
        {mesej && <span className="text-xs text-muted-foreground">{mesej}</span>}
      </div>

      {dapatan.id && (
        <div className="border-t pt-3">
          <MuatNaikBukti dapatanId={dapatan.id} />
        </div>
      )}
    </div>
  );
}

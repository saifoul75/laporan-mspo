"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  KPIPemadan,
  pemadanNombor,
  pemadanPeratus,
  toneUntukCapai,
} from "@/components/laporan/kpi-pemadan";
import type { CapaiMatlamatRow } from "@/lib/supabase/queries-laporan";

interface Props {
  data: CapaiMatlamatRow[];
  tahun: number;
}

type Agregat = {
  po: string;
  projek: string;
  jenis: "SAWIT" | "GETAH";
  unit: "MT" | "KG";
  luas_berhasil: number | null;
  bil_peserta: number | null;
  bil_bulan_aktif: number;
  jumlah_hasil: number;
  sasaran_tahunan: number | null;
  jumlah_matlamat: number | null;
  pct_capai: number | null;
  hasil_per_hek: number | null;
};

function aggregate(rows: CapaiMatlamatRow[]): Agregat[] {
  const map = new Map<string, Agregat>();
  for (const r of rows) {
    const key = `${r.po}|${r.projek}|${r.jenis}`;
    if (!map.has(key)) {
      map.set(key, {
        po: r.po,
        projek: r.projek,
        jenis: r.jenis,
        unit: r.unit,
        luas_berhasil: r.luas_berhasil,
        bil_peserta: r.bil_peserta,
        bil_bulan_aktif: 0,
        jumlah_hasil: 0,
        sasaran_tahunan: r.sasaran_tahunan,
        jumlah_matlamat: 0,
        pct_capai: null,
        hasil_per_hek: null,
      });
    }
    const a = map.get(key)!;
    a.jumlah_hasil += Number(r.hasil) || 0;
    a.jumlah_matlamat = (a.jumlah_matlamat ?? 0) + (Number(r.matlamat_bulanan) || 0);
    if (Number(r.hasil) > 0) a.bil_bulan_aktif += 1;
  }
  for (const a of map.values()) {
    if (a.jumlah_matlamat !== null && a.jumlah_matlamat > 0) {
      a.pct_capai = (a.jumlah_hasil / a.jumlah_matlamat) * 100;
    }
    if (a.luas_berhasil !== null && a.luas_berhasil > 0) {
      a.hasil_per_hek = a.jumlah_hasil / a.luas_berhasil;
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.po === b.po ? a.projek.localeCompare(b.projek) : a.po.localeCompare(b.po),
  );
}

export function TabPOCanvas({ data, tahun }: Props) {
  const agregat = useMemo(() => aggregate(data), [data]);

  const ringkasan = useMemo(() => {
    const sawit = agregat.filter((a) => a.jenis === "SAWIT");
    const getah = agregat.filter((a) => a.jenis === "GETAH");
    const jumlah = (arr: Agregat[], field: keyof Agregat) =>
      arr.reduce((s, a) => s + (Number(a[field]) || 0), 0);

    const totalSawitMt = jumlah(sawit, "jumlah_hasil");
    const totalGetahKg = jumlah(getah, "jumlah_hasil");
    const totalMatlamatSawit = jumlah(sawit, "jumlah_matlamat");
    const totalMatlamatGetah = jumlah(getah, "jumlah_matlamat");
    const pctSawit = totalMatlamatSawit > 0 ? (totalSawitMt / totalMatlamatSawit) * 100 : null;
    const pctGetah = totalMatlamatGetah > 0 ? (totalGetahKg / totalMatlamatGetah) * 100 : null;

    return {
      sawit: { totalSawitMt, pct: pctSawit, bil: sawit.length },
      getah: { totalGetahKg, pct: pctGetah, bil: getah.length },
      bilProjek: agregat.length,
      bilPO: new Set(agregat.map((a) => a.po)).size,
    };
  }, [agregat]);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Tiada data untuk tahun {tahun} dengan penapis semasa.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 print:space-y-3">
      <KPIPemadan
        items={[
          {
            label: "Jumlah Hasil Sawit",
            value: `${pemadanNombor(ringkasan.sawit.totalSawitMt, 3)} MT`,
            sublabel: `${ringkasan.sawit.bil} projek`,
            tone: toneUntukCapai(ringkasan.sawit.pct),
          },
          {
            label: "Pencapaian Sawit",
            value: pemadanPeratus(ringkasan.sawit.pct),
            sublabel: "vs matlamat bulanan agregat",
            tone: toneUntukCapai(ringkasan.sawit.pct),
          },
          {
            label: "Jumlah Hasil Getah",
            value: `${pemadanNombor(ringkasan.getah.totalGetahKg, 2)} KG`,
            sublabel: `${ringkasan.getah.bil} projek`,
            tone: toneUntukCapai(ringkasan.getah.pct),
          },
          {
            label: "Pencapaian Getah",
            value: pemadanPeratus(ringkasan.getah.pct),
            sublabel: "vs matlamat bulanan agregat",
            tone: toneUntukCapai(ringkasan.getah.pct),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Pecahan Mengikut Projek</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2">PO</th>
                  <th className="px-3 py-2">Projek</th>
                  <th className="px-3 py-2">Jenis</th>
                  <th className="px-3 py-2 text-right">Luas Berhasil (ha)</th>
                  <th className="px-3 py-2 text-right">Peserta</th>
                  <th className="px-3 py-2 text-right">Hasil YTD</th>
                  <th className="px-3 py-2 text-right">Sasaran Tahunan</th>
                  <th className="px-3 py-2 text-right">Matlamat (tempoh)</th>
                  <th className="px-3 py-2 text-right">% Capai</th>
                  <th className="px-3 py-2 text-right">Hasil/ha</th>
                </tr>
              </thead>
              <tbody>
                {agregat.map((a, i) => (
                  <tr key={`${a.po}-${a.projek}-${a.jenis}-${i}`} className="border-t">
                    <td className="px-3 py-2 font-medium">{a.po}</td>
                    <td className="px-3 py-2">{a.projek}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          a.jenis === "SAWIT"
                            ? "rounded bg-amber-100 px-2 py-0.5 text-amber-800"
                            : "rounded bg-slate-100 px-2 py-0.5 text-slate-800"
                        }
                      >
                        {a.jenis} ({a.unit})
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{pemadanNombor(a.luas_berhasil, 4)}</td>
                    <td className="px-3 py-2 text-right">{a.bil_peserta ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{pemadanNombor(a.jumlah_hasil, 3)}</td>
                    <td className="px-3 py-2 text-right">{pemadanNombor(a.sasaran_tahunan, 2)}</td>
                    <td className="px-3 py-2 text-right">{pemadanNombor(a.jumlah_matlamat, 3)}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {pemadanPeratus(a.pct_capai)}
                    </td>
                    <td className="px-3 py-2 text-right">{pemadanNombor(a.hasil_per_hek, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Trend Bulanan (YTD)</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendBulanan rows={data} />
        </CardContent>
      </Card>
    </div>
  );
}

function TrendBulanan({ rows }: { rows: CapaiMatlamatRow[] }) {
  const bulanan = useMemo(() => {
    const m = new Map<string, { hasil: number; matlamat: number }>();
    for (const r of rows) {
      const key = `${r.jenis}|${r.bulan}`;
      if (!m.has(key)) m.set(key, { hasil: 0, matlamat: 0 });
      const v = m.get(key)!;
      v.hasil += Number(r.hasil) || 0;
      v.matlamat += Number(r.matlamat_bulanan) || 0;
    }
    return Array.from(m.entries())
      .map(([k, v]) => {
        const [jenis, bulan] = k.split("|");
        return {
          jenis: jenis as "SAWIT" | "GETAH",
          bulan: parseInt(bulan),
          hasil: v.hasil,
          matlamat: v.matlamat,
          pct: v.matlamat > 0 ? (v.hasil / v.matlamat) * 100 : null,
        };
      })
      .sort((a, b) => (a.jenis === b.jenis ? a.bulan - b.bulan : a.jenis.localeCompare(b.jenis)));
  }, [rows]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2">Jenis</th>
            <th className="px-3 py-2">Bulan</th>
            <th className="px-3 py-2 text-right">Hasil</th>
            <th className="px-3 py-2 text-right">Matlamat</th>
            <th className="px-3 py-2 text-right">% Capai</th>
          </tr>
        </thead>
        <tbody>
          {bulanan.map((b, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2">{b.jenis}</td>
              <td className="px-3 py-2">{b.bulan}</td>
              <td className="px-3 py-2 text-right">{pemadanNombor(b.hasil, 3)}</td>
              <td className="px-3 py-2 text-right">{pemadanNombor(b.matlamat, 3)}</td>
              <td className="px-3 py-2 text-right">{pemadanPeratus(b.pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
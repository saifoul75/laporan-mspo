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
import type {
  RankingPORow,
  WilayahRow,
} from "@/lib/supabase/queries-laporan";

interface Props {
  ringkasan: WilayahRow[];
  ranking: RankingPORow[];
  tahun: number;
}

export function TabWilayahCanvas({ ringkasan, ranking, tahun }: Props) {
  const agregatWilayah = useMemo(() => {
    const m = new Map<
      string,
      {
        wilayah: string;
        bil_po: Set<string>;
        bil_projek: number;
        sawit: { hasil: number; matlamat: number; luas: number };
        getah: { hasil: number; matlamat: number; luas: number };
      }
    >();
    for (const r of ringkasan) {
      if (!m.has(r.wilayah)) {
        m.set(r.wilayah, {
          wilayah: r.wilayah,
          bil_po: new Set(),
          bil_projek: 0,
          sawit: { hasil: 0, matlamat: 0, luas: 0 },
          getah: { hasil: 0, matlamat: 0, luas: 0 },
        });
      }
      const w = m.get(r.wilayah)!;
      w.bil_projek += r.bil_projek;
      const bucket = r.jenis === "SAWIT" ? w.sawit : w.getah;
      bucket.hasil += Number(r.jumlah_hasil) || 0;
      bucket.matlamat += Number(r.jumlah_matlamat) || 0;
      bucket.luas += Number(r.jumlah_luas_berhasil) || 0;
    }
    // Bil PO unik — ambil dari ranking
    for (const r of ranking) {
      const w = m.get(r.wilayah ?? "");
      if (w) w.bil_po.add(r.po);
    }
    return Array.from(m.values()).map((w) => ({
      wilayah: w.wilayah,
      bil_po: w.bil_po.size,
      bil_projek: w.bil_projek,
 sawit: {
        hasil: w.sawit.hasil,
        matlamat: w.sawit.matlamat,
        luas: w.sawit.luas,
        pct: w.sawit.matlamat > 0 ? (w.sawit.hasil / w.sawit.matlamat) * 100 : null,
        per_hek: w.sawit.luas > 0 ? w.sawit.hasil / w.sawit.luas : null,
      },
      getah: {
        hasil: w.getah.hasil,
        matlamat: w.getah.matlamat,
        luas: w.getah.luas,
        pct: w.getah.matlamat > 0 ? (w.getah.hasil / w.getah.matlamat) * 100 : null,
        per_hek: w.getah.luas > 0 ? w.getah.hasil / w.getah.luas : null,
      },
    }));
  }, [ringkasan, ranking]);

  const ringkasanKeseluruhan = useMemo(() => {
    const sawitHasil = agregatWilayah.reduce((s, w) => s + w.sawit.hasil, 0);
    const getahHasil = agregatWilayah.reduce((s, w) => s + w.getah.hasil, 0);
    const sawitMat = agregatWilayah.reduce((s, w) => s + w.sawit.matlamat, 0);
    const getahMat = agregatWilayah.reduce((s, w) => s + w.getah.matlamat, 0);
    return {
      sawitPct: sawitMat > 0 ? (sawitHasil / sawitMat) * 100 : null,
      getahPct: getahMat > 0 ? (getahHasil / getahMat) * 100 : null,
      bilWilayah: agregatWilayah.length,
      bilPO: agregatWilayah.reduce((s, w) => s + w.bil_po, 0),
    };
  }, [agregatWilayah]);

  if (ringkasan.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Tiada data wilayah untuk tahun {tahun}.
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
            label: "Bilangan Wilayah",
            value: String(ringkasanKeseluruhan.bilWilayah),
            sublabel: "aktif",
          },
          {
            label: "Bilangan PO",
            value: String(ringkasanKeseluruhan.bilPO),
            sublabel: "dengan data",
          },
          {
            label: "Pencapaian Sawit (Wilayah)",
            value: pemadanPeratus(ringkasanKeseluruhan.sawitPct),
            tone: toneUntukCapai(ringkasanKeseluruhan.sawitPct),
          },
          {
            label: "Pencapaian Getah (Wilayah)",
            value: pemadanPeratus(ringkasanKeseluruhan.getahPct),
            tone: toneUntukCapai(ringkasanKeseluruhan.getahPct),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Roll-up Mengikut Wilayah</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2">Wilayah</th>
                  <th className="px-3 py-2 text-right">PO</th>
                  <th className="px-3 py-2 text-right">Projek</th>
                  <th className="px-3 py-2 text-right">Sawit (MT)</th>
                  <th className="px-3 py-2 text-right">% Capai</th>
                  <th className="px-3 py-2 text-right">Getah (KG)</th>
                  <th className="px-3 py-2 text-right">% Capai</th>
                </tr>
              </thead>
              <tbody>
                {agregatWilayah.map((w) => (
                  <tr key={w.wilayah} className="border-t">
                    <td className="px-3 py-2 font-semibold">{w.wilayah}</td>
                    <td className="px-3 py-2 text-right">{w.bil_po}</td>
                    <td className="px-3 py-2 text-right">{w.bil_projek}</td>
                    <td className="px-3 py-2 text-right">{pemadanNombor(w.sawit.hasil, 3)}</td>
                    <td className="px-3 py-2 text-right">{pemadanPeratus(w.sawit.pct)}</td>
                    <td className="px-3 py-2 text-right">{pemadanNombor(w.getah.hasil, 2)}</td>
                    <td className="px-3 py-2 text-right">{pemadanPeratus(w.getah.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranking Pusat Operasi (% Capai)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Wilayah</th>
                  <th className="px-3 py-2">PO</th>
                  <th className="px-3 py-2">Jenis</th>
                  <th className="px-3 py-2 text-right">Projek</th>
                  <th className="px-3 py-2 text-right">Hasil</th>
                  <th className="px-3 py-2 text-right">Matlamat</th>
                  <th className="px-3 py-2 text-right">% Capai</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={`${r.po}-${r.jenis}-${i}`} className="border-t">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{r.wilayah ?? "—"}</td>
                    <td className="px-3 py-2 font-medium">{r.po}</td>
                    <td className="px-3 py-2">
                      {r.jenis} ({r.unit})
                    </td>
                    <td className="px-3 py-2 text-right">{r.bil_projek}</td>
                    <td className="px-3 py-2 text-right">{pemadanNombor(r.jumlah_hasil, 3)}</td>
                    <td className="px-3 py-2 text-right">{pemadanNombor(r.jumlah_matlamat, 3)}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {pemadanPeratus(r.pct_capai)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
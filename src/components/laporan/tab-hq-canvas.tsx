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
  HQRow,
  RankingPORow,
} from "@/lib/supabase/queries-laporan";

interface Props {
  hq: HQRow[];
  ranking: RankingPORow[];
  tahun: number;
}

export function TabHQCanvas({ hq, ranking, tahun }: Props) {
  const ringkasan = useMemo(() => {
    const sawit = hq.filter((r) => r.jenis === "SAWIT");
    const getah = hq.filter((r) => r.jenis === "GETAH");
    const totalSawitMt = sawit.reduce((s, r) => s + (Number(r.jumlah_hasil) || 0), 0);
    const totalGetahKg = getah.reduce((s, r) => s + (Number(r.jumlah_hasil) || 0), 0);
    const totalSawitMat = sawit.reduce((s, r) => s + (Number(r.jumlah_matlamat) || 0), 0);
    const totalGetahMat = getah.reduce((s, r) => s + (Number(r.jumlah_matlamat) || 0), 0);
    return {
      sawitPct: totalSawitMat > 0 ? (totalSawitMt / totalSawitMat) * 100 : null,
      getahPct: totalGetahMat > 0 ? (totalGetahKg / totalGetahMat) * 100 : null,
      totalSawitMt,
      totalGetahKg,
      bilPO: new Set(ranking.map((r) => r.po)).size,
    };
  }, [hq, ranking]);

  const trendBulanan = useMemo(() => {
    const sawit = hq.filter((r) => r.jenis === "SAWIT").sort((a, b) => a.bulan - b.bulan);
    const getah = hq.filter((r) => r.jenis === "GETAH").sort((a, b) => a.bulan - b.bulan);
    return { sawit, getah };
  }, [hq]);

  const rankingTop10 = ranking.slice(0, 10);
  const rankingBottom10 = [...ranking].reverse().slice(0, 10);

  if (hq.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Tiada data HQ untuk tahun {tahun}.
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
            label: "Hasil Sawit Kebangsaan",
            value: `${pemadanNombor(ringkasan.totalSawitMt, 2)} MT`,
            tone: toneUntukCapai(ringkasan.sawitPct),
          },
          {
            label: "Pencapaian Sawit",
            value: pemadanPeratus(ringkasan.sawitPct),
            tone: toneUntukCapai(ringkasan.sawitPct),
          },
          {
            label: "Hasil Getah Kebangsaan",
            value: `${pemadanNombor(ringkasan.totalGetahKg, 2)} KG`,
            tone: toneUntukCapai(ringkasan.getahPct),
          },
          {
            label: "Pencapaian Getah",
            value: pemadanPeratus(ringkasan.getahPct),
            tone: toneUntukCapai(ringkasan.getahPct),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Trend Bulanan Konsolidasi Nasional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <TrendTable title="Sawit (MT)" rows={trendBulanan.sawit} />
            <TrendTable title="Getah (KG)" rows={trendBulanan.getah} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 print:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 PO — Pencapaian Tertinggi</CardTitle>
          </CardHeader>
          <CardContent>
            <RankingTable rows={rankingTop10} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bottom 10 PO — Pencapaian Terendah</CardTitle>
          </CardHeader>
          <CardContent>
            <RankingTable rows={rankingBottom10} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrendTable({
  title,
  rows,
}: {
  title: string;
  rows: HQRow[];
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2">Bulan</th>
              <th className="px-3 py-2 text-right">Hasil</th>
              <th className="px-3 py-2 text-right">Matlamat</th>
              <th className="px-3 py-2 text-right">% Capai</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.jenis}-${r.bulan}`} className="border-t">
                <td className="px-3 py-2">{r.bulan_nama} {r.tahun}</td>
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
    </div>
  );
}

function RankingTable({ rows }: { rows: RankingPORow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Wilayah</th>
            <th className="px-3 py-2">PO</th>
            <th className="px-3 py-2">Jenis</th>
            <th className="px-3 py-2 text-right">% Capai</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.po}-${r.jenis}-${i}`} className="border-t">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2">{r.wilayah ?? "—"}</td>
              <td className="px-3 py-2 font-medium">{r.po}</td>
              <td className="px-3 py-2">{r.jenis}</td>
              <td className="px-3 py-2 text-right font-semibold">
                {pemadanPeratus(r.pct_capai)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
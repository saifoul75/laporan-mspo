"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface SenaraiDropdown {
  tahun: number[];
  wilayah: string[];
  po: string[];
}

interface Props {
  senarai: SenaraiDropdown;
  paparkanWilayah?: boolean;
  paparkanPO?: boolean;
  paparkanBulan?: boolean;
  paparkanJenis?: boolean;
}

const BULAN_NAMA = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

export function PenapisLaporan({
  senarai,
  paparkanWilayah = true,
  paparkanPO = true,
  paparkanBulan = true,
  paparkanJenis = true,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const sekarang = {
    tahun: params.get("tahun") || String(senarai.tahun[0] ?? new Date().getFullYear()),
    wilayah: params.get("wilayah") ?? "",
    po: params.get("po") ?? "",
    jenis: params.get("jenis") ?? "",
    bulan: params.get("bulan") ?? "",
  };

  function kemasKini(kunci: string, nilai: string) {
    const next = new URLSearchParams(params.toString());
    if (nilai) next.set(kunci, nilai);
    else next.delete(kunci);
    if (kunci === "tahun" || kunci === "wilayah") {
      next.delete("po");
    }
    startTransition(() => {
      router.push(`?${next.toString()}`);
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`grid gap-4 ${paparkanPO ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
          <div>
            <label className="mb-2 block text-sm font-medium">Tahun</label>
            <Select
              value={sekarang.tahun}
              onChange={(e) => kemasKini("tahun", e.target.value)}
              disabled={pending}
            >
              {senarai.tahun.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          {paparkanWilayah && (
            <div>
              <label className="mb-2 block text-sm font-medium">Wilayah</label>
              <Select
                value={sekarang.wilayah}
                onChange={(e) => kemasKini("wilayah", e.target.value)}
                disabled={pending}
              >
                <option value="">— Semua Wilayah —</option>
                {senarai.wilayah.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </Select>
            </div>
          )}

          {paparkanPO && (
            <div>
              <label className="mb-2 block text-sm font-medium">Pusat Operasi</label>
              <Select
                value={sekarang.po}
                onChange={(e) => kemasKini("po", e.target.value)}
                disabled={pending}
              >
                <option value="">— Semua PO —</option>
                {senarai.po.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
          )}

          {paparkanJenis && (
            <div>
              <label className="mb-2 block text-sm font-medium">Jenis</label>
              <Select
                value={sekarang.jenis}
                onChange={(e) => kemasKini("jenis", e.target.value)}
                disabled={pending}
              >
                <option value="">— Semua —</option>
                <option value="SAWIT">Sawit (MT)</option>
                <option value="GETAH">Getah (KG)</option>
              </Select>
            </div>
          )}

          {paparkanBulan && (
            <div>
              <label className="mb-2 block text-sm font-medium">Bulan</label>
              <Select
                value={sekarang.bulan}
                onChange={(e) => kemasKini("bulan", e.target.value)}
                disabled={pending}
              >
                <option value="">— Setahun —</option>
                {BULAN_NAMA.map((nama, idx) => (
                  <option key={idx + 1} value={idx + 1}>{nama}</option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
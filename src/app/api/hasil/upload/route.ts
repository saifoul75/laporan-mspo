import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ── Pembersihan & pengiraan ──

// Normalkan nama untuk padanan duplikat sahaja (tidak disimpan sebagai paparan).
// Cth: "TSK ... FASA II" dan "TSK ... FASA 2" dianggap projek yang sama.
function kunciNama(nama: any): string {
  return (nama ?? "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\bIV\b/g, "4")
    .replace(/\bIII\b/g, "3")
    .replace(/\bII\b/g, "2")
    .replace(/\bI\b/g, "1");
}

// Tapis baris sampah: nama kosong, nama sama dengan pol_pn (baris tajuk kawasan),
// atau nama yang hanya nombor (cth "2").
function namaSah(p: any): boolean {
  const nama = (p?.nama ?? "").toString().trim();
  if (!nama) return false;
  if (nama === (p?.pol_pn ?? "").toString().trim()) return false;
  if (!isNaN(Number(nama))) return false;
  return true;
}

function bersihkanNama(nama: any): string {
  return (nama ?? "").toString().trim().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: pengguna } = await supabase
      .from("pengguna")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (pengguna?.rol !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { kod_bulan, nama_bulan, sawit, getah } = body;

    if (!kod_bulan || !nama_bulan || !Array.isArray(sawit) || !Array.isArray(getah)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // ── Sawit: tapis sampah → buang duplikat → jana bil → kira nilai terbitan ──
    const dilihatSawit = new Set<string>();
    const sawitRows = sawit
      .filter(namaSah)
      .filter((p: any) => {
        const k = kunciNama(p.nama);
        if (dilihatSawit.has(k)) return false;
        dilihatSawit.add(k);
        return true;
      })
      .map((p: any, i: number) => {
        const luas = Number(p.luas_hek) || 0;
        const hasil = Number(p.hasil_mt) || 0;
        const matlamat = Number(p.matlamat_setahun) || 0;
        return {
          kod_bulan,
          nama_bulan,
          jenis: "sawit",
          pol_pn: bersihkanNama(p.pol_pn),
          bil: i + 1,
          nama: bersihkanNama(p.nama),
          peserta: Number(p.peserta) || 0,
          luas_hek: luas,
          luas_operasi: Number(p.luas_dituai) || 0,
          hasil,
          hasil_per_hek: luas > 0 ? Number((hasil / luas).toFixed(2)) : 0,
          matlamat_setahun: matlamat,
          pct_setahun: matlamat > 0 ? Number(((hasil / matlamat) * 100).toFixed(1)) : 0,
          pendapatan: Number(p.pendapatan) || 0,
          kos: Number(p.kos) || 0,
          untung_rugi: Number(p.untung_rugi) || 0,
        };
      });

    // ── Getah: logik sama ──
    const dilihatGetah = new Set<string>();
    const getahRows = getah
      .filter(namaSah)
      .filter((p: any) => {
        const k = kunciNama(p.nama);
        if (dilihatGetah.has(k)) return false;
        dilihatGetah.add(k);
        return true;
      })
      .map((p: any, i: number) => {
        const luas = Number(p.luas_hek) || 0;
        const hasil = Number(p.hasil_kg) || 0;
        const matlamat = Number(p.matlamat_setahun) || 0;
        return {
          kod_bulan,
          nama_bulan,
          jenis: "getah",
          pol_pn: bersihkanNama(p.pol_pn),
          bil: i + 1,
          nama: bersihkanNama(p.nama),
          peserta: Number(p.peserta) || 0,
          luas_hek: luas,
          luas_operasi: Number(p.luas_ditoreh) || 0,
          hasil,
          hasil_per_hek: luas > 0 ? Number((hasil / luas).toFixed(2)) : 0,
          matlamat_setahun: matlamat,
          pct_setahun: matlamat > 0 ? Number(((hasil / matlamat) * 100).toFixed(1)) : 0,
          pendapatan: Number(p.pendapatan) || 0,
          kos: Number(p.kos) || 0,
          untung_rugi: Number(p.untung_rugi) || 0,
        };
      });

    const dibuang =
      (sawit.length - sawitRows.length) + (getah.length - getahRows.length);

    // Upsert sawit
    if (sawitRows.length > 0) {
      const { error: errSawit } = await supabase
        .from("hasil_bulanan")
        .upsert(sawitRows, { onConflict: "kod_bulan,jenis,nama" });
      if (errSawit) throw new Error(`Sawit upsert failed: ${errSawit.message}`);
    }

    // Upsert getah
    if (getahRows.length > 0) {
      const { error: errGetah } = await supabase
        .from("hasil_bulanan")
        .upsert(getahRows, { onConflict: "kod_bulan,jenis,nama" });
      if (errGetah) throw new Error(`Getah upsert failed: ${errGetah.message}`);
    }

    return NextResponse.json({
      success: true,
      message:
        `Berjaya import ${sawitRows.length} sawit + ${getahRows.length} getah` +
        (dibuang > 0 ? ` (${dibuang} baris tidak sah/duplikat dibuang)` : ""),
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

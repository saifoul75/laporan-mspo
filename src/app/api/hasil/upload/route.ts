import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    
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

    // Prepare upsert data
    const sawitRows = sawit.map((p: any) => ({
      kod_bulan,
      nama_bulan,
      jenis: "sawit",
      pol_pn: p.pol_pn || "",
      bil: p.bil || 0,
      nama: p.nama || "",
      peserta: p.peserta || 0,
      luas_hek: p.luas_hek || 0,
      luas_operasi: p.luas_dituai || 0,
      hasil: p.hasil_mt || 0,
      hasil_per_hek: p.mtan_hek || 0,
      matlamat_setahun: p.matlamat_setahun || 0,
      pct_setahun: p.pct_setahun || 0,
      pendapatan: p.pendapatan || 0,
      kos: p.kos || 0,
      untung_rugi: p.untung_rugi || 0,
    }));

    const getahRows = getah.map((p: any) => ({
      kod_bulan,
      nama_bulan,
      jenis: "getah",
      pol_pn: p.pol_pn || "",
      bil: p.bil || 0,
      nama: p.nama || "",
      peserta: p.peserta || 0,
      luas_hek: p.luas_hek || 0,
      luas_operasi: p.luas_ditoreh || 0,
      hasil: p.hasil_kg || 0,
      hasil_per_hek: p.kg_hek || 0,
      matlamat_setahun: p.matlamat_setahun || 0,
      pct_setahun: p.pct_setahun || 0,
      pendapatan: p.pendapatan || 0,
      kos: p.kos || 0,
      untung_rugi: p.untung_rugi || 0,
    }));

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
      message: `Berjaya import ${sawitRows.length} sawit + ${getahRows.length} getah` 
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

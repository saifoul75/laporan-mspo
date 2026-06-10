-- Migration 0018: Kongsi laporan awam (public share link)
-- Tambah token_kongsi dan kongsi_aktif ke jadual laporan.
-- Token digunakan untuk berkongsi laporan kepada pihak luar TANPA log masuk.

-- ============================================================
-- 1. TAMBAH LAJUR BARU
-- ============================================================

ALTER TABLE public.laporan
  ADD COLUMN IF NOT EXISTS token_kongsi TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS kongsi_aktif BOOLEAN NOT NULL DEFAULT FALSE;

-- Index untuk carian cepat token → laporan
CREATE UNIQUE INDEX IF NOT EXISTS idx_laporan_token_kongsi
  ON public.laporan (token_kongsi)
  WHERE token_kongsi IS NOT NULL;

-- ============================================================
-- 2. RLS — AKSES BACA AWAM (ANON) VIA TOKEN
-- ============================================================
-- Nota: Semua polisi sedia ada untuk pengguna log masuk DIKEKALKAN.
-- Polisi baharu ini HANYA membenarkan SELECT oleh peranan 'anon'
-- apabila token_kongsi sah dan kongsi_aktif = true.
-- Ini tidak melemahkan mana-mana laluan yang memerlukan auth.

-- laporan: anon boleh baca SATU baris kalau token betul dan aktif
CREATE POLICY "Baca laporan kongsi awam"
  ON public.laporan
  FOR SELECT
  TO anon
  USING (kongsi_aktif = TRUE AND token_kongsi IS NOT NULL);

-- audit: anon boleh baca audit yang mempunyai laporan kongsi aktif
CREATE POLICY "Baca audit untuk laporan kongsi awam"
  ON public.audit
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.laporan l
      WHERE l.audit_id = audit.id
        AND l.kongsi_aktif = TRUE
        AND l.token_kongsi IS NOT NULL
    )
  );

-- dapatan: anon boleh baca dapatan untuk audit yang dikongsi
CREATE POLICY "Baca dapatan untuk laporan kongsi awam"
  ON public.dapatan
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.laporan l
      WHERE l.audit_id = dapatan.audit_id
        AND l.kongsi_aktif = TRUE
        AND l.token_kongsi IS NOT NULL
    )
  );

-- pusat_operasi: anon boleh baca PO yang terlibat dalam audit yang dikongsi
CREATE POLICY "Baca pusat operasi untuk laporan kongsi awam"
  ON public.pusat_operasi
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.audit a
      JOIN public.laporan l ON l.audit_id = a.id
      WHERE a.pusat_operasi_id = pusat_operasi.id
        AND l.kongsi_aktif = TRUE
        AND l.token_kongsi IS NOT NULL
    )
  );

-- pengguna: anon boleh baca nama auditor (nama_penuh sahaja) untuk laporan dikongsi
-- Terhad kepada lead_auditor_id dan auditor_ids dalam audit yang dikongsi
CREATE POLICY "Baca nama auditor untuk laporan kongsi awam"
  ON public.pengguna
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.audit a
      JOIN public.laporan l ON l.audit_id = a.id
      WHERE (a.lead_auditor_id = pengguna.id OR pengguna.id = ANY(a.auditor_ids))
        AND l.kongsi_aktif = TRUE
        AND l.token_kongsi IS NOT NULL
    )
  );

-- ============================================================
-- 3. RLS — KEMAS KINI TOKEN (PENGGUNA LOG MASUK SAHAJA)
-- ============================================================
-- Polisi "Lead urus laporan" sedia ada dalam 0001_skema_asas.sql
-- sudah merangkumi UPDATE untuk admin dan lead_auditor.
-- Tiada perubahan diperlukan di sini.

-- ============================================================
-- SEMAKAN AKHIR
-- ============================================================
-- Pastikan RLS masih aktif pada semua jadual yang terkesan
-- (sepatutnya sudah aktif sejak migration 0001):
-- ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;    -- sedia ada
-- ALTER TABLE public.audit ENABLE ROW LEVEL SECURITY;      -- sedia ada
-- ALTER TABLE public.dapatan ENABLE ROW LEVEL SECURITY;    -- sedia ada
-- ALTER TABLE public.pusat_operasi ENABLE ROW LEVEL SECURITY; -- sedia ada
-- ALTER TABLE public.pengguna ENABLE ROW LEVEL SECURITY;   -- sedia ada

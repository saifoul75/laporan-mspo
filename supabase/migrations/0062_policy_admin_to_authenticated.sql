BEGIN;

DROP POLICY "Admin urus bank jawapan" ON public.bank_jawapan;
CREATE POLICY "Admin urus bank jawapan"
  ON public.bank_jawapan
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus fail" ON public.fail_kulit_keras;
CREATE POLICY "Admin urus fail"
  ON public.fail_kulit_keras
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus item" ON public.item_semakan;
CREATE POLICY "Admin urus item"
  ON public.item_semakan
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus kriteria" ON public.kriteria;
CREATE POLICY "Admin urus kriteria"
  ON public.kriteria
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus prinsip" ON public.prinsip;
CREATE POLICY "Admin urus prinsip"
  ON public.prinsip
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus seksyen" ON public.seksyen_fail;
CREATE POLICY "Admin urus seksyen"
  ON public.seksyen_fail
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (rol_semasa() = 'admin'::rol_pengguna);

-- checksum dry-run (BUKAN bukti persistence)
SELECT tablename, policyname, permissive, roles::text, cmd, qual,
       COALESCE(with_check, '(NULL)') AS with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'Admin urus%'
ORDER BY tablename;

SELECT tablename, policyname, roles::text, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'Auth boleh baca%'
ORDER BY tablename;

COMMIT;

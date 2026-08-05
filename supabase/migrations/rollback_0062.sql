BEGIN;

DROP POLICY "Admin urus bank jawapan" ON public.bank_jawapan;
CREATE POLICY "Admin urus bank jawapan"
  ON public.bank_jawapan
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus fail" ON public.fail_kulit_keras;
CREATE POLICY "Admin urus fail"
  ON public.fail_kulit_keras
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus item" ON public.item_semakan;
CREATE POLICY "Admin urus item"
  ON public.item_semakan
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus kriteria" ON public.kriteria;
CREATE POLICY "Admin urus kriteria"
  ON public.kriteria
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus prinsip" ON public.prinsip;
CREATE POLICY "Admin urus prinsip"
  ON public.prinsip
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (rol_semasa() = 'admin'::rol_pengguna);

DROP POLICY "Admin urus seksyen" ON public.seksyen_fail;
CREATE POLICY "Admin urus seksyen"
  ON public.seksyen_fail
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (rol_semasa() = 'admin'::rol_pengguna);

COMMIT;

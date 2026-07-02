--
-- PostgreSQL database dump
--

\restrict vNceY5WZk8sX2cFfdD7hsqp0EqVvO85AgCcHzhFbN8eSwnSZaAcH9RsmmcaZl98

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: cap_grade_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cap_grade_source AS ENUM (
    'auto_highest_finding',
    'manual_lead_auditor'
);


--
-- Name: gred_nc; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gred_nc AS ENUM (
    'major',
    'minor'
);


--
-- Name: jenis_audit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.jenis_audit AS ENUM (
    'audit_dalaman',
    'audit_pensijilan',
    'audit_pengawasan',
    'audit_persijilan_semula'
);


--
-- Name: jenis_bukti; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.jenis_bukti AS ENUM (
    'gambar',
    'dokumen'
);


--
-- Name: jenis_klausa; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.jenis_klausa AS ENUM (
    'major',
    'minor'
);


--
-- Name: rol_pengguna; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_pengguna AS ENUM (
    'admin',
    'lead_auditor',
    'auditor',
    'po_user'
);


--
-- Name: status_audit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_audit AS ENUM (
    'draf',
    'dijadual',
    'sedang_dijalankan',
    'menunggu_semakan',
    'selesai',
    'dibatalkan'
);


--
-- Name: status_dapatan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_dapatan AS ENUM (
    'Y',
    'N',
    'NC',
    'OFI',
    'NA',
    'Pending'
);


--
-- Name: status_nc; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_nc AS ENUM (
    'open',
    'in_progress',
    'closed',
    'verified'
);


--
-- Name: status_ofi; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_ofi AS ENUM (
    'kiv_kuning',
    'open',
    'tutup'
);


--
-- Name: audit_ada_kongsi(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_ada_kongsi(p_audit_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.laporan l
    WHERE l.audit_id = p_audit_id
      AND l.kongsi_aktif = TRUE
      AND l.token_kongsi IS NOT NULL
  );
$$;


--
-- Name: auditor_ada_kongsi(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auditor_ada_kongsi(p_pengguna_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.audit a
    JOIN public.laporan l ON l.audit_id = a.id
    WHERE (a.lead_auditor_id = p_pengguna_id OR p_pengguna_id = ANY(a.auditor_ids))
      AND l.kongsi_aktif = TRUE
      AND l.token_kongsi IS NOT NULL
  );
$$;


--
-- Name: fn_ada_laporan_kongsi(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ada_laporan_kongsi(p_audit_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.laporan l
    WHERE l.audit_id = p_audit_id
      AND l.kongsi_aktif = TRUE
      AND l.token_kongsi IS NOT NULL
  );
$$;


--
-- Name: fn_kira_cap_due_date(public.gred_nc, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kira_cap_due_date(gred public.gred_nc, tarikh_asal date) RETURNS date
    LANGUAGE sql IMMUTABLE
    AS $$
  select case
    when gred = 'major' then (tarikh_asal + interval '30 days')::date
    when gred = 'minor' then (tarikh_asal + interval '90 days')::date
    else null
  end;
$$;


--
-- Name: FUNCTION fn_kira_cap_due_date(gred public.gred_nc, tarikh_asal date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_kira_cap_due_date(gred public.gred_nc, tarikh_asal date) IS 'Kira tarikh akhir CAP ikut MSPO: Major +30 hari, Minor +90 hari kalendar.';


--
-- Name: fn_kira_gred_basis(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kira_gred_basis(p_audit_id uuid) RETURNS public.gred_nc
    LANGUAGE sql STABLE
    AS $$
  -- Major mengatasi Minor. Kalau tiada NC, pulang NULL (no CAP needed).
  select case
    when exists (
      select 1 from public.dapatan
       where audit_id = p_audit_id
         and status = 'NC'
         and gred_nc = 'major'
    ) then 'major'::gred_nc
    when exists (
      select 1 from public.dapatan
       where audit_id = p_audit_id
         and status = 'NC'
         and gred_nc = 'minor'
    ) then 'minor'::gred_nc
    else null
  end;
$$;


--
-- Name: FUNCTION fn_kira_gred_basis(p_audit_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_kira_gred_basis(p_audit_id uuid) IS 'Pulang gred tertinggi (major > minor > null) berdasarkan dapatan NC audit.';


--
-- Name: fn_lock_audit_muktamad(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_lock_audit_muktamad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  v_gred gred_nc;
begin
  -- Hanya proses bila tarikh_muktamad baru diisi (transition null -> not null)
  if new.tarikh_muktamad is not null
     and (old.tarikh_muktamad is null or old.tarikh_muktamad <> new.tarikh_muktamad)
  then
    -- (a) Tetapkan source default = auto kalau belum diset
    if new.cap_grade_source is null then
      new.cap_grade_source := 'auto_highest_finding';
    end if;

    -- (b) Kalau source = auto, kira gred dari dapatan
    if new.cap_grade_source = 'auto_highest_finding' then
      v_gred := public.fn_kira_gred_basis(new.id);
      new.cap_grade_basis := v_gred;
    end if;

    -- (c) Kira cap_due_date berdasarkan basis (NULL kalau no NC)
    if new.cap_grade_basis is not null then
      new.cap_due_date := public.fn_kira_cap_due_date(
        new.cap_grade_basis,
        (new.tarikh_muktamad)::date
      );
      new.cap_due_days := case new.cap_grade_basis
        when 'major' then 30
        when 'minor' then 90
      end;
    else
      new.cap_due_date := null;
      new.cap_due_days := null;
    end if;

    -- (d) Auto-transition status (kecuali sudah selesai/batal)
    if new.status not in ('selesai', 'dibatalkan') then
      new.status := 'menunggu_semakan';
    end if;
  end if;

  return new;
end;
$$;


--
-- Name: handle_audit_baru(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_audit_baru() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  perform public.prefill_dapatan_audit(new.id);
  return new;
end;
$$;


--
-- Name: handle_dapatan_perubahan(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_dapatan_perubahan() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_item record;
  v_prinsip_kod text;
  v_tahun int;
  v_no_baru text;
begin
  -- Skip kalau status sama dengan sebelumnya
  if tg_op = 'UPDATE' and old.status = new.status and coalesce(old.gred_nc, 'minor') = coalesce(new.gred_nc, 'minor') then
    return new;
  end if;

  -- Ambil maklumat klausa & prinsip
  select i.kod, i.fail_rujukan, p.kod as prinsip_kod
  into v_item
  from public.item_semakan i
  join public.kriteria k on k.id = i.kriteria_id
  join public.prinsip p on p.id = k.prinsip_id
  where i.id = new.item_semakan_id;

  v_prinsip_kod := v_item.prinsip_kod;
  v_tahun := extract(year from now());

  -- =====================================================
  -- KENDALI NC
  -- =====================================================
  if new.status = 'NC' then
    -- Update sedia ada atau cipta baru
    if exists (select 1 from public.nc where dapatan_id = new.id) then
      update public.nc
      set
        klausa_kod = v_item.kod,
        prinsip_kod = v_prinsip_kod,
        fail_rujukan = v_item.fail_rujukan,
        dapatan = coalesce(new.catatan, '(Catatan belum diisi)'),
        bukti = new.bukti_audit,
        punca_akar = new.punca_akar,
        tindakan_pembetulan = new.cadangan_tindakan,
        pic = new.pic,
        tarikh_siap = new.tarikh_siap_target,
        gred = coalesce(new.gred_nc, 'minor')
      where dapatan_id = new.id;
    else
      v_no_baru := public.jana_no_rujukan('NC', v_tahun);
      insert into public.nc (
        no_nc, audit_id, dapatan_id, klausa_kod, prinsip_kod, fail_rujukan,
        dapatan, bukti, punca_akar, tindakan_pembetulan,
        pic, tarikh_siap, gred, status
      ) values (
        v_no_baru, new.audit_id, new.id, v_item.kod, v_prinsip_kod, v_item.fail_rujukan,
        coalesce(new.catatan, '(Catatan belum diisi)'),
        new.bukti_audit, new.punca_akar, new.cadangan_tindakan,
        new.pic, new.tarikh_siap_target,
        coalesce(new.gred_nc, 'minor'), 'open'
      );
    end if;
  else
    -- Status bukan NC - padam rekod NC kalau ada (auditor tukar status)
    delete from public.nc where dapatan_id = new.id;
  end if;

  -- =====================================================
  -- KENDALI OFI
  -- =====================================================
  if new.status = 'OFI' then
    if exists (select 1 from public.ofi where dapatan_id = new.id) then
      update public.ofi
      set
        klausa_kod = v_item.kod,
        fail_rujukan = v_item.fail_rujukan,
        pemerhatian = coalesce(new.catatan, '(Pemerhatian belum diisi)'),
        cadangan = new.cadangan_tindakan,
        pic = new.pic
      where dapatan_id = new.id;
    else
      v_no_baru := public.jana_no_rujukan('OFI', v_tahun);
      insert into public.ofi (
        no_ofi, audit_id, dapatan_id, klausa_kod, fail_rujukan,
        pemerhatian, cadangan, pic, status
      ) values (
        v_no_baru, new.audit_id, new.id, v_item.kod, v_item.fail_rujukan,
        coalesce(new.catatan, '(Pemerhatian belum diisi)'),
        new.cadangan_tindakan, new.pic, 'kiv_kuning'
      );
    end if;
  else
    delete from public.ofi where dapatan_id = new.id;
  end if;

  return new;
end;
$$;


--
-- Name: handle_pengguna_baru(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_pengguna_baru() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.pengguna (id, email, nama_penuh, rol)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'nama_penuh', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'rol')::rol_pengguna, 'auditor')
  );
  return new;
end; $$;


--
-- Name: jana_no_rujukan(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jana_no_rujukan(p_jenis text, p_tahun integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
declare
  v_count int;
  v_prefix text;
begin
  if p_jenis = 'NC' then
    v_prefix := 'NC';
    v_count := nextval('seq_no_nc');
  elsif p_jenis = 'OFI' then
    v_prefix := 'OFI';
    v_count := nextval('seq_no_ofi');
  else
    raise exception 'Jenis tidak sah: %', p_jenis;
  end if;
  return v_prefix || '-' || lpad(v_count::text, 3, '0') || '-' || p_tahun;
end;
$$;


--
-- Name: log_audit_aktiviti(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit_aktiviti() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_jenis text;
  v_rangkuman text;
begin
  if tg_op = 'INSERT' then
    v_jenis := 'cipta';
    v_rangkuman := 'Audit ' || new.no_rujukan || ' dicipta (Status: ' || new.status || ')';
  elsif tg_op = 'UPDATE' then
    if old.status <> new.status then
      v_jenis := 'tukar_status';
      v_rangkuman := 'Status ' || new.no_rujukan || ' ditukar: ' || old.status || ' → ' || new.status;
    else
      v_jenis := 'kemaskini';
      v_rangkuman := 'Audit ' || new.no_rujukan || ' dikemaskini';
    end if;
  elsif tg_op = 'DELETE' then
    v_jenis := 'padam';
    v_rangkuman := 'Audit ' || old.no_rujukan || ' dipadam';
  end if;

  begin
    insert into public.aktiviti (audit_id, jenis, entiti, rangkuman)
    values (
      case when tg_op = 'DELETE' then old.id else new.id end,
      v_jenis,
      'audit',
      v_rangkuman
    );
  exception
    when foreign_key_violation then
      insert into public.aktiviti (audit_id, jenis, entiti, rangkuman)
      values (null, v_jenis, 'audit', v_rangkuman);
  end;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


--
-- Name: log_dapatan_aktiviti(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_dapatan_aktiviti() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_jenis text;
  v_rangkuman text;
  v_audit_id uuid;
begin
  v_audit_id := case when tg_op = 'DELETE' then old.audit_id else new.audit_id end;

  if tg_op = 'INSERT' then
    v_jenis := 'cipta';
    v_rangkuman := 'Dapatan baru: Status ' || new.status;
  elsif tg_op = 'UPDATE' then
    if old.status <> new.status then
      v_jenis := 'kemaskini';
      v_rangkuman := 'Status dapatan ditukar: ' || old.status || ' → ' || new.status;
    else
      v_jenis := 'kemaskini';
      v_rangkuman := 'Dapatan dikemaskini (Status: ' || new.status || ')';
    end if;
  elsif tg_op = 'DELETE' then
    v_jenis := 'padam';
    v_rangkuman := 'Dapatan dipadam';
  end if;

  -- Cuba insert dengan audit_id sebenar; kalau FK fail (cascade delete
  -- dari audit), fallback insert dengan audit_id = NULL.
  begin
    insert into public.aktiviti (audit_id, jenis, entiti, rangkuman)
    values (v_audit_id, v_jenis, 'dapatan', v_rangkuman);
  exception
    when foreign_key_violation then
      insert into public.aktiviti (audit_id, jenis, entiti, rangkuman)
      values (null, v_jenis, 'dapatan', v_rangkuman || ' (audit dipadam)');
  end;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


--
-- Name: po_ada_kongsi(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.po_ada_kongsi(p_po_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.audit a
    JOIN public.laporan l ON l.audit_id = a.id
    WHERE a.pusat_operasi_id = p_po_id
      AND l.kongsi_aktif = TRUE
      AND l.token_kongsi IS NOT NULL
  );
$$;


--
-- Name: prefill_dapatan_audit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prefill_dapatan_audit(p_audit_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_diaudit_oleh uuid;
  v_count int;
begin
  -- Ambil lead_auditor sebagai 'diaudit_oleh' default
  select lead_auditor_id into v_diaudit_oleh from public.audit where id = p_audit_id;
  if v_diaudit_oleh is null then
    raise exception 'Audit % tidak dijumpai', p_audit_id;
  end if;

  insert into public.dapatan (
    audit_id, item_semakan_id, status, catatan, diaudit_oleh
  )
  select
    p_audit_id,
    i.id,
    i.status_default,
    i.catatan_default,
    v_diaudit_oleh
  from public.item_semakan i
  where i.status_default is not null
  on conflict (audit_id, item_semakan_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


--
-- Name: rol_semasa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rol_semasa() RETURNS public.rol_pengguna
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select rol from public.pengguna where id = auth.uid();
$$;


--
-- Name: set_dikemaskini_pada(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_dikemaskini_pada() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.dikemaskini_pada = now(); return new; end; $$;


--
-- Name: trg_hasil_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_hasil_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO hasil_audit(op,tahun,bulan,nama_projek,jenis,pusat_operasi_final,hasil_lama,hasil_baru)
    VALUES ('INSERT',NEW.tahun,NEW.bulan,NEW.nama_projek,NEW.jenis,NEW.pusat_operasi_final,NULL,NEW.hasil);
  ELSIF TG_OP = 'UPDATE' AND NEW.hasil IS DISTINCT FROM OLD.hasil THEN
    INSERT INTO hasil_audit(op,tahun,bulan,nama_projek,jenis,pusat_operasi_final,hasil_lama,hasil_baru)
    VALUES ('UPDATE',NEW.tahun,NEW.bulan,NEW.nama_projek,NEW.jenis,NEW.pusat_operasi_final,OLD.hasil,NEW.hasil);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO hasil_audit(op,tahun,bulan,nama_projek,jenis,pusat_operasi_final,hasil_lama,hasil_baru)
    VALUES ('DELETE',OLD.tahun,OLD.bulan,OLD.nama_projek,OLD.jenis,OLD.pusat_operasi_final,OLD.hasil,NULL);
  END IF;
  RETURN COALESCE(NEW,OLD);
END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _bak_hasil_bulanan_final; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_hasil_bulanan_final (
    id bigint,
    tahun integer,
    bulan integer,
    jenis text,
    pol_pn text,
    nama text,
    peserta integer,
    luas_hek numeric,
    luas_operasi numeric,
    unit text,
    kod_bulan text,
    nama_bulan text,
    wilayah text,
    hasil numeric
);


--
-- Name: aktiviti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aktiviti (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid,
    pengguna_id uuid,
    pengguna_nama text,
    pengguna_rol text,
    jenis text NOT NULL,
    entiti text NOT NULL,
    rangkuman text,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: arkib_hasil_pra2023; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arkib_hasil_pra2023 (
    pusat_operasi text,
    pusat_operasi_master text,
    pusat_operasi_final text,
    wilayah text,
    negeri text,
    kategori_master text,
    nama_projek text,
    luas_kawasan_hek double precision,
    luas_produktif_hek double precision,
    bulan bigint,
    bulan_nama text,
    hasil double precision,
    unit text,
    in_master_2026 boolean,
    kod_bulan bigint
);


--
-- Name: audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    no_rujukan text NOT NULL,
    pusat_operasi_id uuid NOT NULL,
    lead_auditor_id uuid NOT NULL,
    auditor_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    tarikh_audit date NOT NULL,
    tarikh_tamat date,
    jenis_audit public.jenis_audit DEFAULT 'audit_dalaman'::public.jenis_audit NOT NULL,
    status public.status_audit DEFAULT 'draf'::public.status_audit NOT NULL,
    catatan text,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL,
    dikemaskini_pada timestamp with time zone DEFAULT now() NOT NULL,
    sesi_id uuid,
    planned_start_date date,
    planned_end_date date,
    tarikh_muktamad timestamp with time zone,
    cap_due_date date,
    cap_due_days integer,
    cap_grade_basis public.gred_nc,
    cap_grade_source public.cap_grade_source,
    cap_grade_override_reason text,
    cap_grade_overridden_by uuid,
    cap_grade_overridden_at timestamp with time zone,
    notif_cap_15_pada timestamp with time zone,
    notif_cap_25_pada timestamp with time zone,
    notif_cap_30_pada timestamp with time zone,
    notif_cap_bulanan_terakhir_pada timestamp with time zone,
    CONSTRAINT chk_cap_manual_override_lengkap CHECK (((cap_grade_source IS NULL) OR (cap_grade_source = 'auto_highest_finding'::public.cap_grade_source) OR ((cap_grade_source = 'manual_lead_auditor'::public.cap_grade_source) AND (cap_grade_override_reason IS NOT NULL) AND (cap_grade_overridden_by IS NOT NULL) AND (cap_grade_overridden_at IS NOT NULL))))
);


--
-- Name: sesi_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesi_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_sesi text NOT NULL,
    wilayah text NOT NULL,
    tarikh_mula date NOT NULL,
    tarikh_tamat date NOT NULL,
    catatan text,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL,
    dikemaskini_pada timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sesi_audit_check CHECK ((tarikh_tamat >= tarikh_mula))
);


--
-- Name: audit_status_live; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.audit_status_live WITH (security_invoker='true') AS
 SELECT a.id AS audit_id,
    a.no_rujukan,
    a.status AS status_db,
    COALESCE(a.planned_start_date, s.tarikh_mula, a.tarikh_audit) AS start_date_live,
    COALESCE(a.planned_end_date, s.tarikh_tamat, a.tarikh_tamat, a.tarikh_audit) AS end_date_live,
    a.tarikh_muktamad,
    a.cap_due_date,
    a.cap_due_days,
    a.cap_grade_basis,
    a.cap_grade_source,
        CASE
            WHEN (a.status = 'selesai'::public.status_audit) THEN 'Completed'::text
            WHEN (a.status = 'dibatalkan'::public.status_audit) THEN 'Cancelled'::text
            WHEN (a.status = 'menunggu_semakan'::public.status_audit) THEN 'Pending CAP'::text
            WHEN (a.status = 'draf'::public.status_audit) THEN 'Draft'::text
            WHEN (CURRENT_DATE < COALESCE(a.planned_start_date, s.tarikh_mula, a.tarikh_audit)) THEN 'Scheduled'::text
            WHEN ((CURRENT_DATE >= COALESCE(a.planned_start_date, s.tarikh_mula, a.tarikh_audit)) AND (CURRENT_DATE <= COALESCE(a.planned_end_date, s.tarikh_tamat, a.tarikh_tamat, a.tarikh_audit))) THEN 'On-Site Evaluation'::text
            ELSE 'Awaiting Closing'::text
        END AS status_display_en,
        CASE
            WHEN ((a.cap_due_date IS NOT NULL) AND (a.status = 'menunggu_semakan'::public.status_audit)) THEN (a.cap_due_date - CURRENT_DATE)
            ELSE NULL::integer
        END AS cap_baki_hari
   FROM (public.audit a
     LEFT JOIN public.sesi_audit s ON ((s.id = a.sesi_id)));


--
-- Name: VIEW audit_status_live; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.audit_status_live IS 'Paparan status audit live (English) + baki hari CAP. Patuh RLS pemanggil (security_invoker).';


--
-- Name: bank_jawapan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_jawapan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    klausa_kod text NOT NULL,
    status text NOT NULL,
    catatan_bukti text,
    tindakan_pembetulan text,
    dokumen_bukti_wajib text,
    semakan_tapak text,
    panduan_na text,
    punca_akar text
);


--
-- Name: bukti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bukti (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dapatan_id uuid NOT NULL,
    jenis public.jenis_bukti DEFAULT 'gambar'::public.jenis_bukti NOT NULL,
    url_storan text NOT NULL,
    nama_fail text NOT NULL,
    saiz_bait bigint,
    latitud double precision,
    longitud double precision,
    dimuat_naik_oleh uuid,
    dimuat_naik_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crosswalk_daerah_po; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crosswalk_daerah_po (
    daerah_asal text NOT NULL,
    pusat_operasi text,
    wilayah text
);


--
-- Name: dapatan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dapatan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid NOT NULL,
    item_semakan_id uuid NOT NULL,
    status public.status_dapatan DEFAULT 'Pending'::public.status_dapatan NOT NULL,
    gred_nc public.gred_nc,
    catatan text,
    bukti_audit text,
    punca_akar text,
    cadangan_tindakan text,
    tarikh_siap_target date,
    pic text,
    latitud double precision,
    longitud double precision,
    ketepatan_gps numeric(8,2),
    diaudit_oleh uuid NOT NULL,
    dirakam_pada timestamp with time zone DEFAULT now() NOT NULL,
    dikemaskini_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fail_kulit_keras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fail_kulit_keras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombor integer NOT NULL,
    nama text NOT NULL,
    ringkasan text,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fail_kulit_keras_nombor_check CHECK (((nombor >= 1) AND (nombor <= 13)))
);


--
-- Name: hasil_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hasil_audit (
    id bigint NOT NULL,
    changed_at timestamp with time zone DEFAULT now(),
    op text,
    tahun integer,
    bulan integer,
    nama_projek text,
    jenis text,
    pusat_operasi_final text,
    hasil_lama numeric,
    hasil_baru numeric
);


--
-- Name: hasil_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hasil_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hasil_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hasil_audit_id_seq OWNED BY public.hasil_audit.id;


--
-- Name: hasil_bulanan_src; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hasil_bulanan_src (
    id bigint NOT NULL,
    tahun integer NOT NULL,
    jenis text NOT NULL,
    kategori text,
    pusat_operasi text NOT NULL,
    pusat_operasi_master text,
    pusat_operasi_final text,
    wilayah text,
    kategori_master text,
    nama_projek text NOT NULL,
    luas_kawasan_hek numeric,
    luas_produktif_hek numeric,
    bilangan_peserta integer,
    bulan integer NOT NULL,
    bulan_nama text,
    hasil numeric NOT NULL,
    unit text NOT NULL,
    in_master_2026 boolean DEFAULT false,
    kod_bulan text GENERATED ALWAYS AS (lpad((bulan)::text, 2, '0'::text)) STORED,
    negeri text,
    CONSTRAINT hasil_bulanan_bulan_check CHECK (((bulan >= 1) AND (bulan <= 12))),
    CONSTRAINT hasil_bulanan_jenis_check CHECK ((jenis = ANY (ARRAY['SAWIT'::text, 'GETAH'::text])))
);


--
-- Name: hasil_bulanan; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.hasil_bulanan AS
 WITH src AS (
         SELECT hasil_bulanan_src.id,
            hasil_bulanan_src.tahun,
            hasil_bulanan_src.bulan,
            lower(btrim(hasil_bulanan_src.jenis)) AS jenis,
            hasil_bulanan_src.nama_projek AS nama,
            hasil_bulanan_src.bilangan_peserta AS peserta,
            hasil_bulanan_src.luas_kawasan_hek AS luas_hek,
            hasil_bulanan_src.luas_produktif_hek AS luas_operasi,
            hasil_bulanan_src.unit,
            hasil_bulanan_src.hasil,
                CASE upper(btrim(hasil_bulanan_src.pusat_operasi))
                    WHEN 'ALOR GAJAH'::text THEN 'MELAKA'::text
                    WHEN 'MASJID TANAH'::text THEN 'MELAKA'::text
                    WHEN 'JASIN'::text THEN 'MELAKA'::text
                    WHEN 'MUAR'::text THEN 'JOHOR'::text
                    WHEN 'SEGAMAT'::text THEN 'JOHOR'::text
                    WHEN 'BUKIT KEPONG'::text THEN 'JOHOR'::text
                    WHEN 'GEMENCEH'::text THEN 'N.SEMBILAN'::text
                    WHEN 'REMBAU'::text THEN 'N.SEMBILAN'::text
                    WHEN 'SIK'::text THEN 'KEDAH'::text
                    WHEN 'SG.SIPUT'::text THEN 'KUALA KANGSAR'::text
                    WHEN 'LENGGONG'::text THEN 'GERIK'::text
                    WHEN 'BENTONG'::text THEN 'RAUB'::text
                    WHEN 'JERANTUT'::text THEN 'LIPIS'::text
                    ELSE upper(btrim(hasil_bulanan_src.pusat_operasi))
                END AS pol_pn
           FROM public.hasil_bulanan_src
          WHERE ((hasil_bulanan_src.pusat_operasi IS NOT NULL) AND (btrim(hasil_bulanan_src.pusat_operasi) <> ''::text) AND (upper(btrim(hasil_bulanan_src.pusat_operasi)) !~~ 'PAJAK%'::text))
        )
 SELECT id,
    tahun,
    bulan,
    jenis,
    pol_pn,
    nama,
    peserta,
    luas_hek,
    luas_operasi,
    unit,
    ((tahun || '-'::text) || lpad((bulan)::text, 2, '0'::text)) AS kod_bulan,
    ((
        CASE bulan
            WHEN 1 THEN 'Januari'::text
            WHEN 2 THEN 'Februari'::text
            WHEN 3 THEN 'Mac'::text
            WHEN 4 THEN 'April'::text
            WHEN 5 THEN 'Mei'::text
            WHEN 6 THEN 'Jun'::text
            WHEN 7 THEN 'Julai'::text
            WHEN 8 THEN 'Ogos'::text
            WHEN 9 THEN 'September'::text
            WHEN 10 THEN 'Oktober'::text
            WHEN 11 THEN 'November'::text
            WHEN 12 THEN 'Disember'::text
            ELSE NULL::text
        END || ' '::text) || tahun) AS nama_bulan,
        CASE
            WHEN (pol_pn = ANY (ARRAY['KEDAH'::text, 'KEDAH UTARA'::text, 'KEDAH SELATAN'::text, 'GERIK'::text, 'KUALA KANGSAR'::text, 'MANJUNG'::text, 'KG.GAJAH'::text, 'TAPAH'::text, 'SELAMA'::text, 'SELANGOR'::text])) THEN 'UTARA'::text
            WHEN (pol_pn = ANY (ARRAY['RAUB'::text, 'LIPIS'::text, 'TEMERLOH'::text, 'KUANTAN'::text, 'PEKAN'::text, 'ROMPIN'::text])) THEN 'TENGAH'::text
            WHEN (pol_pn = ANY (ARRAY['BESUT'::text, 'DUNGUN'::text, 'KUALA BERANG'::text, 'MACHANG'::text])) THEN 'TIMUR'::text
            WHEN (pol_pn = ANY (ARRAY['JOHOR'::text, 'MELAKA'::text, 'N.SEMBILAN'::text])) THEN 'SELATAN'::text
            ELSE NULL::text
        END AS wilayah,
    sum(hasil) OVER (PARTITION BY pol_pn, nama, jenis ORDER BY tahun, bulan ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS hasil
   FROM src;


--
-- Name: hasil_bulanan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.hasil_bulanan_src ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.hasil_bulanan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: hasil_harian; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hasil_harian (
    id bigint NOT NULL,
    tarikh date NOT NULL,
    tahun integer GENERATED ALWAYS AS ((EXTRACT(year FROM tarikh))::integer) STORED,
    bulan integer GENERATED ALWAYS AS ((EXTRACT(month FROM tarikh))::integer) STORED,
    pusat_operasi_final text NOT NULL,
    nama_projek text NOT NULL,
    jenis text NOT NULL,
    hasil numeric DEFAULT 0 NOT NULL,
    wilayah text
);


--
-- Name: hasil_harian_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.hasil_harian ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.hasil_harian_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: item_semakan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_semakan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kriteria_id uuid NOT NULL,
    kod text NOT NULL,
    tajuk text NOT NULL,
    bukti_wajib text,
    fail_rujukan integer,
    seksyen_fail text,
    jenis_klausa public.jenis_klausa DEFAULT 'minor'::public.jenis_klausa NOT NULL,
    ofi_default boolean DEFAULT false,
    catatan_default text,
    susunan integer DEFAULT 0 NOT NULL,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL,
    status_default public.status_dapatan,
    CONSTRAINT item_semakan_fail_rujukan_check CHECK (((fail_rujukan >= 1) AND (fail_rujukan <= 13)))
);


--
-- Name: kehadiran_opening_meeting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kehadiran_opening_meeting (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid NOT NULL,
    nama text NOT NULL,
    jawatan text NOT NULL,
    ditandatangan_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kriteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kriteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prinsip_id uuid NOT NULL,
    kod text NOT NULL,
    tajuk text NOT NULL,
    penerangan text,
    susunan integer DEFAULT 0 NOT NULL,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: laporan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laporan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid NOT NULL,
    url_pdf text,
    ringkasan_eksekutif text,
    jumlah_y integer DEFAULT 0 NOT NULL,
    jumlah_n integer DEFAULT 0 NOT NULL,
    jumlah_nc_major integer DEFAULT 0 NOT NULL,
    jumlah_nc_minor integer DEFAULT 0 NOT NULL,
    jumlah_ofi integer DEFAULT 0 NOT NULL,
    jumlah_na integer DEFAULT 0 NOT NULL,
    jumlah_pending integer DEFAULT 0 NOT NULL,
    dijana_oleh uuid,
    dijana_pada timestamp with time zone DEFAULT now() NOT NULL,
    token_kongsi text,
    kongsi_aktif boolean DEFAULT false NOT NULL
);


--
-- Name: matlamat_projek; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matlamat_projek (
    jenis text NOT NULL,
    bulan integer NOT NULL,
    peratus_agihan numeric NOT NULL,
    CONSTRAINT matlamat_projek_bulan_check CHECK (((bulan >= 1) AND (bulan <= 12))),
    CONSTRAINT matlamat_projek_jenis_check CHECK ((jenis = ANY (ARRAY['SAWIT'::text, 'GETAH'::text])))
);


--
-- Name: nc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nc (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    no_nc text NOT NULL,
    audit_id uuid NOT NULL,
    dapatan_id uuid NOT NULL,
    klausa_kod text NOT NULL,
    prinsip_kod text NOT NULL,
    fail_rujukan integer,
    rekod_terlibat text,
    dapatan text NOT NULL,
    bukti text,
    punca_akar text,
    tindakan_pembetulan text,
    pic text,
    tarikh_siap date,
    status public.status_nc DEFAULT 'open'::public.status_nc NOT NULL,
    gred public.gred_nc NOT NULL,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL,
    dikemaskini_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ofi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ofi (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    no_ofi text NOT NULL,
    audit_id uuid NOT NULL,
    dapatan_id uuid NOT NULL,
    klausa_kod text NOT NULL,
    fail_rujukan integer,
    pemerhatian text NOT NULL,
    cadangan text,
    pic text,
    status public.status_ofi DEFAULT 'kiv_kuning'::public.status_ofi NOT NULL,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL,
    dikemaskini_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pengguna; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengguna (
    id uuid NOT NULL,
    email text NOT NULL,
    nama_penuh text NOT NULL,
    no_telefon text,
    rol public.rol_pengguna DEFAULT 'auditor'::public.rol_pengguna NOT NULL,
    pusat_operasi_id uuid,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL,
    dikemaskini_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: po_wilayah; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_wilayah (
    pusat_operasi text NOT NULL,
    wilayah text
);


--
-- Name: prinsip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prinsip (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombor integer NOT NULL,
    kod text NOT NULL,
    tajuk text NOT NULL,
    fokus_utama text,
    bil_klausa integer,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prinsip_nombor_check CHECK (((nombor >= 1) AND (nombor <= 5)))
);


--
-- Name: projek_master_2026; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projek_master_2026 (
    jenis text NOT NULL,
    kategori text,
    pusat_operasi text NOT NULL,
    nama_projek text NOT NULL,
    luas_kawasan_hek numeric,
    luas_produktif_hek numeric,
    bilangan_peserta integer,
    CONSTRAINT projek_master_2026_jenis_check CHECK ((jenis = ANY (ARRAY['SAWIT'::text, 'GETAH'::text])))
);


--
-- Name: projek_penyelia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projek_penyelia (
    projek text NOT NULL,
    penyelia text
);


--
-- Name: projek_ref; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projek_ref (
    id bigint NOT NULL,
    tahun integer NOT NULL,
    wilayah text NOT NULL,
    po text NOT NULL,
    projek text NOT NULL,
    jenis text NOT NULL,
    luas_kawasan numeric,
    luas_berhasil numeric,
    bil_peserta integer,
    sasaran_tahunan numeric,
    CONSTRAINT projek_ref_jenis_check CHECK ((jenis = ANY (ARRAY['SAWIT'::text, 'GETAH'::text])))
);


--
-- Name: projek_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projek_ref_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projek_ref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projek_ref_id_seq OWNED BY public.projek_ref.id;


--
-- Name: pusat_operasi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pusat_operasi (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kod text NOT NULL,
    nama text NOT NULL,
    wilayah text NOT NULL,
    alamat text,
    daerah text,
    negeri text,
    keluasan_hektar numeric(10,2),
    latitud double precision,
    longitud double precision,
    dicipta_pada timestamp with time zone DEFAULT now() NOT NULL,
    dikemaskini_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: qc_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qc_log (
    id integer NOT NULL,
    tarikh timestamp with time zone DEFAULT now(),
    bil_baru integer DEFAULT 0,
    bil_update integer DEFAULT 0,
    bil_delete integer DEFAULT 0,
    detail jsonb DEFAULT '[]'::jsonb
);


--
-- Name: TABLE qc_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.qc_log IS 'Rekod harian perubahan hasil (INSERT/UPDATE/DELETE dari hasil_audit)';


--
-- Name: qc_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qc_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qc_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qc_log_id_seq OWNED BY public.qc_log.id;


--
-- Name: seksyen_fail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seksyen_fail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fail_id uuid NOT NULL,
    kod text NOT NULL,
    nama text NOT NULL,
    susunan integer DEFAULT 0 NOT NULL
);


--
-- Name: seq_no_nc; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_no_nc
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_no_ofi; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_no_ofi
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: v_bulanan; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_bulanan WITH (security_invoker='false') AS
 SELECT s.id,
    s.tahun,
    s.bulan,
    s.bulan_nama,
    s.kod_bulan,
    s.jenis,
    s.unit,
    s.wilayah,
    s.pusat_operasi_final AS po,
    s.nama_projek AS projek,
    s.luas_kawasan_hek AS luas_kawasan,
    s.luas_produktif_hek AS luas_berhasil,
    s.bilangan_peserta AS bil_peserta,
    s.hasil,
    s.in_master_2026,
    p.sasaran_tahunan,
    p.id AS projek_ref_id
   FROM (public.hasil_bulanan_src s
     LEFT JOIN public.projek_ref p ON (((p.tahun = s.tahun) AND (p.po = s.pusat_operasi_final) AND (p.projek = s.nama_projek) AND (p.jenis = s.jenis))));


--
-- Name: v_capai_matlamat; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_capai_matlamat AS
 SELECT b.tahun,
    b.bulan,
    b.bulan_nama,
    b.kod_bulan,
    b.jenis,
    b.unit,
    b.wilayah,
    b.po,
    b.projek,
    b.luas_kawasan,
    b.luas_berhasil,
    b.bil_peserta,
    b.hasil,
    b.in_master_2026,
    b.sasaran_tahunan,
    m.peratus_agihan,
        CASE
            WHEN ((b.sasaran_tahunan IS NOT NULL) AND (m.peratus_agihan IS NOT NULL)) THEN (b.sasaran_tahunan * m.peratus_agihan)
            ELSE NULL::numeric
        END AS matlamat_bulanan,
        CASE
            WHEN ((b.sasaran_tahunan IS NOT NULL) AND (m.peratus_agihan IS NOT NULL) AND ((b.sasaran_tahunan * m.peratus_agihan) > (0)::numeric)) THEN round(((b.hasil / (b.sasaran_tahunan * m.peratus_agihan)) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS pct_capai,
        CASE
            WHEN ((b.luas_berhasil IS NOT NULL) AND (b.luas_berhasil > (0)::numeric)) THEN round((b.hasil / b.luas_berhasil), 4)
            ELSE NULL::numeric
        END AS hasil_per_hek,
    b.projek_ref_id
   FROM (public.v_bulanan b
     LEFT JOIN public.matlamat_projek m ON (((m.jenis = b.jenis) AND (m.bulan = b.bulan))));


--
-- Name: v_harian; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_harian WITH (security_invoker='false') AS
 SELECT h.tarikh,
    h.tahun,
    h.bulan,
    h.wilayah,
    h.pusat_operasi_final,
    h.nama_projek,
    h.jenis,
    h.hasil,
    r.luas_berhasil,
    r.sasaran_tahunan
   FROM (public.hasil_harian h
     LEFT JOIN public.projek_ref r ON (((r.po = h.pusat_operasi_final) AND (r.projek = h.nama_projek) AND (r.jenis = h.jenis) AND (r.tahun = h.tahun))));


--
-- Name: v_wilayah; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_wilayah WITH (security_invoker='false') AS
 SELECT tahun,
    bulan,
    bulan_nama,
    kod_bulan,
    wilayah,
    jenis,
    unit,
    count(DISTINCT po) AS bil_po,
    count(DISTINCT projek) AS bil_projek,
    round(sum(luas_berhasil), 4) AS jumlah_luas_berhasil,
    sum(hasil) AS jumlah_hasil,
    sum(matlamat_bulanan) AS jumlah_matlamat,
        CASE
            WHEN ((sum(matlamat_bulanan) IS NOT NULL) AND (sum(matlamat_bulanan) > (0)::numeric)) THEN round(((sum(hasil) / sum(matlamat_bulanan)) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS pct_capai,
        CASE
            WHEN ((sum(luas_berhasil) IS NOT NULL) AND (sum(luas_berhasil) > (0)::numeric)) THEN round((sum(hasil) / sum(luas_berhasil)), 4)
            ELSE NULL::numeric
        END AS hasil_per_hek
   FROM public.v_capai_matlamat c
  WHERE (wilayah IS NOT NULL)
  GROUP BY tahun, bulan, bulan_nama, kod_bulan, wilayah, jenis, unit;


--
-- Name: v_hq; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_hq AS
 SELECT tahun,
    bulan,
    bulan_nama,
    kod_bulan,
    jenis,
    unit,
    'KESELURUHAN'::text AS wilayah,
    sum(bil_po) AS bil_po,
    sum(bil_projek) AS bil_projek,
    sum(jumlah_luas_berhasil) AS jumlah_luas_berhasil,
    sum(jumlah_hasil) AS jumlah_hasil,
    sum(jumlah_matlamat) AS jumlah_matlamat,
        CASE
            WHEN ((sum(jumlah_matlamat) IS NOT NULL) AND (sum(jumlah_matlamat) > (0)::numeric)) THEN round(((sum(jumlah_hasil) / sum(jumlah_matlamat)) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS pct_capai,
        CASE
            WHEN ((sum(jumlah_luas_berhasil) IS NOT NULL) AND (sum(jumlah_luas_berhasil) > (0)::numeric)) THEN round((sum(jumlah_hasil) / sum(jumlah_luas_berhasil)), 4)
            ELSE NULL::numeric
        END AS hasil_per_hek
   FROM public.v_wilayah w
  GROUP BY tahun, bulan, bulan_nama, kod_bulan, jenis, unit;


--
-- Name: v_penyelia; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_penyelia WITH (security_invoker='false') AS
 SELECT pp.penyelia,
    b.tahun,
    b.wilayah,
    b.po,
    b.projek,
    b.jenis,
    b.unit,
    sum(b.hasil) AS hasil_setahun,
    max(b.sasaran_tahunan) AS sasaran_tahunan,
    round(
        CASE
            WHEN (max(b.sasaran_tahunan) > (0)::numeric) THEN ((sum(b.hasil) / max(b.sasaran_tahunan)) * (100)::numeric)
            ELSE NULL::numeric
        END, 1) AS peratus_capai
   FROM (public.v_bulanan b
     JOIN public.projek_penyelia pp ON ((upper(TRIM(BOTH FROM pp.projek)) = upper(TRIM(BOTH FROM b.projek)))))
  GROUP BY pp.penyelia, b.tahun, b.wilayah, b.po, b.projek, b.jenis, b.unit;


--
-- Name: v_ranking_po; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ranking_po AS
 SELECT tahun,
    wilayah,
    po,
    jenis,
    unit,
    count(DISTINCT projek) AS bil_projek,
    round(sum(luas_berhasil), 4) AS jumlah_luas_berhasil,
    sum(hasil) AS jumlah_hasil,
    sum(matlamat_bulanan) AS jumlah_matlamat,
        CASE
            WHEN ((sum(matlamat_bulanan) IS NOT NULL) AND (sum(matlamat_bulanan) > (0)::numeric)) THEN round(((sum(hasil) / sum(matlamat_bulanan)) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS pct_capai,
        CASE
            WHEN ((sum(luas_berhasil) IS NOT NULL) AND (sum(luas_berhasil) > (0)::numeric)) THEN round((sum(hasil) / sum(luas_berhasil)), 4)
            ELSE NULL::numeric
        END AS hasil_per_hek
   FROM public.v_capai_matlamat c
  WHERE (po IS NOT NULL)
  GROUP BY tahun, wilayah, po, jenis, unit;


--
-- Name: v_ringkasan_po; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ringkasan_po AS
 WITH luas_projek AS (
         SELECT DISTINCT hasil_bulanan_src.tahun,
            hasil_bulanan_src.wilayah,
            hasil_bulanan_src.pusat_operasi_final AS po,
            hasil_bulanan_src.jenis,
            hasil_bulanan_src.nama_projek,
            hasil_bulanan_src.luas_produktif_hek
           FROM public.hasil_bulanan_src
          WHERE (hasil_bulanan_src.pusat_operasi_final <> ''::text)
        ), luas_agg AS (
         SELECT luas_projek.tahun,
            luas_projek.wilayah,
            luas_projek.po,
            luas_projek.jenis,
            sum(luas_projek.luas_produktif_hek) AS luas
           FROM luas_projek
          GROUP BY luas_projek.tahun, luas_projek.wilayah, luas_projek.po, luas_projek.jenis
        ), hasil_agg AS (
         SELECT hasil_bulanan_src.tahun,
            hasil_bulanan_src.wilayah,
            hasil_bulanan_src.pusat_operasi_final AS po,
            hasil_bulanan_src.jenis,
            sum(hasil_bulanan_src.hasil) AS jumlah_hasil
           FROM public.hasil_bulanan_src
          WHERE (hasil_bulanan_src.pusat_operasi_final <> ''::text)
          GROUP BY hasil_bulanan_src.tahun, hasil_bulanan_src.wilayah, hasil_bulanan_src.pusat_operasi_final, hasil_bulanan_src.jenis
        )
 SELECT h.tahun,
    h.wilayah,
    h.po AS pusat_operasi,
    h.jenis,
    h.jumlah_hasil,
    l.luas AS luas_produktif_hek,
    round((h.jumlah_hasil / NULLIF(l.luas, (0)::numeric)), 3) AS hasil_per_hek
   FROM (hasil_agg h
     LEFT JOIN luas_agg l USING (tahun, wilayah, po, jenis));


--
-- Name: v_ringkasan_wilayah; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ringkasan_wilayah AS
 WITH lp AS (
         SELECT DISTINCT hasil_bulanan_src.tahun,
            hasil_bulanan_src.wilayah,
            hasil_bulanan_src.jenis,
            hasil_bulanan_src.pusat_operasi_final,
            hasil_bulanan_src.nama_projek,
            hasil_bulanan_src.luas_produktif_hek
           FROM public.hasil_bulanan_src
          WHERE (hasil_bulanan_src.pusat_operasi_final <> ''::text)
        )
 SELECT tahun,
    wilayah,
    jenis,
    sum(hasil) AS jumlah_hasil,
    ( SELECT sum(lp.luas_produktif_hek) AS sum
           FROM lp
          WHERE ((lp.tahun = h.tahun) AND (lp.wilayah = h.wilayah) AND (lp.jenis = h.jenis))) AS luas
   FROM public.hasil_bulanan_src h
  WHERE (pusat_operasi_final <> ''::text)
  GROUP BY tahun, wilayah, jenis;


--
-- Name: hasil_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hasil_audit ALTER COLUMN id SET DEFAULT nextval('public.hasil_audit_id_seq'::regclass);


--
-- Name: projek_ref id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projek_ref ALTER COLUMN id SET DEFAULT nextval('public.projek_ref_id_seq'::regclass);


--
-- Name: qc_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qc_log ALTER COLUMN id SET DEFAULT nextval('public.qc_log_id_seq'::regclass);


--
-- Name: aktiviti aktiviti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aktiviti
    ADD CONSTRAINT aktiviti_pkey PRIMARY KEY (id);


--
-- Name: audit audit_no_rujukan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit
    ADD CONSTRAINT audit_no_rujukan_key UNIQUE (no_rujukan);


--
-- Name: audit audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit
    ADD CONSTRAINT audit_pkey PRIMARY KEY (id);


--
-- Name: bank_jawapan bank_jawapan_klausa_kod_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_jawapan
    ADD CONSTRAINT bank_jawapan_klausa_kod_status_key UNIQUE (klausa_kod, status);


--
-- Name: bank_jawapan bank_jawapan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_jawapan
    ADD CONSTRAINT bank_jawapan_pkey PRIMARY KEY (id);


--
-- Name: bukti bukti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bukti
    ADD CONSTRAINT bukti_pkey PRIMARY KEY (id);


--
-- Name: crosswalk_daerah_po crosswalk_daerah_po_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crosswalk_daerah_po
    ADD CONSTRAINT crosswalk_daerah_po_pkey PRIMARY KEY (daerah_asal);


--
-- Name: dapatan dapatan_audit_id_item_semakan_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dapatan
    ADD CONSTRAINT dapatan_audit_id_item_semakan_id_key UNIQUE (audit_id, item_semakan_id);


--
-- Name: dapatan dapatan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dapatan
    ADD CONSTRAINT dapatan_pkey PRIMARY KEY (id);


--
-- Name: fail_kulit_keras fail_kulit_keras_nombor_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fail_kulit_keras
    ADD CONSTRAINT fail_kulit_keras_nombor_key UNIQUE (nombor);


--
-- Name: fail_kulit_keras fail_kulit_keras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fail_kulit_keras
    ADD CONSTRAINT fail_kulit_keras_pkey PRIMARY KEY (id);


--
-- Name: hasil_audit hasil_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hasil_audit
    ADD CONSTRAINT hasil_audit_pkey PRIMARY KEY (id);


--
-- Name: hasil_bulanan_src hasil_bulanan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hasil_bulanan_src
    ADD CONSTRAINT hasil_bulanan_pkey PRIMARY KEY (id);


--
-- Name: hasil_bulanan_src hasil_bulanan_src_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hasil_bulanan_src
    ADD CONSTRAINT hasil_bulanan_src_unique UNIQUE (tahun, bulan, pusat_operasi_final, nama_projek, jenis);


--
-- Name: hasil_harian hasil_harian_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hasil_harian
    ADD CONSTRAINT hasil_harian_pkey PRIMARY KEY (id);


--
-- Name: item_semakan item_semakan_kriteria_id_kod_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_semakan
    ADD CONSTRAINT item_semakan_kriteria_id_kod_key UNIQUE (kriteria_id, kod);


--
-- Name: item_semakan item_semakan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_semakan
    ADD CONSTRAINT item_semakan_pkey PRIMARY KEY (id);


--
-- Name: kehadiran_opening_meeting kehadiran_opening_meeting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kehadiran_opening_meeting
    ADD CONSTRAINT kehadiran_opening_meeting_pkey PRIMARY KEY (id);


--
-- Name: kriteria kriteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kriteria
    ADD CONSTRAINT kriteria_pkey PRIMARY KEY (id);


--
-- Name: kriteria kriteria_prinsip_id_kod_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kriteria
    ADD CONSTRAINT kriteria_prinsip_id_kod_key UNIQUE (prinsip_id, kod);


--
-- Name: laporan laporan_audit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan
    ADD CONSTRAINT laporan_audit_id_key UNIQUE (audit_id);


--
-- Name: laporan laporan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan
    ADD CONSTRAINT laporan_pkey PRIMARY KEY (id);


--
-- Name: laporan laporan_token_kongsi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan
    ADD CONSTRAINT laporan_token_kongsi_key UNIQUE (token_kongsi);


--
-- Name: matlamat_projek matlamat_projek_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matlamat_projek
    ADD CONSTRAINT matlamat_projek_pkey PRIMARY KEY (jenis, bulan);


--
-- Name: nc nc_no_nc_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nc
    ADD CONSTRAINT nc_no_nc_key UNIQUE (no_nc);


--
-- Name: nc nc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nc
    ADD CONSTRAINT nc_pkey PRIMARY KEY (id);


--
-- Name: ofi ofi_no_ofi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofi
    ADD CONSTRAINT ofi_no_ofi_key UNIQUE (no_ofi);


--
-- Name: ofi ofi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofi
    ADD CONSTRAINT ofi_pkey PRIMARY KEY (id);


--
-- Name: pengguna pengguna_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengguna
    ADD CONSTRAINT pengguna_email_key UNIQUE (email);


--
-- Name: pengguna pengguna_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengguna
    ADD CONSTRAINT pengguna_pkey PRIMARY KEY (id);


--
-- Name: po_wilayah po_wilayah_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_wilayah
    ADD CONSTRAINT po_wilayah_pkey PRIMARY KEY (pusat_operasi);


--
-- Name: prinsip prinsip_kod_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prinsip
    ADD CONSTRAINT prinsip_kod_key UNIQUE (kod);


--
-- Name: prinsip prinsip_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prinsip
    ADD CONSTRAINT prinsip_pkey PRIMARY KEY (id);


--
-- Name: projek_master_2026 projek_master_2026_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projek_master_2026
    ADD CONSTRAINT projek_master_2026_pkey PRIMARY KEY (jenis, nama_projek);


--
-- Name: projek_penyelia projek_penyelia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projek_penyelia
    ADD CONSTRAINT projek_penyelia_pkey PRIMARY KEY (projek);


--
-- Name: projek_ref projek_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projek_ref
    ADD CONSTRAINT projek_ref_pkey PRIMARY KEY (id);


--
-- Name: projek_ref projek_ref_tahun_po_projek_jenis_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projek_ref
    ADD CONSTRAINT projek_ref_tahun_po_projek_jenis_key UNIQUE (tahun, po, projek, jenis);


--
-- Name: pusat_operasi pusat_operasi_kod_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pusat_operasi
    ADD CONSTRAINT pusat_operasi_kod_key UNIQUE (kod);


--
-- Name: pusat_operasi pusat_operasi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pusat_operasi
    ADD CONSTRAINT pusat_operasi_pkey PRIMARY KEY (id);


--
-- Name: qc_log qc_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qc_log
    ADD CONSTRAINT qc_log_pkey PRIMARY KEY (id);


--
-- Name: seksyen_fail seksyen_fail_fail_id_kod_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seksyen_fail
    ADD CONSTRAINT seksyen_fail_fail_id_kod_key UNIQUE (fail_id, kod);


--
-- Name: seksyen_fail seksyen_fail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seksyen_fail
    ADD CONSTRAINT seksyen_fail_pkey PRIMARY KEY (id);


--
-- Name: sesi_audit sesi_audit_nama_sesi_tarikh_mula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesi_audit
    ADD CONSTRAINT sesi_audit_nama_sesi_tarikh_mula_key UNIQUE (nama_sesi, tarikh_mula);


--
-- Name: sesi_audit sesi_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesi_audit
    ADD CONSTRAINT sesi_audit_pkey PRIMARY KEY (id);


--
-- Name: hasil_bulanan_src uq_bulanan; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hasil_bulanan_src
    ADD CONSTRAINT uq_bulanan UNIQUE (tahun, bulan, pusat_operasi_final, nama_projek, jenis);


--
-- Name: hasil_harian uq_harian; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hasil_harian
    ADD CONSTRAINT uq_harian UNIQUE (tarikh, pusat_operasi_final, nama_projek, jenis);


--
-- Name: hasil_bulanan_src uq_hb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hasil_bulanan_src
    ADD CONSTRAINT uq_hb UNIQUE (tahun, bulan, nama_projek, jenis, pusat_operasi_final);


--
-- Name: idx_aktiviti_audit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aktiviti_audit_id ON public.aktiviti USING btree (audit_id);


--
-- Name: idx_aktiviti_dicipta_pada; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aktiviti_dicipta_pada ON public.aktiviti USING btree (dicipta_pada DESC);


--
-- Name: idx_audit_cap_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_cap_due ON public.audit USING btree (cap_due_date) WHERE (cap_due_date IS NOT NULL);


--
-- Name: idx_audit_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_lead ON public.audit USING btree (lead_auditor_id);


--
-- Name: idx_audit_planned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_planned ON public.audit USING btree (planned_start_date, planned_end_date);


--
-- Name: idx_audit_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_po ON public.audit USING btree (pusat_operasi_id);


--
-- Name: idx_audit_sesi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_sesi ON public.audit USING btree (sesi_id);


--
-- Name: idx_audit_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_status ON public.audit USING btree (status);


--
-- Name: idx_audit_tarikh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_tarikh ON public.audit USING btree (tarikh_audit DESC);


--
-- Name: idx_bank_jawapan_klausa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_jawapan_klausa ON public.bank_jawapan USING btree (klausa_kod);


--
-- Name: idx_bukti_dapatan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bukti_dapatan ON public.bukti USING btree (dapatan_id);


--
-- Name: idx_dapatan_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dapatan_audit ON public.dapatan USING btree (audit_id);


--
-- Name: idx_dapatan_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dapatan_item ON public.dapatan USING btree (item_semakan_id);


--
-- Name: idx_dapatan_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dapatan_status ON public.dapatan USING btree (status);


--
-- Name: idx_harian_rollup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_harian_rollup ON public.hasil_harian USING btree (tahun, bulan, pusat_operasi_final, nama_projek, jenis);


--
-- Name: idx_hb_jenis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hb_jenis ON public.hasil_bulanan_src USING btree (jenis);


--
-- Name: idx_hb_pofin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hb_pofin ON public.hasil_bulanan_src USING btree (pusat_operasi_final);


--
-- Name: idx_hb_projek; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hb_projek ON public.hasil_bulanan_src USING btree (nama_projek);


--
-- Name: idx_hb_src_po_jenis_tahun; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hb_src_po_jenis_tahun ON public.hasil_bulanan_src USING btree (pusat_operasi_final, jenis, tahun, bulan);


--
-- Name: idx_hb_src_tahun_master; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hb_src_tahun_master ON public.hasil_bulanan_src USING btree (tahun) WHERE (in_master_2026 = true);


--
-- Name: idx_hb_tahun; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hb_tahun ON public.hasil_bulanan_src USING btree (tahun);


--
-- Name: idx_hb_wil; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hb_wil ON public.hasil_bulanan_src USING btree (wilayah);


--
-- Name: idx_item_kod; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_kod ON public.item_semakan USING btree (kod);


--
-- Name: idx_item_kriteria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_kriteria ON public.item_semakan USING btree (kriteria_id);


--
-- Name: idx_kehadiran_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kehadiran_audit ON public.kehadiran_opening_meeting USING btree (audit_id);


--
-- Name: idx_kriteria_prinsip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kriteria_prinsip ON public.kriteria USING btree (prinsip_id);


--
-- Name: idx_laporan_token_kongsi; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_laporan_token_kongsi ON public.laporan USING btree (token_kongsi) WHERE (token_kongsi IS NOT NULL);


--
-- Name: idx_nc_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nc_audit ON public.nc USING btree (audit_id);


--
-- Name: idx_nc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nc_status ON public.nc USING btree (status);


--
-- Name: idx_ofi_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ofi_audit ON public.ofi USING btree (audit_id);


--
-- Name: idx_pengguna_rol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pengguna_rol ON public.pengguna USING btree (rol);


--
-- Name: idx_po_wilayah; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_wilayah ON public.pusat_operasi USING btree (wilayah);


--
-- Name: idx_projek_ref_tahun_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projek_ref_tahun_po ON public.projek_ref USING btree (tahun, po);


--
-- Name: idx_sesi_tarikh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesi_tarikh ON public.sesi_audit USING btree (tarikh_mula);


--
-- Name: idx_sesi_wilayah; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesi_wilayah ON public.sesi_audit USING btree (wilayah);


--
-- Name: hasil_bulanan_src hasil_audit_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER hasil_audit_trg AFTER INSERT OR DELETE OR UPDATE ON public.hasil_bulanan_src FOR EACH ROW EXECUTE FUNCTION public.trg_hasil_audit();


--
-- Name: audit trg_audit_aktiviti; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_aktiviti AFTER INSERT OR UPDATE ON public.audit FOR EACH ROW EXECUTE FUNCTION public.log_audit_aktiviti();


--
-- Name: audit trg_audit_aktiviti_padam; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_aktiviti_padam BEFORE DELETE ON public.audit FOR EACH ROW EXECUTE FUNCTION public.log_audit_aktiviti();


--
-- Name: audit trg_audit_dikemaskini; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_dikemaskini BEFORE UPDATE ON public.audit FOR EACH ROW EXECUTE FUNCTION public.set_dikemaskini_pada();


--
-- Name: audit trg_audit_muktamad; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_muktamad BEFORE UPDATE ON public.audit FOR EACH ROW EXECUTE FUNCTION public.fn_lock_audit_muktamad();


--
-- Name: audit trg_audit_prefill; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_prefill AFTER INSERT ON public.audit FOR EACH ROW EXECUTE FUNCTION public.handle_audit_baru();


--
-- Name: dapatan trg_dapatan_aktiviti; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dapatan_aktiviti AFTER INSERT OR UPDATE ON public.dapatan FOR EACH ROW EXECUTE FUNCTION public.log_dapatan_aktiviti();


--
-- Name: dapatan trg_dapatan_aktiviti_padam; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dapatan_aktiviti_padam BEFORE DELETE ON public.dapatan FOR EACH ROW EXECUTE FUNCTION public.log_dapatan_aktiviti();


--
-- Name: dapatan trg_dapatan_dikemaskini; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dapatan_dikemaskini BEFORE UPDATE ON public.dapatan FOR EACH ROW EXECUTE FUNCTION public.set_dikemaskini_pada();


--
-- Name: dapatan trg_dapatan_jana_nc_ofi; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dapatan_jana_nc_ofi AFTER INSERT OR UPDATE ON public.dapatan FOR EACH ROW EXECUTE FUNCTION public.handle_dapatan_perubahan();


--
-- Name: nc trg_nc_dikemaskini; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_nc_dikemaskini BEFORE UPDATE ON public.nc FOR EACH ROW EXECUTE FUNCTION public.set_dikemaskini_pada();


--
-- Name: ofi trg_ofi_dikemaskini; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ofi_dikemaskini BEFORE UPDATE ON public.ofi FOR EACH ROW EXECUTE FUNCTION public.set_dikemaskini_pada();


--
-- Name: pengguna trg_pengguna_dikemaskini; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pengguna_dikemaskini BEFORE UPDATE ON public.pengguna FOR EACH ROW EXECUTE FUNCTION public.set_dikemaskini_pada();


--
-- Name: pusat_operasi trg_po_dikemaskini; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_po_dikemaskini BEFORE UPDATE ON public.pusat_operasi FOR EACH ROW EXECUTE FUNCTION public.set_dikemaskini_pada();


--
-- Name: sesi_audit trg_sesi_dikemaskini; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sesi_dikemaskini BEFORE UPDATE ON public.sesi_audit FOR EACH ROW EXECUTE FUNCTION public.set_dikemaskini_pada();


--
-- Name: aktiviti aktiviti_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aktiviti
    ADD CONSTRAINT aktiviti_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audit(id) ON DELETE SET NULL;


--
-- Name: audit audit_cap_grade_overridden_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit
    ADD CONSTRAINT audit_cap_grade_overridden_by_fkey FOREIGN KEY (cap_grade_overridden_by) REFERENCES public.pengguna(id) ON DELETE SET NULL;


--
-- Name: audit audit_lead_auditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit
    ADD CONSTRAINT audit_lead_auditor_id_fkey FOREIGN KEY (lead_auditor_id) REFERENCES public.pengguna(id) ON DELETE RESTRICT;


--
-- Name: audit audit_pusat_operasi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit
    ADD CONSTRAINT audit_pusat_operasi_id_fkey FOREIGN KEY (pusat_operasi_id) REFERENCES public.pusat_operasi(id) ON DELETE RESTRICT;


--
-- Name: audit audit_sesi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit
    ADD CONSTRAINT audit_sesi_id_fkey FOREIGN KEY (sesi_id) REFERENCES public.sesi_audit(id) ON DELETE SET NULL;


--
-- Name: bukti bukti_dapatan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bukti
    ADD CONSTRAINT bukti_dapatan_id_fkey FOREIGN KEY (dapatan_id) REFERENCES public.dapatan(id) ON DELETE CASCADE;


--
-- Name: bukti bukti_dimuat_naik_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bukti
    ADD CONSTRAINT bukti_dimuat_naik_oleh_fkey FOREIGN KEY (dimuat_naik_oleh) REFERENCES public.pengguna(id) ON DELETE SET NULL;


--
-- Name: dapatan dapatan_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dapatan
    ADD CONSTRAINT dapatan_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audit(id) ON DELETE CASCADE;


--
-- Name: dapatan dapatan_diaudit_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dapatan
    ADD CONSTRAINT dapatan_diaudit_oleh_fkey FOREIGN KEY (diaudit_oleh) REFERENCES public.pengguna(id) ON DELETE RESTRICT;


--
-- Name: dapatan dapatan_item_semakan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dapatan
    ADD CONSTRAINT dapatan_item_semakan_id_fkey FOREIGN KEY (item_semakan_id) REFERENCES public.item_semakan(id) ON DELETE RESTRICT;


--
-- Name: item_semakan item_semakan_kriteria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_semakan
    ADD CONSTRAINT item_semakan_kriteria_id_fkey FOREIGN KEY (kriteria_id) REFERENCES public.kriteria(id) ON DELETE CASCADE;


--
-- Name: kehadiran_opening_meeting kehadiran_opening_meeting_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kehadiran_opening_meeting
    ADD CONSTRAINT kehadiran_opening_meeting_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audit(id) ON DELETE CASCADE;


--
-- Name: kriteria kriteria_prinsip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kriteria
    ADD CONSTRAINT kriteria_prinsip_id_fkey FOREIGN KEY (prinsip_id) REFERENCES public.prinsip(id) ON DELETE CASCADE;


--
-- Name: laporan laporan_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan
    ADD CONSTRAINT laporan_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audit(id) ON DELETE CASCADE;


--
-- Name: laporan laporan_dijana_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan
    ADD CONSTRAINT laporan_dijana_oleh_fkey FOREIGN KEY (dijana_oleh) REFERENCES public.pengguna(id) ON DELETE SET NULL;


--
-- Name: nc nc_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nc
    ADD CONSTRAINT nc_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audit(id) ON DELETE CASCADE;


--
-- Name: nc nc_dapatan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nc
    ADD CONSTRAINT nc_dapatan_id_fkey FOREIGN KEY (dapatan_id) REFERENCES public.dapatan(id) ON DELETE CASCADE;


--
-- Name: ofi ofi_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofi
    ADD CONSTRAINT ofi_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audit(id) ON DELETE CASCADE;


--
-- Name: ofi ofi_dapatan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofi
    ADD CONSTRAINT ofi_dapatan_id_fkey FOREIGN KEY (dapatan_id) REFERENCES public.dapatan(id) ON DELETE CASCADE;


--
-- Name: pengguna pengguna_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengguna
    ADD CONSTRAINT pengguna_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pengguna pengguna_pusat_operasi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengguna
    ADD CONSTRAINT pengguna_pusat_operasi_id_fkey FOREIGN KEY (pusat_operasi_id) REFERENCES public.pusat_operasi(id) ON DELETE SET NULL;


--
-- Name: seksyen_fail seksyen_fail_fail_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seksyen_fail
    ADD CONSTRAINT seksyen_fail_fail_id_fkey FOREIGN KEY (fail_id) REFERENCES public.fail_kulit_keras(id) ON DELETE CASCADE;


--
-- Name: bank_jawapan Admin urus bank jawapan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin urus bank jawapan" ON public.bank_jawapan USING ((public.rol_semasa() = 'admin'::public.rol_pengguna));


--
-- Name: fail_kulit_keras Admin urus fail; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin urus fail" ON public.fail_kulit_keras USING ((public.rol_semasa() = 'admin'::public.rol_pengguna));


--
-- Name: item_semakan Admin urus item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin urus item" ON public.item_semakan USING ((public.rol_semasa() = 'admin'::public.rol_pengguna));


--
-- Name: kriteria Admin urus kriteria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin urus kriteria" ON public.kriteria USING ((public.rol_semasa() = 'admin'::public.rol_pengguna));


--
-- Name: pengguna Admin urus pengguna; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin urus pengguna" ON public.pengguna TO authenticated USING ((public.rol_semasa() = 'admin'::public.rol_pengguna));


--
-- Name: prinsip Admin urus prinsip; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin urus prinsip" ON public.prinsip USING ((public.rol_semasa() = 'admin'::public.rol_pengguna));


--
-- Name: seksyen_fail Admin urus seksyen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin urus seksyen" ON public.seksyen_fail USING ((public.rol_semasa() = 'admin'::public.rol_pengguna));


--
-- Name: pusat_operasi Admin/Lead urus PO; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/Lead urus PO" ON public.pusat_operasi TO authenticated USING ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna])));


--
-- Name: sesi_audit Admin/Lead urus sesi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/Lead urus sesi" ON public.sesi_audit USING ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna])));


--
-- Name: nc Akses NC; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Akses NC" ON public.nc FOR SELECT USING (((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])) OR (EXISTS ( SELECT 1
   FROM (public.audit a
     JOIN public.pengguna p ON ((p.id = auth.uid())))
  WHERE ((a.id = nc.audit_id) AND (p.pusat_operasi_id = a.pusat_operasi_id))))));


--
-- Name: ofi Akses OFI; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Akses OFI" ON public.ofi FOR SELECT USING (((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])) OR (EXISTS ( SELECT 1
   FROM (public.audit a
     JOIN public.pengguna p ON ((p.id = auth.uid())))
  WHERE ((a.id = ofi.audit_id) AND (p.pusat_operasi_id = a.pusat_operasi_id))))));


--
-- Name: audit Akses audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Akses audit" ON public.audit FOR SELECT USING (((auth.uid() IS NOT NULL) AND ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])) OR (EXISTS ( SELECT 1
   FROM public.pengguna p
  WHERE ((p.id = auth.uid()) AND (p.pusat_operasi_id = audit.pusat_operasi_id)))))));


--
-- Name: bukti Akses bukti; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Akses bukti" ON public.bukti FOR SELECT USING (((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])) OR (EXISTS ( SELECT 1
   FROM ((public.dapatan d
     JOIN public.audit a ON ((a.id = d.audit_id)))
     JOIN public.pengguna p ON ((p.id = auth.uid())))
  WHERE ((d.id = bukti.dapatan_id) AND (p.pusat_operasi_id = a.pusat_operasi_id))))));


--
-- Name: dapatan Akses dapatan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Akses dapatan" ON public.dapatan FOR SELECT TO authenticated USING (((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])) OR (EXISTS ( SELECT 1
   FROM (public.audit a
     JOIN public.pengguna p ON ((p.id = auth.uid())))
  WHERE ((a.id = dapatan.audit_id) AND (p.pusat_operasi_id = a.pusat_operasi_id))))));


--
-- Name: laporan Akses laporan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Akses laporan" ON public.laporan FOR SELECT USING (((auth.uid() IS NOT NULL) AND ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])) OR (EXISTS ( SELECT 1
   FROM (public.audit a
     JOIN public.pengguna p ON ((p.id = auth.uid())))
  WHERE ((a.id = laporan.audit_id) AND (p.pusat_operasi_id = a.pusat_operasi_id)))))));


--
-- Name: audit Anon baca audit kongsi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon baca audit kongsi" ON public.audit FOR SELECT TO anon USING (true);


--
-- Name: dapatan Anon baca dapatan kongsi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon baca dapatan kongsi" ON public.dapatan FOR SELECT TO anon USING (true);


--
-- Name: laporan Anon baca laporan kongsi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon baca laporan kongsi" ON public.laporan FOR SELECT TO anon USING (((kongsi_aktif = true) AND (token_kongsi IS NOT NULL)));


--
-- Name: bukti Auditor tulis bukti; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auditor tulis bukti" ON public.bukti USING ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])));


--
-- Name: dapatan Auditor tulis dapatan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auditor tulis dapatan" ON public.dapatan TO authenticated USING ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])));


--
-- Name: audit Auditor urus audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auditor urus audit" ON public.audit TO authenticated USING ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])));


--
-- Name: bank_jawapan Auth boleh baca bank jawapan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth boleh baca bank jawapan" ON public.bank_jawapan FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: fail_kulit_keras Auth boleh baca fail; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth boleh baca fail" ON public.fail_kulit_keras FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: item_semakan Auth boleh baca item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth boleh baca item" ON public.item_semakan FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: kehadiran_opening_meeting Auth boleh baca kehadiran; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth boleh baca kehadiran" ON public.kehadiran_opening_meeting FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: kriteria Auth boleh baca kriteria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth boleh baca kriteria" ON public.kriteria FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: prinsip Auth boleh baca prinsip; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth boleh baca prinsip" ON public.prinsip FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: seksyen_fail Auth boleh baca seksyen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth boleh baca seksyen" ON public.seksyen_fail FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: sesi_audit Auth boleh baca sesi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth boleh baca sesi" ON public.sesi_audit FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: kehadiran_opening_meeting Auth boleh tulis kehadiran; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth boleh tulis kehadiran" ON public.kehadiran_opening_meeting FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: pusat_operasi Baca PO; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Baca PO" ON public.pusat_operasi FOR SELECT TO authenticated USING (((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna, 'auditor'::public.rol_pengguna])) OR (EXISTS ( SELECT 1
   FROM public.pengguna p
  WHERE ((p.id = auth.uid()) AND (p.pusat_operasi_id = pusat_operasi.id))))));


--
-- Name: audit Baca audit untuk laporan kongsi awam; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Baca audit untuk laporan kongsi awam" ON public.audit FOR SELECT TO anon USING (public.audit_ada_kongsi(id));


--
-- Name: dapatan Baca dapatan untuk laporan kongsi awam; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Baca dapatan untuk laporan kongsi awam" ON public.dapatan FOR SELECT TO anon USING (public.audit_ada_kongsi(audit_id));


--
-- Name: item_semakan Baca item kongsi awam; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Baca item kongsi awam" ON public.item_semakan FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.laporan l
  WHERE ((l.kongsi_aktif = true) AND (l.token_kongsi IS NOT NULL)))));


--
-- Name: kriteria Baca kriteria kongsi awam; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Baca kriteria kongsi awam" ON public.kriteria FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.laporan l
  WHERE ((l.kongsi_aktif = true) AND (l.token_kongsi IS NOT NULL)))));


--
-- Name: prinsip Baca prinsip kongsi awam; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Baca prinsip kongsi awam" ON public.prinsip FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.laporan l
  WHERE ((l.kongsi_aktif = true) AND (l.token_kongsi IS NOT NULL)))));


--
-- Name: pengguna Baca profil sendiri; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Baca profil sendiri" ON public.pengguna FOR SELECT TO authenticated USING (((id = auth.uid()) OR (public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna]))));


--
-- Name: pengguna Kemaskini profil sendiri; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Kemaskini profil sendiri" ON public.pengguna FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: nc Lead urus NC; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lead urus NC" ON public.nc USING ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna])));


--
-- Name: ofi Lead urus OFI; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lead urus OFI" ON public.ofi USING ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna])));


--
-- Name: laporan Lead urus laporan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lead urus laporan" ON public.laporan TO authenticated USING ((public.rol_semasa() = ANY (ARRAY['admin'::public.rol_pengguna, 'lead_auditor'::public.rol_pengguna])));


--
-- Name: aktiviti Pengguna boleh baca aktiviti; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Pengguna boleh baca aktiviti" ON public.aktiviti FOR SELECT TO authenticated USING (true);


--
-- Name: aktiviti Sistem boleh tulis aktiviti; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sistem boleh tulis aktiviti" ON public.aktiviti FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: _bak_hasil_bulanan_final; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_hasil_bulanan_final ENABLE ROW LEVEL SECURITY;

--
-- Name: aktiviti; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aktiviti ENABLE ROW LEVEL SECURITY;

--
-- Name: hasil_audit anon read hasil_audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon read hasil_audit" ON public.hasil_audit FOR SELECT TO anon USING (true);


--
-- Name: hasil_bulanan_src anon read hasil_bulanan_src; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon read hasil_bulanan_src" ON public.hasil_bulanan_src FOR SELECT TO anon USING (true);


--
-- Name: matlamat_projek anon read matlamat_projek; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon read matlamat_projek" ON public.matlamat_projek FOR SELECT TO anon USING (true);


--
-- Name: projek_ref anon read projek_ref; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon read projek_ref" ON public.projek_ref FOR SELECT TO anon USING (true);


--
-- Name: arkib_hasil_pra2023; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.arkib_hasil_pra2023 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit ENABLE ROW LEVEL SECURITY;

--
-- Name: crosswalk_daerah_po baca_awam_crosswalk; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY baca_awam_crosswalk ON public.crosswalk_daerah_po FOR SELECT TO authenticated, anon USING (true);


--
-- Name: projek_master_2026 baca_awam_master; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY baca_awam_master ON public.projek_master_2026 FOR SELECT TO authenticated, anon USING (true);


--
-- Name: po_wilayah baca_awam_powil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY baca_awam_powil ON public.po_wilayah FOR SELECT TO authenticated, anon USING (true);


--
-- Name: bank_jawapan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_jawapan ENABLE ROW LEVEL SECURITY;

--
-- Name: bukti; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bukti ENABLE ROW LEVEL SECURITY;

--
-- Name: crosswalk_daerah_po; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crosswalk_daerah_po ENABLE ROW LEVEL SECURITY;

--
-- Name: dapatan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dapatan ENABLE ROW LEVEL SECURITY;

--
-- Name: hasil_bulanan_src deny_anon_hasil_bulanan_src; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_anon_hasil_bulanan_src ON public.hasil_bulanan_src TO anon USING (false);


--
-- Name: hasil_harian deny_anon_hasil_harian; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_anon_hasil_harian ON public.hasil_harian TO anon USING (false);


--
-- Name: pengguna deny_anon_pengguna; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_anon_pengguna ON public.pengguna TO anon USING (false);


--
-- Name: projek_penyelia deny_anon_projek_penyelia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_anon_projek_penyelia ON public.projek_penyelia TO anon USING (false);


--
-- Name: projek_ref deny_anon_projek_ref; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_anon_projek_ref ON public.projek_ref TO anon USING (false);


--
-- Name: pusat_operasi deny_anon_pusat_operasi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_anon_pusat_operasi ON public.pusat_operasi TO anon USING (false);


--
-- Name: fail_kulit_keras; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fail_kulit_keras ENABLE ROW LEVEL SECURITY;

--
-- Name: hasil_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hasil_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: hasil_bulanan_src; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hasil_bulanan_src ENABLE ROW LEVEL SECURITY;

--
-- Name: hasil_harian; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hasil_harian ENABLE ROW LEVEL SECURITY;

--
-- Name: item_semakan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.item_semakan ENABLE ROW LEVEL SECURITY;

--
-- Name: kehadiran_opening_meeting; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kehadiran_opening_meeting ENABLE ROW LEVEL SECURITY;

--
-- Name: kriteria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kriteria ENABLE ROW LEVEL SECURITY;

--
-- Name: laporan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;

--
-- Name: matlamat_projek; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matlamat_projek ENABLE ROW LEVEL SECURITY;

--
-- Name: nc; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nc ENABLE ROW LEVEL SECURITY;

--
-- Name: ofi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ofi ENABLE ROW LEVEL SECURITY;

--
-- Name: pengguna; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pengguna ENABLE ROW LEVEL SECURITY;

--
-- Name: po_wilayah; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.po_wilayah ENABLE ROW LEVEL SECURITY;

--
-- Name: prinsip; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prinsip ENABLE ROW LEVEL SECURITY;

--
-- Name: projek_master_2026; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projek_master_2026 ENABLE ROW LEVEL SECURITY;

--
-- Name: projek_penyelia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projek_penyelia ENABLE ROW LEVEL SECURITY;

--
-- Name: projek_penyelia projek_penyelia_delete_locked; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projek_penyelia_delete_locked ON public.projek_penyelia FOR DELETE TO anon USING (false);


--
-- Name: projek_penyelia projek_penyelia_insert_locked; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projek_penyelia_insert_locked ON public.projek_penyelia FOR INSERT TO anon WITH CHECK (false);


--
-- Name: projek_penyelia projek_penyelia_update_locked; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projek_penyelia_update_locked ON public.projek_penyelia FOR UPDATE TO anon USING (false) WITH CHECK (false);


--
-- Name: projek_ref; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projek_ref ENABLE ROW LEVEL SECURITY;

--
-- Name: pusat_operasi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pusat_operasi ENABLE ROW LEVEL SECURITY;

--
-- Name: qc_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qc_log ENABLE ROW LEVEL SECURITY;

--
-- Name: qc_log qc_log anon read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "qc_log anon read" ON public.qc_log FOR SELECT TO authenticated, anon USING (true);


--
-- Name: seksyen_fail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seksyen_fail ENABLE ROW LEVEL SECURITY;

--
-- Name: sesi_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sesi_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION audit_ada_kongsi(p_audit_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.audit_ada_kongsi(p_audit_id uuid) TO anon;
GRANT ALL ON FUNCTION public.audit_ada_kongsi(p_audit_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.audit_ada_kongsi(p_audit_id uuid) TO service_role;


--
-- Name: FUNCTION auditor_ada_kongsi(p_pengguna_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.auditor_ada_kongsi(p_pengguna_id uuid) TO anon;
GRANT ALL ON FUNCTION public.auditor_ada_kongsi(p_pengguna_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.auditor_ada_kongsi(p_pengguna_id uuid) TO service_role;


--
-- Name: FUNCTION fn_ada_laporan_kongsi(p_audit_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_ada_laporan_kongsi(p_audit_id uuid) TO anon;
GRANT ALL ON FUNCTION public.fn_ada_laporan_kongsi(p_audit_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.fn_ada_laporan_kongsi(p_audit_id uuid) TO service_role;


--
-- Name: FUNCTION fn_kira_cap_due_date(gred public.gred_nc, tarikh_asal date); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kira_cap_due_date(gred public.gred_nc, tarikh_asal date) TO anon;
GRANT ALL ON FUNCTION public.fn_kira_cap_due_date(gred public.gred_nc, tarikh_asal date) TO authenticated;
GRANT ALL ON FUNCTION public.fn_kira_cap_due_date(gred public.gred_nc, tarikh_asal date) TO service_role;


--
-- Name: FUNCTION fn_kira_gred_basis(p_audit_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_kira_gred_basis(p_audit_id uuid) TO anon;
GRANT ALL ON FUNCTION public.fn_kira_gred_basis(p_audit_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.fn_kira_gred_basis(p_audit_id uuid) TO service_role;


--
-- Name: FUNCTION fn_lock_audit_muktamad(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_lock_audit_muktamad() TO anon;
GRANT ALL ON FUNCTION public.fn_lock_audit_muktamad() TO authenticated;
GRANT ALL ON FUNCTION public.fn_lock_audit_muktamad() TO service_role;


--
-- Name: FUNCTION handle_audit_baru(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_audit_baru() TO anon;
GRANT ALL ON FUNCTION public.handle_audit_baru() TO authenticated;
GRANT ALL ON FUNCTION public.handle_audit_baru() TO service_role;


--
-- Name: FUNCTION handle_dapatan_perubahan(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_dapatan_perubahan() TO anon;
GRANT ALL ON FUNCTION public.handle_dapatan_perubahan() TO authenticated;
GRANT ALL ON FUNCTION public.handle_dapatan_perubahan() TO service_role;


--
-- Name: FUNCTION handle_pengguna_baru(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_pengguna_baru() TO anon;
GRANT ALL ON FUNCTION public.handle_pengguna_baru() TO authenticated;
GRANT ALL ON FUNCTION public.handle_pengguna_baru() TO service_role;


--
-- Name: FUNCTION jana_no_rujukan(p_jenis text, p_tahun integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jana_no_rujukan(p_jenis text, p_tahun integer) TO anon;
GRANT ALL ON FUNCTION public.jana_no_rujukan(p_jenis text, p_tahun integer) TO authenticated;
GRANT ALL ON FUNCTION public.jana_no_rujukan(p_jenis text, p_tahun integer) TO service_role;


--
-- Name: FUNCTION log_audit_aktiviti(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_audit_aktiviti() TO anon;
GRANT ALL ON FUNCTION public.log_audit_aktiviti() TO authenticated;
GRANT ALL ON FUNCTION public.log_audit_aktiviti() TO service_role;


--
-- Name: FUNCTION log_dapatan_aktiviti(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_dapatan_aktiviti() TO anon;
GRANT ALL ON FUNCTION public.log_dapatan_aktiviti() TO authenticated;
GRANT ALL ON FUNCTION public.log_dapatan_aktiviti() TO service_role;


--
-- Name: FUNCTION po_ada_kongsi(p_po_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.po_ada_kongsi(p_po_id uuid) TO anon;
GRANT ALL ON FUNCTION public.po_ada_kongsi(p_po_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.po_ada_kongsi(p_po_id uuid) TO service_role;


--
-- Name: FUNCTION prefill_dapatan_audit(p_audit_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.prefill_dapatan_audit(p_audit_id uuid) TO anon;
GRANT ALL ON FUNCTION public.prefill_dapatan_audit(p_audit_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.prefill_dapatan_audit(p_audit_id uuid) TO service_role;


--
-- Name: FUNCTION rol_semasa(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rol_semasa() TO anon;
GRANT ALL ON FUNCTION public.rol_semasa() TO authenticated;
GRANT ALL ON FUNCTION public.rol_semasa() TO service_role;


--
-- Name: FUNCTION set_dikemaskini_pada(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_dikemaskini_pada() TO anon;
GRANT ALL ON FUNCTION public.set_dikemaskini_pada() TO authenticated;
GRANT ALL ON FUNCTION public.set_dikemaskini_pada() TO service_role;


--
-- Name: FUNCTION trg_hasil_audit(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trg_hasil_audit() TO anon;
GRANT ALL ON FUNCTION public.trg_hasil_audit() TO authenticated;
GRANT ALL ON FUNCTION public.trg_hasil_audit() TO service_role;


--
-- Name: TABLE _bak_hasil_bulanan_final; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public._bak_hasil_bulanan_final TO anon;
GRANT ALL ON TABLE public._bak_hasil_bulanan_final TO authenticated;
GRANT ALL ON TABLE public._bak_hasil_bulanan_final TO service_role;


--
-- Name: TABLE aktiviti; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.aktiviti TO anon;
GRANT ALL ON TABLE public.aktiviti TO authenticated;
GRANT ALL ON TABLE public.aktiviti TO service_role;


--
-- Name: TABLE arkib_hasil_pra2023; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,MAINTAIN ON TABLE public.arkib_hasil_pra2023 TO anon;
GRANT ALL ON TABLE public.arkib_hasil_pra2023 TO authenticated;
GRANT ALL ON TABLE public.arkib_hasil_pra2023 TO service_role;


--
-- Name: TABLE audit; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit TO anon;
GRANT ALL ON TABLE public.audit TO authenticated;
GRANT ALL ON TABLE public.audit TO service_role;


--
-- Name: TABLE sesi_audit; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sesi_audit TO anon;
GRANT ALL ON TABLE public.sesi_audit TO authenticated;
GRANT ALL ON TABLE public.sesi_audit TO service_role;


--
-- Name: TABLE audit_status_live; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_status_live TO authenticated;
GRANT ALL ON TABLE public.audit_status_live TO service_role;


--
-- Name: TABLE bank_jawapan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bank_jawapan TO anon;
GRANT ALL ON TABLE public.bank_jawapan TO authenticated;
GRANT ALL ON TABLE public.bank_jawapan TO service_role;


--
-- Name: TABLE bukti; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bukti TO anon;
GRANT ALL ON TABLE public.bukti TO authenticated;
GRANT ALL ON TABLE public.bukti TO service_role;


--
-- Name: TABLE crosswalk_daerah_po; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.crosswalk_daerah_po TO anon;
GRANT ALL ON TABLE public.crosswalk_daerah_po TO authenticated;
GRANT ALL ON TABLE public.crosswalk_daerah_po TO service_role;


--
-- Name: TABLE dapatan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dapatan TO anon;
GRANT ALL ON TABLE public.dapatan TO authenticated;
GRANT ALL ON TABLE public.dapatan TO service_role;


--
-- Name: TABLE fail_kulit_keras; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fail_kulit_keras TO anon;
GRANT ALL ON TABLE public.fail_kulit_keras TO authenticated;
GRANT ALL ON TABLE public.fail_kulit_keras TO service_role;


--
-- Name: TABLE hasil_audit; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hasil_audit TO anon;
GRANT ALL ON TABLE public.hasil_audit TO authenticated;
GRANT ALL ON TABLE public.hasil_audit TO service_role;


--
-- Name: SEQUENCE hasil_audit_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.hasil_audit_id_seq TO anon;
GRANT ALL ON SEQUENCE public.hasil_audit_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.hasil_audit_id_seq TO service_role;


--
-- Name: TABLE hasil_bulanan_src; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hasil_bulanan_src TO authenticated;
GRANT ALL ON TABLE public.hasil_bulanan_src TO service_role;
GRANT SELECT ON TABLE public.hasil_bulanan_src TO anon;


--
-- Name: TABLE hasil_bulanan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hasil_bulanan TO anon;
GRANT ALL ON TABLE public.hasil_bulanan TO authenticated;
GRANT ALL ON TABLE public.hasil_bulanan TO service_role;


--
-- Name: SEQUENCE hasil_bulanan_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.hasil_bulanan_id_seq TO anon;
GRANT ALL ON SEQUENCE public.hasil_bulanan_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.hasil_bulanan_id_seq TO service_role;


--
-- Name: TABLE hasil_harian; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hasil_harian TO authenticated;
GRANT ALL ON TABLE public.hasil_harian TO service_role;


--
-- Name: SEQUENCE hasil_harian_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.hasil_harian_id_seq TO anon;
GRANT ALL ON SEQUENCE public.hasil_harian_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.hasil_harian_id_seq TO service_role;


--
-- Name: TABLE item_semakan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.item_semakan TO anon;
GRANT ALL ON TABLE public.item_semakan TO authenticated;
GRANT ALL ON TABLE public.item_semakan TO service_role;


--
-- Name: TABLE kehadiran_opening_meeting; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kehadiran_opening_meeting TO anon;
GRANT ALL ON TABLE public.kehadiran_opening_meeting TO authenticated;
GRANT ALL ON TABLE public.kehadiran_opening_meeting TO service_role;


--
-- Name: TABLE kriteria; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kriteria TO anon;
GRANT ALL ON TABLE public.kriteria TO authenticated;
GRANT ALL ON TABLE public.kriteria TO service_role;


--
-- Name: TABLE laporan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.laporan TO anon;
GRANT ALL ON TABLE public.laporan TO authenticated;
GRANT ALL ON TABLE public.laporan TO service_role;


--
-- Name: TABLE matlamat_projek; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.matlamat_projek TO anon;
GRANT ALL ON TABLE public.matlamat_projek TO authenticated;
GRANT ALL ON TABLE public.matlamat_projek TO service_role;


--
-- Name: TABLE nc; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.nc TO anon;
GRANT ALL ON TABLE public.nc TO authenticated;
GRANT ALL ON TABLE public.nc TO service_role;


--
-- Name: TABLE ofi; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ofi TO anon;
GRANT ALL ON TABLE public.ofi TO authenticated;
GRANT ALL ON TABLE public.ofi TO service_role;


--
-- Name: TABLE pengguna; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pengguna TO authenticated;
GRANT ALL ON TABLE public.pengguna TO service_role;


--
-- Name: TABLE po_wilayah; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.po_wilayah TO anon;
GRANT ALL ON TABLE public.po_wilayah TO authenticated;
GRANT ALL ON TABLE public.po_wilayah TO service_role;


--
-- Name: TABLE prinsip; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prinsip TO anon;
GRANT ALL ON TABLE public.prinsip TO authenticated;
GRANT ALL ON TABLE public.prinsip TO service_role;


--
-- Name: TABLE projek_master_2026; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projek_master_2026 TO anon;
GRANT ALL ON TABLE public.projek_master_2026 TO authenticated;
GRANT ALL ON TABLE public.projek_master_2026 TO service_role;


--
-- Name: TABLE projek_penyelia; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projek_penyelia TO authenticated;
GRANT ALL ON TABLE public.projek_penyelia TO service_role;


--
-- Name: TABLE projek_ref; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projek_ref TO authenticated;
GRANT ALL ON TABLE public.projek_ref TO service_role;
GRANT SELECT ON TABLE public.projek_ref TO anon;


--
-- Name: SEQUENCE projek_ref_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.projek_ref_id_seq TO anon;
GRANT ALL ON SEQUENCE public.projek_ref_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.projek_ref_id_seq TO service_role;


--
-- Name: TABLE pusat_operasi; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pusat_operasi TO authenticated;
GRANT ALL ON TABLE public.pusat_operasi TO service_role;


--
-- Name: TABLE qc_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.qc_log TO anon;
GRANT ALL ON TABLE public.qc_log TO authenticated;
GRANT ALL ON TABLE public.qc_log TO service_role;


--
-- Name: SEQUENCE qc_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.qc_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.qc_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.qc_log_id_seq TO service_role;


--
-- Name: TABLE seksyen_fail; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.seksyen_fail TO anon;
GRANT ALL ON TABLE public.seksyen_fail TO authenticated;
GRANT ALL ON TABLE public.seksyen_fail TO service_role;


--
-- Name: SEQUENCE seq_no_nc; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.seq_no_nc TO anon;
GRANT ALL ON SEQUENCE public.seq_no_nc TO authenticated;
GRANT ALL ON SEQUENCE public.seq_no_nc TO service_role;


--
-- Name: SEQUENCE seq_no_ofi; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.seq_no_ofi TO anon;
GRANT ALL ON SEQUENCE public.seq_no_ofi TO authenticated;
GRANT ALL ON SEQUENCE public.seq_no_ofi TO service_role;


--
-- Name: TABLE v_bulanan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_bulanan TO anon;
GRANT ALL ON TABLE public.v_bulanan TO authenticated;
GRANT ALL ON TABLE public.v_bulanan TO service_role;


--
-- Name: TABLE v_capai_matlamat; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_capai_matlamat TO authenticated;
GRANT ALL ON TABLE public.v_capai_matlamat TO service_role;


--
-- Name: TABLE v_harian; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_harian TO anon;
GRANT ALL ON TABLE public.v_harian TO authenticated;
GRANT ALL ON TABLE public.v_harian TO service_role;


--
-- Name: TABLE v_wilayah; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_wilayah TO anon;
GRANT ALL ON TABLE public.v_wilayah TO authenticated;
GRANT ALL ON TABLE public.v_wilayah TO service_role;


--
-- Name: TABLE v_hq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_hq TO authenticated;
GRANT ALL ON TABLE public.v_hq TO service_role;


--
-- Name: TABLE v_penyelia; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_penyelia TO anon;
GRANT ALL ON TABLE public.v_penyelia TO authenticated;
GRANT ALL ON TABLE public.v_penyelia TO service_role;


--
-- Name: TABLE v_ranking_po; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_ranking_po TO authenticated;
GRANT ALL ON TABLE public.v_ranking_po TO service_role;


--
-- Name: TABLE v_ringkasan_po; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_ringkasan_po TO authenticated;
GRANT ALL ON TABLE public.v_ringkasan_po TO service_role;


--
-- Name: TABLE v_ringkasan_wilayah; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.v_ringkasan_wilayah TO authenticated;
GRANT ALL ON TABLE public.v_ringkasan_wilayah TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict vNceY5WZk8sX2cFfdD7hsqp0EqVvO85AgCcHzhFbN8eSwnSZaAcH9RsmmcaZl98


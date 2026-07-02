# ============================================================
# lib-db.ps1 — Fungsi & data dikongsi oleh backup/restore/dump
# ============================================================
# Guna:  . "$PSScriptRoot\lib-db.ps1"  (dot-source)
# ============================================================

# ── Senarai jadual KANONIK (sumber tunggal untuk ketiga-tiga skrip) ──
# Susunan: parent dahulu, child kemudian (untuk import/restore)
$script:TABLE_IMPORT_ORDER = @(
    # === KUMPULAN A: Master / Config (tiada FK → jadual child) ===
    "pusat_operasi",
    "pengguna",

    # === KUMPULAN B: Rujukan / Seed ===
    "prinsip",
    "kriteria",
    "fail_kulit_keras",
    "seksyen_fail",
    "item_semakan",
    "bank_jawapan",
    "projek_master_2026",
    "crosswalk_daerah_po",
    "po_wilayah",

    # === KUMPULAN C: Sesi & Projek (FK → master/rujukan) ===
    "sesi_audit",
    "projek_ref",
    "matlamat_projek",
    "projek_penyelia",

    # === KUMPULAN D: Audit (FK → pusat_operasi, pengguna, sesi_audit) ===
    "audit",

    # === KUMPULAN E: Dapatan (FK → audit, item_semakan, pengguna) ===
    "dapatan",

    # === KUMPULAN F: NC / OFI (FK → audit, dapatan) ===
    "nc",
    "ofi",

    # === KUMPULAN G: Anak audit (FK → audit / dapatan) ===
    "kehadiran_opening_meeting",
    "aktiviti",
    "bukti",
    "laporan",

    # === KUMPULAN H: Hasil / Dashboard ===
    "hasil_bulanan_src",
    "hasil_harian",
    "hasil_audit",

    # === KUMPULAN I: Arkib (sejarah pra-2023, optional) ===
    "arkib_hasil_pra2023"
)

# ── Jadual yang SENGAJA DI-SKIP dari backup ──
# NOTA: junk TIDAK di-skip — ada data sejarah 2020-2022 yang wajib simpan.
#        Tunggu Fasa 3 rename junk -> arkib_hasil_pra2023,
#        lepas itu baru boleh alih ke $TABLE_IMPORT_ORDER canonical.
$script:TABLE_SKIP = @(
    "hasil_bulanan_final",   # Fasa 3 — akan di-drop
    "qc_log"                 # log QC harian, boleh jana semula
)

# ── Jadual yang MESTI ADA dalam backup (born-in-Supabase, tiada di Sheet) ──
$script:TABLE_WAJIB = @(
    "hasil_audit",
    "sesi_audit",
    "aktiviti",
    "kehadiran_opening_meeting"
)

# ============================================================
# Auto-discover columns with serial/identity from live DB
# Guna pg_class (relkind='r' = ordinary table SAHAJA, buang VIEW)
# + pg_get_serial_sequence IS NOT NULL sebagai tapisan definitif.
# Ini elak bug: hasil_bulanan adalah VIEW, tiada sequence
# (pg_get_serial_sequence pulang NULL untuk VIEW).
# ============================================================
function Get-SerialColumns {
    param($Conn)
    $env:PGPASSWORD = $Conn.Pass
    $sql = @'
SELECT c.relname AS table_name, a.attname AS column_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND pg_get_serial_sequence(
        quote_ident(n.nspname) || '.' || quote_ident(c.relname),
        a.attname
      ) IS NOT NULL
ORDER BY c.relname
'@
    $result = & psql -h $Conn.Host -p $Conn.Port -U $Conn.User -d $Conn.Database --no-psqlrc -t -A -F '|' -c $sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Tidak dapat query pg_class: $result"
        return @()
    }
    $cols = @()
    foreach ($line in ($result -split "\n" | Where-Object { $_ -match '\|' })) {
        $parts = $line.Trim() -split '\|'
        if ($parts.Count -ge 2) {
            $cols += @{ table = $parts[0]; col = $parts[1] }
        }
    }
    return $cols
}

# ── Senarai jadual yang ada trigger (untuk disable/enable semasa import) ──
#    Guna ENABLE TRIGGER ALL untuk robust-ness.
$script:TABLE_WITH_TRIGGERS = @(
    "audit",
    "dapatan",
    "nc",
    "ofi",
    "pusat_operasi",
    "pengguna",
    "sesi_audit"
)

# ============================================================
# Resolve connection string dari env/disk
# ============================================================
function Resolve-DbUrl {
    param([string]$ProjRoot)

    $url = $env:SUPABASE_DB_URL
    if (-not $url) {
        $envFile = "$ProjRoot\.env.local"
        if (Test-Path -LiteralPath $envFile) {
            Get-Content $envFile | ForEach-Object {
                if ($_ -match '^SUPABASE_DB_URL=(.+)$') {
                    $url = $matches[1]
                }
            }
        }
    }
    if (-not $url) {
        $url = Read-Host "Masukkan SUPABASE_DB_URL (postgresql://...)"
    }
    if (-not $url) { throw "SUPABASE_DB_URL diperlukan" }
    return $url
}

# ============================================================
# Parse connection string → parts
# ============================================================
function ConvertFrom-DbUrl {
    param([string]$Url)
    return @{
        User     = $Url -replace '.*://([^:]+).*', '$1'
        Pass     = $Url -replace '.*://[^:]+:([^@]+)@.*', '$1'
        Host     = $Url -replace '.*@([^:/]+).*', '$1'
        Port     = if ($Url -match ':(\d+)/') { $matches[1] } else { '5432' }
        Database = $Url -replace '.*/([^?]+).*', '$1'
    }
}

# ============================================================
# Discover tables dynamically from live DB (untuk audit / verify)
# ============================================================
function Get-LiveTableList {
    param($Conn)
    $env:PGPASSWORD = $Conn.Pass
    $sql = "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('hasil_bulanan_final') ORDER BY tablename"
    $result = & psql -h $Conn.Host -p $Conn.Port -U $Conn.User -d $Conn.Database --no-psqlrc -t -A -c $sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Tidak dapat query pg_tables: $result"
        return @()
    }
    return ($result -split "\n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -match '^[a-z_][a-z0-9_]*$' })
}

# ============================================================
# Invoke SQL on target DB
# ============================================================
function Invoke-Sql {
    param([string]$Sql, $Conn)
    $env:PGPASSWORD = $Conn.Pass
    & psql -h $Conn.Host -p $Conn.Port -U $Conn.User -d $Conn.Database --no-psqlrc -c $Sql 2>&1
}

# ============================================================
# Disable all known triggers
# ============================================================
function Disable-AllTriggers {
    param($Conn)
    Write-Host "  Disabling triggers..." -ForegroundColor Yellow
    $sql = ($TABLE_WITH_TRIGGERS | ForEach-Object {
        "ALTER TABLE public.`"$_`" DISABLE TRIGGER ALL;"
    }) -join "`n"
    Invoke-Sql -Sql $sql -Conn $Conn | Out-Null
    Write-Host "  -> DONE" -ForegroundColor Green
}

# ============================================================
# Enable all known triggers (idempotent — panggil dari finally)
# ============================================================
function Enable-AllTriggers {
    param($Conn)
    Write-Host "  Enabling triggers..." -ForegroundColor Yellow
    $sql = ($TABLE_WITH_TRIGGERS | ForEach-Object {
        "ALTER TABLE public.`"$_`" ENABLE TRIGGER ALL;"
    }) -join "`n"
    Invoke-Sql -Sql $sql -Conn $Conn | Out-Null
    Write-Host "  -> DONE" -ForegroundColor Green
}

# ============================================================
# Reset serial sequences selepas import CSV (elak duplicate-key)
# Auto-discover dari pg_class (relkind='r') — tidak hardcode.
# Tapisan: pg_get_serial_sequence IS NOT NULL — VIEW/objek
# tanpa sequence otomatik diskip (tidak akan dipanggil setval).
# ============================================================
function Reset-AllSequences {
    param($Conn)
    Write-Host ""
    Write-Host "Resetting sequences (pg_class relkind='r' only)..." -ForegroundColor Yellow

    $serials = Get-SerialColumns -Conn $Conn
    if (-not $serials -or $serials.Count -eq 0) {
        Write-Host "  -> Tiada serial/identity column dijumpai. Skip." -ForegroundColor DarkGray
        return
    }
    Write-Host "  Dijumpai $($serials.Count) column (base table sahaja):" -ForegroundColor DarkGray

    foreach ($entry in $serials) {
        $t = $entry.table
        $c = $entry.col

        $seqSql = "SELECT pg_get_serial_sequence('public.$t', '$c')"
        $env:PGPASSWORD = $Conn.Pass
        $seqName = (& psql -h $Conn.Host -p $Conn.Port -U $Conn.User -d $Conn.Database --no-psqlrc -t -A -c $seqSql 2>&1).Trim()

        if (-not $seqName) {
            Write-Host "  $t.$c -> SKIP (pg_get_serial_sequence return NULL)" -ForegroundColor DarkGray
            continue
        }

        $sql = "SELECT setval(pg_get_serial_sequence('public.$t', '$c'), COALESCE((SELECT MAX(`"$c`") FROM public.`"$t`"), 1), true)"
        Write-Host "  $t.$c ($seqName)" -NoNewline
        $out = Invoke-Sql -Sql $sql -Conn $Conn
        $val = ($out | Select-String -Pattern '\d+').Matches.Value
        Write-Host " -> setval($seqName, $val)" -ForegroundColor Green
    }
    Write-Host "  -> DONE" -ForegroundColor Green
}
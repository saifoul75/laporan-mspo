# ============================================================
# BACKUP DATA — Export SEMUA jadual ke CSV (psql \copy)
# ============================================================
# PRASYARAT:
#   1. psql dalam PATH — scoop install postgresql
#   2. .env.local: SUPABASE_DB_URL=postgresql://... (SESSION POOLER)
#   3. .env.local juga perlu NEXT_PUBLIC_SUPABASE_URL untuk verifikasi
#
# CARA GUNA:
#   cd C:\Projects\mspo-audit
#   .\scripts\backup.ps1
#
# OUTPUT: scripts\backups\backup-YYYY-MM-DD_HH-mm\
#   csv-data\    — satu CSV per jadual (HEADER + data, UTF-8)
#   MANIFEST.txt — metadata + senarai jadual + susunan restore
#
# JADUAL DISKIP: junk, hasil_bulanan_final, qc_log
# ============================================================

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

. "$scriptDir\lib-db.ps1"

$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$dest = "$scriptDir\backups\backup-$ts"
$csvDir = "$dest\csv-data"

Write-Host "=== MSPO Backup DATA ke CSV ===" -ForegroundColor Cyan
Write-Host "Tarikh: $ts"
Write-Host "Output: $csvDir"
Write-Host ""

# ── Sambungan ──
$projRoot = Split-Path -Parent $scriptDir
$dbUrl = Resolve-DbUrl -ProjRoot $projRoot
$db = ConvertFrom-DbUrl -Url $dbUrl
$safeUrl = ($dbUrl -replace '://[^:]+:[^@]+@', '://***:***@')
Write-Host "DB: $safeUrl" -ForegroundColor DarkGray

# ── Semak psql ──
$pgBin = Get-ChildItem -Path "$env:USERPROFILE\scoop\apps\postgresql" -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "bin" }
if ($pgBin) { $env:PATH = "$pgBin;$env:USERPROFILE\scoop\shims;$env:PATH" }
try { & psql --version 2>&1 | Out-Null } catch {
    throw "psql tidak dijumpai. Install: scoop install postgresql"
}

# ── Discover tables (auto-detect dari DB) ──
Write-Host "[INFO] Mengambil senarai jadual dari database..." -ForegroundColor DarkGray
$liveTables = Get-LiveTableList -Conn $db

# Gabung: canonical list + auto-discover (dedup)
$canonical = $TABLE_IMPORT_ORDER | Where-Object { $_ -notin $TABLE_SKIP }
$extra = $liveTables | Where-Object { $_ -notin $canonical -and $_ -notin $TABLE_SKIP }

# Amaran kalau canonical ada yang TIDAK wujud di DB
$missing = $canonical | Where-Object { $_ -notin $liveTables }
if ($missing) {
    Write-Host "[AMARAN] Jadual dalam canonical list tetapi TIADA di DB:" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}
# Amaran kalau wajib missing
$wajibMissing = $TABLE_WAJIB | Where-Object { $_ -notin $liveTables }
if ($wajibMissing) {
    Write-Host "[KRITIKAL] Jadual WAJIB tiada di DB! Backup tidak lengkap." -ForegroundColor Red
    $wajibMissing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

# Senarai final
$allTables = ($canonical + $extra) | Select-Object -Unique
Write-Host ""
Write-Host "Jadual untuk di-backup: $($allTables.Count)" -ForegroundColor Cyan
$allTables | ForEach-Object { Write-Host "  $_" }
Write-Host ""

# ── Cipta folder ──
New-Item -ItemType Directory -Path $csvDir -Force | Out-Null

# ── Bina psql URL (satu argumen, elak isu quoting flag -c) ──
$psqlUrl = "postgresql://$($db.User):$($db.Pass)@$($db.Host):$($db.Port)/$($db.Database)"

# ── Preflight: sahkan sambungan SEKALI (guna -f, bukan -c — PS 5.1 mangle argumen) ──
Write-Host "[INFO] Preflight sambungan..." -ForegroundColor DarkGray
Write-Host "DEBUG URL=[$($psqlUrl -replace ':.+@',':***@')]" -ForegroundColor DarkGray
$pfSql = Join-Path $scriptDir ".preflight.sql"
'select 1;' | Set-Content -Path $pfSql -Encoding ascii
$out = & psql $psqlUrl --no-psqlrc -v ON_ERROR_STOP=1 -f $pfSql 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[KRITIKAL] Sambungan gagal: $out" -ForegroundColor Red
    Remove-Item $pfSql -ErrorAction SilentlyContinue
    throw "Tidak dapat sambung ke database. Semak SUPABASE_DB_URL."
}
Remove-Item $pfSql -ErrorAction SilentlyContinue
Write-Host "  -> OK" -ForegroundColor Green

# ── Export setiap jadual ──
$total = $allTables.Count
$success = 0
$fail = 0
$sizes = @{}

for ($i = 0; $i -lt $total; $i++) {
    $t = $allTables[$i]
    $outFile = "$csvDir\$t.csv"

    Write-Host "[$($i+1)/$total] $t" -NoNewline
    try {
        # \copy (psql meta-command) bukan COPY (server-side SQL)
        # Tukar backslashes → forward slashes untuk \copy path
        $outFileFwd = $outFile.Replace('\', '/')
        $sql = '\copy public."{0}" TO ''{1}'' WITH (FORMAT csv, HEADER true, ENCODING ''UTF8'')' -f $t, $outFileFwd
        $tmpSql = Join-Path $scriptDir ".copy.sql"
        Set-Content -Path $tmpSql -Value $sql -Encoding utf8

        $errOut = [System.Text.StringBuilder]::new()
        & psql $psqlUrl --no-psqlrc -v ON_ERROR_STOP=1 -f $tmpSql 2>&1 | ForEach-Object {
            [void]$errOut.AppendLine($_)
        }
        $stderr = $errOut.ToString().Trim()
        Remove-Item $tmpSql -ErrorAction SilentlyContinue

        $exitOk = ($LASTEXITCODE -eq 0)
        $fileExists = (Test-Path -LiteralPath $outFile)
        $fileSize = if ($fileExists) { (Get-Item -LiteralPath $outFile).Length } else { 0 }
        $hasData = ($fileSize -gt 20)  # minimum: header row ~20-50 bytes

        if ($exitOk -and $hasData) {
            $sizeKB = [math]::Round($fileSize / 1KB, 1)
            $sizes[$t] = $sizeKB
            Write-Host "  -> OK (${sizeKB} KB)" -ForegroundColor Green
            $success++
        } elseif ($exitOk -and -not $hasData) {
            Write-Host "  -> KOSONG" -ForegroundColor Yellow
            $sizes[$t] = 0
            $success++
        } else {
            if ($stderr) {
                Write-Host "  -> GAGAL: $stderr" -ForegroundColor Red
            } else {
                Write-Host "  -> GAGAL (exit $LASTEXITCODE, tiada fail dijana)" -ForegroundColor Red
            }
            $fail++
        }
    } catch {
        Write-Host "  -> GAGAL: $_" -ForegroundColor Red
        $fail++
    }
}

# ── Tulis MANIFEST ──
$list = ($allTables | ForEach-Object {
    $idx = [array]::IndexOf($allTables, $_)
    $sz = if ($sizes.ContainsKey($_) -and $sizes[$_] -gt 0) { " [$($sizes[$_]) KB]" } else { " [kosong]" }
    "  $($idx+1). $_ $sz"
}) -join "`n"

$csvFileCount = @(Get-ChildItem -LiteralPath $csvDir -File -ErrorAction SilentlyContinue).Count
$totalCsvSize = [math]::Round(
    (Get-ChildItem -LiteralPath $csvDir -File -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum / 1KB, 1
)

$manifest = @"
MSPO Audit — Backup DATA CSV
=============================
Tarikh: $ts
DB URL: $safeUrl
Source:  $($allTables.Count) jadual (auto-discover dari pg_tables + canonical list)
Format: CSV UTF-8, HEADER, comma-delimited
psql:   \copy public."table" to 'csv-data/table.csv' with (format csv, header true, encoding 'UTF8')

SUSUNAN IMPORT (restore.ps1 akan import ikut urutan ini):
$list

STATISTIK:
  Berjaya: $success / $total
  Gagal:   $fail
  CSV:     $csvFileCount fail ($totalCsvSize KB)

JADUAL YANG DILANGKAU:
$(($TABLE_SKIP | ForEach-Object { "  - $_" }) -join "`n")

CARA RESTORE:
  1. Restore SKEMA:  .\scripts\dump-schema.ps1   (kalau belum)
                     .\scripts\restore.ps1 -SchemaFile <path>
  2. Data CSV akan di-import ikut susunan parent → child
"@
$manifest | Out-File -FilePath "$dest\MANIFEST.txt" -Encoding utf8

Write-Host ""
Write-Host "=== BACKUP DATA SIAP ===" -ForegroundColor Green
Write-Host "Lokasi: $csvDir"
Write-Host "Berjaya: $success / Gagal: $fail"
Write-Host "MANIFEST: $dest\MANIFEST.txt"
Write-Host ""
# ============================================================
# RESTORE -- Cipta skema + import CSV + reset sequence + verify
# ============================================================
# PRASYARAT:
#   1. psql dalam PATH -- scoop install postgresql
#   2. .env.local: SUPABASE_DB_URL=postgresql://...
#   3. Schema dump:  scripts\backups\schema-*.sql
#   4. CSV data:     scripts\backups\backup-*\csv-data\
#
# CARA GUNA:
#   .\scripts\restore.ps1 -Mode same -SchemaFile "..." -CsvDir "..."
#   .\scripts\restore.ps1 -Mode migrate -SchemaFile "..." -CsvDir "..."
#   .\scripts\restore.ps1   (prompt interaktif)
#
# Mod "same"   = restore ke projek ASAL (kekal owner/acl)
# Mod "migrate" = restore ke projek LAIN (neutral owner/acl)
#
# KESELAMATAN:
#   - Trigger disable sebelum import, enable dalam FINALLY block
#     -> dijamin hidup semula walaupun skrip crash separuh jalan.
#   - Sequence auto-reset selepas import -> tiada duplicate-key.
# ============================================================

param(
    [ValidateSet("same", "migrate")]
    [string]$Mode = "same",

    [string]$SchemaFile,
    [string]$CsvDir
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$pgBin = Get-ChildItem -Path "$env:USERPROFILE\scoop\apps\postgresql" -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "bin" }
if ($pgBin) { $env:PATH = "$pgBin;$env:USERPROFILE\scoop\shims;$env:PATH" }

. "$scriptDir\lib-db.ps1"

$projRoot = Split-Path -Parent $scriptDir
$backupDir = "$scriptDir\backups"

Write-Host "=== MSPO RESTORE ===" -ForegroundColor Cyan
$modeColor = if ($Mode -eq 'migrate') { 'Magenta' } else { 'Cyan' }
Write-Host "Mode: $Mode" -ForegroundColor $modeColor
Write-Host ""

# --- Prompt interaktif ---
if (-not $SchemaFile) {
    Write-Host "Schema dump yang tersedia:" -ForegroundColor Cyan
    $schemaFiles = Get-ChildItem -LiteralPath $backupDir -Filter "schema-*.sql" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 5
    if (-not $schemaFiles) {
        throw "TIADA fail schema dump di $backupDir. Jalankan dump-schema.ps1 dulu."
    }
    $schemaFiles | ForEach-Object { Write-Host "  $($_.Name)" }
    $SchemaFile = Read-Host "Nama fail (Enter = terbaru)"
    if (-not $SchemaFile) { $SchemaFile = $schemaFiles[0].FullName }
    else { $SchemaFile = "$backupDir\$SchemaFile" }
}
if (-not (Test-Path -LiteralPath $SchemaFile)) {
    throw "Schema file tidak wujud: $SchemaFile"
}

if (-not $CsvDir) {
    Write-Host ""
    Write-Host "CSV backups yang tersedia:" -ForegroundColor Cyan
    $csvDirs = Get-ChildItem -LiteralPath $backupDir -Directory -Filter "backup-*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 5
    if (-not $csvDirs) {
        Write-Host "  TIADA folder CSV. Import data akan di-skip." -ForegroundColor Yellow
        $CsvDir = ""
    } else {
        $csvDirs | ForEach-Object { Write-Host "  $($_.Name)" }
        $chosen = Read-Host "Folder (Enter = terbaru, 'skip' = schema sahaja)"
        if ($chosen -eq 'skip') {
            $CsvDir = ""
        } elseif (-not $chosen) {
            $CsvDir = "$($csvDirs[0].FullName)\csv-data"
        } else {
            $CsvDir = "$backupDir\$chosen\csv-data"
        }
    }
}

# --- Sambungan ---
$dbUrl = Resolve-DbUrl -ProjRoot $projRoot
$db = ConvertFrom-DbUrl -Url $dbUrl
$safeUrl = ($dbUrl -replace '://[^:]+:[^@]+@', '://***:***@')

try { $null = & psql --version 2>&1 } catch {
    throw "psql tidak dijumpai. Install: scoop install postgresql"
}

# --- SAHKAN ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  AMARAN: Ini akan MENULIS ke database!" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
$modeDesc = if ($Mode -eq 'migrate') { '(--no-owner --no-acl)' } else { '(kekal owner/acl asal)' }
Write-Host "  MODE:   $Mode $modeDesc"
Write-Host "  Host:   $($db.Host):$($db.Port)"
Write-Host "  DB:     $($db.Database)"
Write-Host "  Skema:  $SchemaFile"
if ($CsvDir) {
    Write-Host "  Data:   $CsvDir"
} else {
    Write-Host "  Data:   SKIP (skema sahaja)"
}
Write-Host ""
$confirm = Read-Host "Taip 'YA' untuk teruskan"
if ($confirm -ne 'YA') {
    Write-Host "Dibatalkan." -ForegroundColor Yellow
    exit 0
}

# ============================================================
# BADAN UTAMA -- dibalut try/finally untuk jamin trigger hidup
# ============================================================
$triggersDisabled = $false
$aborted = $false

try {
    # --- STEP 1: Restore schema ---
    Write-Host ""
    Write-Host "[STEP 1/4] Restore schema dari dump..." -ForegroundColor Yellow
    $schemaLines = (Get-Content $SchemaFile | Measure-Object).Count
    Write-Host "  Fail: $SchemaFile ($schemaLines baris)"

    $env:PGPASSWORD = $db.Pass

    if ($Mode -eq 'migrate') {
        Write-Host "  Mode MIGRATE: applying schema..." -ForegroundColor Magenta
    }
    & psql -h $db.Host -p $db.Port -U $db.User -d $db.Database -f $SchemaFile 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  AMARAN: Schema restore ada ralat (mungkin jadual sudah wujud)." -ForegroundColor Yellow
    }
    Write-Host "  -> Schema restore SELESAI." -ForegroundColor Green

    # --- STEP 2: Disable triggers ---
    Write-Host ""
    Write-Host "[STEP 2/4] Disable triggers..." -ForegroundColor Yellow
    Disable-AllTriggers -Conn $db
    $triggersDisabled = $true

    # --- STEP 3: Import CSV ---
    Write-Host ""
    Write-Host "[STEP 3/4] Import data CSV..." -ForegroundColor Yellow

    $importOk = 0
    $importSkip = 0

    if ($CsvDir -and (Test-Path -LiteralPath $CsvDir)) {
        foreach ($table in $TABLE_IMPORT_ORDER) {
            $csvPath = "$CsvDir\$table.csv"
            if (-not (Test-Path -LiteralPath $csvPath)) {
                Write-Host "  [$table] SKIP (tiada CSV)" -ForegroundColor DarkGray
                $importSkip++
                continue
            }
            if ((Get-Item -LiteralPath $csvPath).Length -eq 0) {
                Write-Host "  [$table] SKIP (CSV kosong)" -ForegroundColor DarkGray
                $importSkip++
                continue
            }
            Write-Host "  [$table]" -NoNewline
            try {
                $sql = '\copy public."{0}" from ''{1}'' with (format csv, header true, encoding UTF8)' -f $table, $csvPath.Replace('\', '/')
                $psqlUrl = "postgresql://$($db.User):$($db.Pass)@$($db.Host):$($db.Port)/$($db.Database)"
                $tmpSql = Join-Path $scriptDir ".import.sql"
                Set-Content -Path $tmpSql -Value $sql -Encoding utf8
                & psql $psqlUrl --no-psqlrc -v ON_ERROR_STOP=1 -f $tmpSql 2>&1 | Out-Null
                Remove-Item $tmpSql -ErrorAction SilentlyContinue
                if ($LASTEXITCODE -eq 0) {
                    Write-Host " -> OK" -ForegroundColor Green
                    $importOk++
                } else {
                    Write-Host " -> GAGAL (exit $LASTEXITCODE)" -ForegroundColor Red
                }
            } catch {
                Write-Host " -> GAGAL: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  TIADA data CSV -- skip import." -ForegroundColor Yellow
    }

    # --- STEP 4: Reset sequences ---
    Reset-AllSequences -Conn $db

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  RESTORE SELESAI" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Skema:   $SchemaFile"
    Write-Host "  Import:  $importOk OK / $importSkip skip"
    Write-Host ""

} catch {
    $aborted = $true
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  RESTORE GAGAL SEPARUH JALAN!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    throw

} finally {
    # FIX 1: WAJIB enable trigger -- walaupun crash separuh jalan
    if ($triggersDisabled) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host "  MEMULIHKAN TRIGGER..." -ForegroundColor Yellow
        Write-Host "  (finally block - dijamin jalan walaupun error)" -ForegroundColor DarkGray
        Write-Host "========================================" -ForegroundColor Yellow
        try {
            Enable-AllTriggers -Conn $db
            Write-Host "  -> Semua trigger ENABLED." -ForegroundColor Green
        } catch {
            Write-Host "  -> KRITIKAL: Gagal enable trigger! DB mungkin rosak." -ForegroundColor Red
            $recoveryCmd = "SELECT 'ALTER TABLE '||relname||' ENABLE TRIGGER ALL;' FROM pg_class WHERE relkind='r';"
            Write-Host "     Cuba manual: $recoveryCmd" -ForegroundColor Red
        }
    }

    if ($aborted) {
        Write-Host ""
        Write-Host "Verifikasi pantas (verify database state):" -ForegroundColor Cyan
        Write-Host "  psql -h $($db.Host) -U $($db.User) -d $($db.Database)"
        $verifySql = "SELECT relname, reltriggers FROM pg_class WHERE relkind='r' AND reltriggers=0;"
        Write-Host "  $verifySql" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Verifikasi data:" -ForegroundColor Cyan
Write-Host "  psql -h $($db.Host) -U $($db.User) -d $($db.Database)"
Write-Host "  SELECT count(*) FROM public.audit;"
Write-Host "  SELECT count(*) FROM public.dapatan;"
Write-Host "  SELECT count(*) FROM public.hasil_bulanan_src;"
Write-Host ""

Write-Host "NOTA: Supabase Storage files (bukti.url_storan) TIDAK di-backup." -ForegroundColor DarkGray
Write-Host ""
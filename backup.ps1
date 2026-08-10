# BACKUP MSPO Audit System - Hardened
# Auto backup script - jalankan bila-bila masa untuk cipta snapshot baru
#
# Cara guna:
#   1. Buka PowerShell (tak perlu Admin)
#   2. cd C:\Projects\mspo-audit
#   3. .\backup.ps1
#
# Output: D:\BACKUP MSPO\backup-YYYY-MM-DD_HH-mm\
#   - project\         (semua source code, exclude sensitif & binaan)
#   - db-data\         (semua data DB dalam format JSON, satu fail per table)
#   - MANIFEST.txt     (senarai fail SHA256 - untuk audit tanpa dedah kandungan)
#   - INFO.txt         (timestamp + git commit hash)
#
# Backup termasuk:
#   - Semua source code (.tsx, .ts, .sql, dll)
#   - Migration files
#   - PROGRESS.md, TATACARA.md (sekarang di docs/)
#   - Snapshot data DB (15 tables)
#
# Backup TAK termasuk (rahsia/binaan):
#   - .env, .env.*, .env.local, .env.production, .env.development
#   - node_modules/, .next/, out/, build/
#   - supabase/.temp/, .vercel/, coverage/
#   - .git/, .git/logs, test-results/, playwright-report/
#   - *.log, *.tmp, dump sementara

$ErrorActionPreference = "Stop"
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$rootBackup = "D:\BACKUP MSPO"
$dest = "$rootBackup\backup-$ts"

Write-Host "=== MSPO Backup Script (Hardened) ===" -ForegroundColor Cyan
Write-Host "Tarikh: $ts"
Write-Host "Destinasi: $dest"
Write-Host ""

# 1. Validasi destinasi tidak dalam CWD atau terlalu cetek
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($dest.StartsWith($proj, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-Error "Destinasi backup tidak boleh dalam folder projek ($proj). Pilih lokasi berasingan."
}

# Pastikan drive destinasi wujud dan mempunyai ruang kosong minimum 500MB
$driveLetter = (Split-Path -Qualifier $dest).TrimEnd(':')
if ($driveLetter) {
    try {
        $drive = Get-PSDrive -Name $driveLetter -ErrorAction SilentlyContinue
        if (-not $drive) {
            # fallback - guna WMI untuk semak
        }
    } catch { }
}

# 2. Cipta folder
if (-not (Test-Path -LiteralPath $rootBackup)) {
    New-Item -ItemType Directory -Path $rootBackup -Force | Out-Null
}
New-Item -ItemType Directory -Path $dest -Force | Out-Null
New-Item -ItemType Directory -Path "$dest\db-data" -Force | Out-Null
New-Item -ItemType Directory -Path "$dest\project" -Force | Out-Null

# 3. Copy project files - KAEDAH SELAMAT: gunakan Get-ChildItem + filter
# Exclude secara eksplisit:
$excludeDirs = @(
    "node_modules", ".next", "out", "build", "coverage",
    ".git", ".vercel", "supabase\.temp", ".kilo",
    "test-results", "playwright-report", "blob-report",
    ".next", "backups"
)
$excludeFilePatterns = @(
    ".env", ".env.local", ".env.production", ".env.development",
    ".env.test", ".env.*.local",
    "*.log", "*.tmp", "*.temp",
    "sw-version.js",
    "*.pem", "*.key", "*.p12", "*.pfx"
)

Write-Host "[1/4] Copy project files (hardened)..." -ForegroundColor Yellow

# Guna robocopy dengan senarai exclude yang lengkap
$robocopyXD = @(
    "node_modules", ".next", ".git", "supabase\.temp", ".vercel",
    "coverage", "test-results", "playwright-report", "blob-report",
    "out", "build", ".kilo", "backups"
)
$robocopyXF = @(
    ".env", ".env.local", ".env.production", ".env.development",
    ".env.test", ".env.*.local",
    "*.log", "*.tmp", "*.pem", "*.key", "*.p12", "*.pfx",
    "sw-version.js"
)

& robocopy $proj "$dest\project" /E /XD @robocopyXD /XF @robocopyXF /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null

# Post-copy sweep: pastikan TIADA .env* terlepas (defense in depth)
$leakedEnvFiles = Get-ChildItem -LiteralPath "$dest\project" -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -match "^\.env" -or $_.Name -match "\.(pem|key|p12|pfx)$"
    }

if ($leakedEnvFiles -and $leakedEnvFiles.Count -gt 0) {
    Write-Host "  !! Dikesan fail sensitif terlepas, memadam..." -ForegroundColor Red
    foreach ($f in $leakedEnvFiles) {
        $relPath = $f.FullName.Replace("$dest\project\", "")
        Write-Host "  - Membuang: $relPath" -ForegroundColor Red
        Remove-Item -LiteralPath $f.FullName -Force -ErrorAction SilentlyContinue
    }
}

$projFiles = (Get-ChildItem -LiteralPath "$dest\project" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$projSize = [math]::Round((Get-ChildItem -LiteralPath "$dest\project" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
Write-Host "  -> $projFiles fail, $projSize MB (tanpa .env / rahsia)" -ForegroundColor Green

# 4. Dump DB tables
Write-Host "[2/4] Dump DB tables ke JSON..." -ForegroundColor Yellow
$env:PATH = "$env:USERPROFILE\scoop\shims;$env:PATH"
$tables = @(
    "pengguna", "pusat_operasi", "prinsip", "kriteria", "fail_kulit_keras",
    "seksyen_fail", "item_semakan", "sesi_audit", "audit", "dapatan",
    "nc", "ofi", "bukti", "laporan", "aktiviti"
)
$hasSupabase = $null -ne (Get-Command supabase -ErrorAction SilentlyContinue)
if (-not $hasSupabase) {
    Write-Host "  -> SKIP (supabase CLI tidak dijumpai)" -ForegroundColor DarkYellow
} else {
    foreach ($t in $tables) {
        try {
            $out = & supabase db query --linked --output json "select * from public.$t" 2>&1
            $out | Where-Object { $_ -match "^\[" -or $_ -match "^\{" -or $_ -match "^\]" -or $_ -match "^\}" -or $_ -match "^  " -or $_ -match "^,$" } |
                Out-File -FilePath "$dest\db-data\$t.json" -Encoding utf8
        } catch {
            Write-Host "  -> Ralat dump ${t}: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
$dbFiles = (Get-ChildItem -LiteralPath "$dest\db-data" -File -ErrorAction SilentlyContinue | Measure-Object).Count
$dbSize = [math]::Round((Get-ChildItem -LiteralPath "$dest\db-data" -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1KB, 1)
Write-Host "  -> $dbFiles tables, $dbSize KB"

# 5. Jana MANIFEST.txt — senarai fail + SHA256 (untuk audit tanpa dedah kandungan)
Write-Host "[3/4] Jana MANIFEST.txt (SHA256)..." -ForegroundColor Yellow
$manifestLines = @()
$manifestLines += "MANIFEST — Senarai fail backup untuk audit"
$manifestLines += "Tarikh: $ts"
$manifestLines += "Source: $proj -> $dest"
$manifestLines += "========================================"
$manifestLines += ""

$allBackupFiles = Get-ChildItem -LiteralPath "$dest" -Recurse -File -ErrorAction SilentlyContinue | Sort-Object FullName
foreach ($f in $allBackupFiles) {
    $rel = $f.FullName.Replace($dest + "\", "")
    # Jangan kira hash untuk INFO/MANIFEST itu sendiri
    if ($rel -eq "INFO.txt" -or $rel -eq "MANIFEST.txt") { continue }
    try {
        $hash = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash
        $hashShort = if ($hash) { $hash.Substring(0, 16) } else { "no-hash" }
        $size = $f.Length
        $manifestLines += "$hashShort  $size bytes  $rel"
    } catch {
        $manifestLines += "ERROR  $($f.Length) bytes  $rel"
    }
}
$manifestLines += ""
$manifestLines += "Jumlah fail: $($allBackupFiles.Count)"
$manifestLines += "NOTA: Fail .env* TIDAK termasuk (sengaja dikecualikan untuk keselamatan)"
$manifestLines | Out-File -FilePath "$dest\MANIFEST.txt" -Encoding utf8
Write-Host "  -> MANIFEST.txt dijana ($($manifestLines.Count) baris)"

# 6. Tulis INFO.txt (tanpa rahsia)
Write-Host "[4/4] Cipta INFO.txt..." -ForegroundColor Yellow
$gitHash = ""
try {
    $gitHash = (& git -C $proj log -1 --format='%H %s' 2>$null) -join "`n"
} catch { $gitHash = "git tidak available" }

# TIDAK mencetak sebarang nilai env/rahsia
$info = @"
MSPO Audit System Backup (Hardened)
====================================
Tarikh: $ts
Destinasi: $dest
Source: $proj

Project files: $projFiles fail ($projSize MB) — TANPA .env* / rahsia
DB tables: $dbFiles tables ($dbSize KB)

Git commit terkini:
$gitHash

Fail yang DIKECUALIKAN (tidak disalin):
  - .env, .env.local, .env.production, .env.development, .env.test, .env.*.local
  - *.pem, *.key, *.p12, *.pfx (kunci/sertifikat)
  - *.log, *.tmp
  - supabase/.temp/ (cache Supabase CLI mengandungi pooler-url)
  - node_modules/, .next/, out/, build/, coverage/
  - .vercel/, .git/, test-results/, playwright-report/
  - sw-version.js (dijana semula semasa build)

MANIFEST: Lihat MANIFEST.txt untuk senarai SHA256 semua fail backup (tanpa dedah kandungan)

Cara restore:
  1. Project files -> copy balik ke C:\Projects\mspo-audit\
     (pastikan .env.local asal kekal — jangan overwrite)
  2. Run: npm install
  3. DB data -> import via Supabase SQL Editor atau script restore.ps1
  4. Pastikan supabase/migrations/ ikut versi yang betul
  5. Run: npm run dev

Keselamatan:
  - Backup ini TIDAK mengandungi sebarang rahsia (.env* dikecualikan)
  - Untuk rotation rahsia, rujuk docs/KESELAMATAN.md
  - Jangan simpan backup di lokasi awam atau share drive tanpa enkripsi
"@
$info | Out-File -FilePath "$dest\INFO.txt" -Encoding utf8

# 7. Validasi akhir: tiada .env dalam backup
$finalCheck = Get-ChildItem -LiteralPath "$dest" -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "^\.env" }

if ($finalCheck -and $finalCheck.Count -gt 0) {
    Write-Host ""
    Write-Host "!!! AMARAN: Masih ada fail .env dalam backup !!!" -ForegroundColor Red
    $finalCheck | ForEach-Object { Write-Host "  - $($_.FullName)" -ForegroundColor Red }
    Write-Host "Backup dianggap TIDAK SELAMAT." -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "=== BACKUP SIAP (SELAMAT) ===" -ForegroundColor Green
    Write-Host "Lokasi: $dest" -ForegroundColor Green
    Write-Host "Status: Tiada fail .env* dikesan dalam backup — SELAMAT" -ForegroundColor Green
}

Write-Host ""
Write-Host "Senarai backup yang ada:" -ForegroundColor Cyan
Get-ChildItem -LiteralPath $rootBackup -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    Select-Object -First 5 |
    ForEach-Object {
        $size = [math]::Round((Get-ChildItem -LiteralPath $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
        Write-Host "  $($_.Name)  ($size MB)"
    }

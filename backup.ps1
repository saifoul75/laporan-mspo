# BACKUP MSPO Audit System
# Auto backup script - jalankan bila-bila masa untuk cipta snapshot baru
#
# Cara guna:
#   1. Buka PowerShell (tak perlu Admin)
#   2. cd C:\Projects\mspo-audit
#   3. .\backup.ps1
#
# Output: D:\BACKUP MSPO\backup-YYYY-MM-DD_HH-mm\
#   - project\         (semua source code, exclude node_modules/.next/.git/logs)
#   - db-data\         (semua data DB dalam format JSON, satu fail per table)
#   - INFO.txt         (timestamp + git commit hash)
#
# Backup termasuk:
#   - Semua source code (.tsx, .ts, .sql, dll)
#   - Migration files
#   - PROGRESS.md, TATACARA.md (sekarang di docs/)
#   - Snapshot data DB (15 tables)
#
# Backup TAK termasuk:
#   - node_modules/  (boleh restore via npm install)
#   - .next/         (boleh build semula)
#   - .git/          (history kekal di local sebab tiada remote — buat backup separate kalau perlu)
#   - .env.local     (sensitive, kekal di local)

$ErrorActionPreference = "Stop"
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$rootBackup = "D:\BACKUP MSPO"
$dest = "$rootBackup\backup-$ts"

Write-Host "=== MSPO Backup Script ===" -ForegroundColor Cyan
Write-Host "Tarikh: $ts"
Write-Host "Destinasi: $dest"
Write-Host ""

# 1. Cipta folder
if (-not (Test-Path -LiteralPath $rootBackup)) {
    New-Item -ItemType Directory -Path $rootBackup -Force | Out-Null
}
New-Item -ItemType Directory -Path $dest -Force | Out-Null
New-Item -ItemType Directory -Path "$dest\db-data" -Force | Out-Null

# 2. Copy project files
Write-Host "[1/3] Copy project files..." -ForegroundColor Yellow
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path
& robocopy $proj "$dest\project" /E /XD node_modules .next .git\logs supabase\.temp /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
$projFiles = (Get-ChildItem -LiteralPath "$dest\project" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$projSize = [math]::Round((Get-ChildItem -LiteralPath "$dest\project" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
Write-Host "  -> $projFiles fail, $projSize MB"

# 3. Dump DB tables
Write-Host "[2/3] Dump DB tables ke JSON..." -ForegroundColor Yellow
$env:PATH = "$env:USERPROFILE\scoop\shims;$env:PATH"
$tables = @(
    "pengguna","pusat_operasi","prinsip","kriteria","fail_kulit_keras",
    "seksyen_fail","item_semakan","sesi_audit","audit","dapatan",
    "nc","ofi","bukti","laporan","aktiviti"
)
foreach ($t in $tables) {
    $out = & supabase db query --linked --output json "select * from public.$t" 2>&1
    $out | Where-Object { $_ -match "^\[" -or $_ -match "^\{" -or $_ -match "^\]" -or $_ -match "^\}" -or $_ -match "^  " -or $_ -match "^,$" } |
        Out-File -FilePath "$dest\db-data\$t.json" -Encoding utf8
}
$dbFiles = (Get-ChildItem -LiteralPath "$dest\db-data" -File | Measure-Object).Count
$dbSize = [math]::Round((Get-ChildItem -LiteralPath "$dest\db-data" -File | Measure-Object -Property Length -Sum).Sum / 1KB, 1)
Write-Host "  -> $dbFiles tables, $dbSize KB"

# 4. Tulis INFO.txt
Write-Host "[3/3] Cipta INFO.txt..." -ForegroundColor Yellow
$gitHash = ""
try {
    $gitHash = (& git -C $proj log -1 --format='%H %s' 2>$null) -join "`n"
} catch { $gitHash = "git tidak available" }

$info = @"
MSPO Audit System Backup
========================
Tarikh: $ts
Destinasi: $dest
Source: $proj

Project files: $projFiles fail ($projSize MB)
DB tables: $dbFiles tables ($dbSize KB)

Git commit terkini:
$gitHash

Cara restore:
  1. Project files -> copy balik ke C:\Projects\mspo-audit\
  2. Run: npm install
  3. DB data -> import via Supabase SQL Editor atau script restore.sql
  4. Pastikan supabase/migrations/ ikut versi yang betul
  5. Run: npm run dev

Cara guna data JSON:
  - Setiap fail .json dalam db-data/ ialah array of rows
  - Boleh import via INSERT INTO ... SELECT * FROM jsonb_to_recordset(...)
  - Atau guna pgloader / psql \copy

NOTA: .env.local TIDAK termasuk dalam backup (sensitive).
       Pastikan anda backup .env.local secara berasingan kalau perlu.
"@
$info | Out-File -FilePath "$dest\INFO.txt" -Encoding utf8

Write-Host ""
Write-Host "=== BACKUP SIAP ===" -ForegroundColor Green
Write-Host "Lokasi: $dest"
Write-Host ""
Write-Host "Senarai backup yang ada:" -ForegroundColor Cyan
Get-ChildItem -LiteralPath $rootBackup -Directory |
    Sort-Object Name -Descending |
    Select-Object -First 5 |
    ForEach-Object {
        $size = [math]::Round((Get-ChildItem -LiteralPath $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
        Write-Host "  $($_.Name)  ($size MB)"
    }

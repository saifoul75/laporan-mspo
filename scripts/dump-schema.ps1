# scripts/dump-schema.ps1
# Backup DDL penuh (schema-only) untuk lapisan RESTORE:
# tables, views, functions, triggers, sequences, RLS policies, GRANT/REVOKE.
$ErrorActionPreference = "Stop"
# --- 1. Baca SUPABASE_DB_URL dari .env.local ---
$envPath = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envPath)) { throw ".env.local tak dijumpai: $envPath" }
$dbUrl = $null
foreach ($line in Get-Content $envPath) {
if ($line -match 'SUPABASE_DB_URL\s*=\s*(.+)') {
$dbUrl = $matches[1].Trim().Trim('"')
}
}
if (-not $dbUrl) { throw "SUPABASE_DB_URL tak dijumpai dalam .env.local" }
# --- 2. Preflight: pastikan pg_dump wujud + versi ---
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) { throw "pg_dump tak dijumpai dalam PATH. Install PostgreSQL client tools (versi >= server)." }
Write-Host "pg_dump: $($pgDump.Source)"
& pg_dump --version
# --- 3. Output folder + timestamp ---
$stamp  = Get-Date -Format "yyyy-MM-dd_HH-mm"
$outDir = Join-Path $PSScriptRoot "..\backups\schema"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outFile = Join-Path $outDir "schema-$stamp.sql"
# --- 4. Dump schema 'public' sahaja (skip auth/storage/extensions yg Supabase urus) ---
#     TANPA --no-privileges  => GRANT/REVOKE + RLS policies KEKAL
#     --no-owner             => elak error ownership masa restore
Write-Host "Dumping schema -> $outFile ..."
& pg_dump $dbUrl --schema-only --schema=public --no-owner -f $outFile
if ($LASTEXITCODE -ne 0) { throw "pg_dump gagal (exit $LASTEXITCODE)" }
# --- 5. Sanity check: fail tak kosong + kira objek ---
$size = (Get-Item $outFile).Length
if ($size -lt 1024) { throw ("Fail schema terlalu kecil ({0} bytes) -- kemungkinan gagal." -f $size) }
$sql = Get-Content $outFile -Raw
$tables    = ([regex]::Matches($sql, 'CREATE TABLE')).Count
$views     = ([regex]::Matches($sql, 'CREATE VIEW|CREATE OR REPLACE VIEW')).Count
$functions = ([regex]::Matches($sql, 'CREATE FUNCTION')).Count
$triggers  = ([regex]::Matches($sql, 'CREATE TRIGGER')).Count
$policies  = ([regex]::Matches($sql, 'CREATE POLICY')).Count
$grants    = ([regex]::Matches($sql, '(?m)^GRANT ')).Count
Write-Host ""
Write-Host ("SIAP: {0} ({1:N1} KB)" -f $outFile, ($size/1KB))
Write-Host "Tables=$tables  Views=$views  Functions=$functions  Triggers=$triggers  Policies=$policies  Grants=$grants"

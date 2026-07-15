# dump-staging-safe.ps1 — Dump staging tanpa service_role / rahsia
param(
    [string]$Project = "mspo-audit"
)

$ErrorActionPreference = "Continue"
$ts = Get-Date -Format "yyyyMMdd-HHmm"
$outFile = ".\pre-0026-staging-$ts.sql"

Write-Host "=== Dump Staging (tanpa service_role) ===" -ForegroundColor Cyan
Write-Host "Output: $outFile"
Write-Host ""

# 1. Semak migration list
Write-Host "[1/3] Semak migration status..." -ForegroundColor Yellow
npx supabase migration list 2>&1 | Select-Object -Last 40
Write-Host ""

# 2. Dump pg_policies sebelum push
Write-Host "[2/3] Simpan pg_policies & role_table_grants..." -ForegroundColor Yellow
$policiesQuery = @"
SELECT tablename, policyname, roles::text, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('laporan','hasil_bulanan','hasil_bulanan_src','audit','dapatan','nc','ofi')
ORDER BY tablename, policyname;
"@

$grantsQuery = @"
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_name='laporan' AND grantee IN ('anon','authenticated');
"@

$rpcQuery = @"
SELECT routine_name, routine_type FROM information_schema.routines
WHERE routine_name LIKE '%dengan_token%' OR routine_name LIKE '%kongsi%';
"@

$fullQuery = @"
-- PRE-PUSH SNAPSHOT $ts
-- Policies
$policiesQuery

-- Grants
$grantsQuery

-- RPCs
$rpcQuery

-- Storage policies
SELECT policyname, roles::text FROM pg_policies WHERE tablename='objects' AND policyname LIKE 'Bukti audit%';
"@

try {
    $fullQuery | npx supabase db query --linked 2>&1 | Out-File -FilePath ".\pre-0026-policies-$ts.txt" -Encoding utf8
    Write-Host "  -> pre-0026-policies-$ts.txt disimpan" -ForegroundColor Green
    Get-Content ".\pre-0026-policies-$ts.txt" | Select-Object -First 30 | ForEach-Object { Write-Host "    $_" }
} catch {
    Write-Host "  -> Gagal dump policies: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Info env tracking
Write-Host "[3/3] Semak .env* tracking..." -ForegroundColor Yellow
$envTracked = git ls-files | Select-String "\.env" | Where-Object { $_ -notmatch ".env.example" }
if ($envTracked) {
    Write-Host "  !! .env* terjejak:" -ForegroundColor Red
    $envTracked | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
} else {
    Write-Host "  -> OK tiada .env* terjejak (hanya .env.example)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Sedia untuk supabase db push ke staging" -ForegroundColor Green
Write-Host "JANGAN push ke production"

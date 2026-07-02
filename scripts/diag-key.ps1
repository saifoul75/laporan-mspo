# diag-key.ps1
# Diagnostik format SUPABASE_SERVICE_ROLE_KEY dalam .env.local
# Tak print full key (selamat) - hanya struktur/format

$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "[GAGAL] Tak jumpa .env.local di: $envPath" -ForegroundColor Red
    exit 1
}

$targetKey = "SUPABASE_SERVICE_ROLE_KEY"
$val = $null

foreach ($line in Get-Content $envPath) {
    $t = $line.Trim()
    if ($t.Length -eq 0) { continue }
    if ($t.StartsWith("#")) { continue }
    $eq = $t.IndexOf("=")
    if ($eq -lt 1) { continue }
    $name = $t.Substring(0, $eq).Trim()
    if ($name -eq $targetKey) {
        $val = $t.Substring($eq + 1).Trim().Trim('"').Trim("'")
        break
    }
}

Write-Host "=== Diagnostik $targetKey ===" -ForegroundColor Cyan

if ($null -eq $val) {
    Write-Host "[GAGAL] Key '$targetKey' tak wujud dalam .env.local" -ForegroundColor Red
    exit 1
}

$len = $val.Length
$dots = ($val.ToCharArray() | Where-Object { $_ -eq '.' }).Count
$prefix6 = if ($len -ge 6) { $val.Substring(0, 6) } else { $val }
$last4 = if ($len -ge 4) { $val.Substring($len - 4) } else { $val }

Write-Host ("Panjang       : {0} aksara" -f $len)
Write-Host ("Prefix (6)    : {0}" -f $prefix6)
Write-Host ("Suffix (4)    : {0}" -f $last4)
Write-Host ("Bilangan dot  : {0}" -f $dots)

$startsEyJ = $val.StartsWith("eyJ")
$startsSb = $val.StartsWith("sb_secret_")

Write-Host ("Mula 'eyJ'    : {0}" -f $startsEyJ)
Write-Host ("Mula 'sb_secret_' : {0}" -f $startsSb)

# Semak ada whitespace tersembunyi / newline
$hasSpace = $val.Contains(" ")
$hasTab = $val.Contains("`t")
$hasCR = $val.Contains("`r")
$hasNL = $val.Contains("`n")
Write-Host ("Ada ruang     : {0}" -f $hasSpace)
Write-Host ("Ada tab       : {0}" -f $hasTab)
Write-Host ("Ada CR/NL     : {0} / {1}" -f $hasCR, $hasNL)

Write-Host ""
Write-Host "=== VERDIK ===" -ForegroundColor Cyan

$verdictOk = $false

if ($startsEyJ) {
    if ($dots -eq 2 -and $len -gt 200) {
        Write-Host "[OK] Format JWT klasik nampak SAH (eyJ, 2 dot, > 200 aksara)." -ForegroundColor Green
        $verdictOk = $true
    } else {
        Write-Host "[AMARAN] Mula 'eyJ' tapi struktur JWT PELIK:" -ForegroundColor Yellow
        Write-Host ("  - Jangkaan: 2 dot (dapat $dots), > 200 aksara (dapat $len)")
        Write-Host "  - Kemungkinan terpotong / rosak / tersalin separuh."
    }
}
elseif ($startsSb) {
    if ($len -ge 40) {
        Write-Host "[OK] Format baru 'sb_secret_' nampak SAH." -ForegroundColor Green
        $verdictOk = $true
    } else {
        Write-Host "[AMARAN] Mula 'sb_secret_' tapi terlalu pendek ($len) - kemungkinan terpotong." -ForegroundColor Yellow
    }
}
else {
    Write-Host "[GAGAL] Key TAK mula dengan 'eyJ' mahupun 'sb_secret_'." -ForegroundColor Red
    Write-Host "  - Ini bukan service_role key yang sah -> punca 403 'Invalid Compact JWS'."
}

if ($hasSpace -or $hasTab -or $hasCR -or $hasNL) {
    Write-Host "[AMARAN] Ada whitespace/newline tersembunyi dalam key - boleh sebabkan 403." -ForegroundColor Yellow
    $verdictOk = $false
}

Write-Host ""
if ($verdictOk) {
    Write-Host "KESIMPULAN: Format key OK. Kalau masih 403, mungkin key SAH tapi SALAH (bukan service_role) - banding dengan GD Script Property SUPABASE_KEY." -ForegroundColor Green
} else {
    Write-Host "KESIMPULAN: Key BERMASALAH. FIX: salin service_role key dari GD Apps Script (Script Property SUPABASE_KEY) ganti dalam .env.local. JANGAN rotate JWT secret." -ForegroundColor Red
    exit 1
}

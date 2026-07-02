# scripts/dump-storage.ps1 -- backup fail Supabase Storage + QC
$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envPath)) { throw ".env.local tak dijumpai: $envPath" }

function Get-EnvVal($prefix) {
    foreach ($l in Get-Content $envPath) {
        $t = $l.Trim()
        if ($t.StartsWith($prefix)) { return $t.Substring($prefix.Length).Trim().Trim('"') }
    }
}

$supaUrl = Get-EnvVal "NEXT_PUBLIC_SUPABASE_URL="
$key     = Get-EnvVal "SUPABASE_SERVICE_ROLE_KEY="
if (-not $supaUrl) { throw "NEXT_PUBLIC_SUPABASE_URL tak dijumpai" }
if (-not $key)     { throw "SUPABASE_SERVICE_ROLE_KEY tak dijumpai" }

$supaUrl = $supaUrl.TrimEnd('/')
$headers = @{ apikey = $key; Authorization = "Bearer $key" }
$base = "$supaUrl/storage/v1"

$stamp  = Get-Date -Format "yyyy-MM-dd_HH-mm"
$outDir = Join-Path $PSScriptRoot "..\backups\storage\$stamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# --- Senarai bucket ---
$buckets = @(Invoke-RestMethod -Method Get -Uri "$base/bucket" -Headers $headers)
if ($buckets.Count -eq 0) { Write-Host "Tiada bucket."; return }

Write-Host ("Jumpa {0} bucket: {1}" -f $buckets.Count, ($buckets.name -join ", "))

# --- List rekursif (folder = item dgn id null) ---
function Get-AllObjects($bucket, $prefix) {
    $out = @()
    $offset = 0; $limit = 1000
    do {
        $body = @{ prefix = $prefix; limit = $limit; offset = $offset;
                   sortBy = @{ column = "name"; order = "asc" } } | ConvertTo-Json
        $items = @(Invoke-RestMethod -Method Post -Uri "$base/object/list/$bucket" `
                   -Headers $headers -Body $body -ContentType "application/json")
        foreach ($it in $items) {
            $path = if ($prefix) { "$prefix/$($it.name)" } else { $it.name }
            if ($null -eq $it.id) { $out += Get-AllObjects $bucket $path }  # folder -> recurse
            else { $out += $path }
        }
        $offset += $limit
    } while ($items.Count -eq $limit)
    return $out
}

# --- Muat turun + QC 0-byte ---
$totalFiles = 0; $totalBytes = 0; $zeroByte = @()
foreach ($b in $buckets) {
    $paths = @(Get-AllObjects $b.name "")
    Write-Host ("Bucket '{0}': {1} objek" -f $b.name, $paths.Count)
    foreach ($p in $paths) {
        $dest = Join-Path $outDir (Join-Path $b.name ($p -replace '/', '\'))
        New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null

        $enc = ($p -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
        Invoke-WebRequest -Uri "$base/object/$($b.name)/$enc" -Headers $headers -OutFile $dest | Out-Null

        $len = (Get-Item $dest).Length
        $totalBytes += $len; $totalFiles++
        if ($len -eq 0) { $zeroByte += "$($b.name)/$p" }
    }
}

# --- Ringkasan + QC ---
$mb = [math]::Round($totalBytes / 1MB, 2)
Write-Host ""
Write-Host "SIAP: $outDir"
Write-Host "Jumlah fail: $totalFiles   Saiz: $mb MB"
if ($zeroByte.Count -gt 0) {
    Write-Host "AMARAN: $($zeroByte.Count) fail 0-byte:"
    $zeroByte | ForEach-Object { Write-Host "  - $_" }
} else { Write-Host "QC: tiada fail 0-byte. OK." }

# --- Reconcile lawan DB (oracle bebas) ---
$dbUrl = Get-EnvVal "SUPABASE_DB_URL="
if ($dbUrl -and (Get-Command psql -ErrorAction SilentlyContinue)) {
    $tmp = Join-Path $env:TEMP "qc-storage.sql"
    "SELECT count(*) FROM bukti WHERE url_storan IS NOT NULL AND url_storan <> '';" |
       Set-Content -Encoding UTF8 $tmp
    $dbRaw = (& psql $dbUrl --no-psqlrc -v ON_ERROR_STOP=1 -tA -f $tmp) 2>&1
    Remove-Item $tmp -ErrorAction SilentlyContinue

    $dbCount = ($dbRaw | Select-Object -Last 1).ToString().Trim()
    Write-Host ""
    Write-Host "RECONCILE: DB rujuk $dbCount fail (bukti.url_storan); backup turun $totalFiles fail."
    Write-Host "  (Boleh beza jika bucket dikongsi 2 app atau ada fail yatim/rujukan mati.)"
}

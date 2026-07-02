# scripts/verify-backup.ps1 -- QC: banding CSV lawan DB (oracle bebas)
param([string]$BackupDir)

$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot "..\.env.local"

function Get-EnvVal($prefix) {
    foreach ($l in Get-Content $envPath) {
        $t = $l.Trim()
        if ($t.StartsWith($prefix)) { return $t.Substring($prefix.Length).Trim().Trim('"') }
    }
}

$dbUrl = Get-EnvVal "SUPABASE_DB_URL="
if (-not $dbUrl) { throw "SUPABASE_DB_URL tak dijumpai" }

if (-not $BackupDir) {
    $latest = Get-ChildItem (Join-Path $PSScriptRoot "backups") -Directory -Filter "backup-*" |
              Sort-Object Name -Descending | Select-Object -First 1
    $BackupDir = $latest.FullName
}
Write-Host "QC backup dir: $BackupDir"

$csvs = Get-ChildItem $BackupDir -Filter *.csv -Recurse
$fail = 0
foreach ($csv in $csvs) {
    # nama jadual = nama fail tanpa suffix stamp _YYYYMMDD...
    $table = $csv.BaseName -replace '_\d{8}_\d{4,}$', ''
    # kira baris CSV (tolak header)
    $lines = 0
    $reader = New-Object System.IO.StreamReader($csv.FullName)
    while ($null -ne $reader.ReadLine()) { $lines++ }
    $reader.Close()
    $csvRows = [math]::Max(0, $lines - 1)

    # oracle: DB count (guna temp .sql + -f, elak masalah quoting PowerShell)
    $tmp = Join-Path $env:TEMP "qc-count.sql"
    "SELECT count(*) FROM `"$table`";" | Set-Content -Encoding UTF8 $tmp
    $dbRaw = (& psql $dbUrl --no-psqlrc -v ON_ERROR_STOP=1 -tA -f $tmp) 2>&1
    Remove-Item $tmp -ErrorAction SilentlyContinue

    $dbRows = ($dbRaw | Select-Object -Last 1).ToString().Trim()
    $match = ($dbRows -match '^\d+$') -and ([int]$csvRows -eq [int]$dbRows) -and ($csv.Length -gt 0)
    if ($match) { $mark = "OK  " } else { $mark = "BEZA"; $fail++ }
    Write-Host ("[{0}] {1}: CSV={2}  DB={3}  saiz={4:N0}B" -f $mark, $table, $csvRows, $dbRows, $csv.Length)
}
Write-Host ""
if ($fail -gt 0) { Write-Host "QC GAGAL: $fail jadual TAK sepadan lawan DB." }
else { Write-Host "QC LULUS: semua CSV sepadan lawan DB." }

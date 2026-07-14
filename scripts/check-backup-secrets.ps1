# check-backup-secrets.ps1 — Semak backup lama untuk fail berisiko TANPA baca kandungan
# Penggunaan: .\scripts\check-backup-secrets.ps1 [-Path "D:\BACKUP MSPO"]
# Output: hanya nama fail + lokasi, TIDAK mencetak kandungan atau nilai rahsia

param(
    [string]$Path = "D:\BACKUP MSPO"
)

$ErrorActionPreference = "SilentlyContinue"

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Host "Path tidak wujud: $Path" -ForegroundColor DarkYellow
    exit 0
}

Write-Host "=== Semakan Backup untuk Fail Berisiko ===" -ForegroundColor Cyan
Write-Host "Lokasi: $Path"
Write-Host ""

$patterns = @(
    @{ label = ".env files"; pattern = ".env*" },
    @{ label = "Key files (*.key)"; pattern = "*.key" },
    @{ label = "PEM files (*.pem)"; pattern = "*.pem" },
    @{ label = "P12/PFX files"; pattern = "*.p12" },
    @{ label = "PFX files"; pattern = "*.pfx" },
    @{ label = "pooler-url"; pattern = "pooler-url" },
    @{ label = "temp secrets"; pattern = "*.secret" }
)

$foundAny = $false

foreach ($p in $patterns) {
    $files = Get-ChildItem -LiteralPath $Path -Recurse -File -Force -Filter $p.pattern -ErrorAction SilentlyContinue
    if ($files -and $files.Count -gt 0) {
        $foundAny = $true
        Write-Host "!! $($p.label) — $($files.Count) fail dikesan:" -ForegroundColor Red
        foreach ($f in $files | Select-Object -First 20) {
            $rel = $f.FullName.Replace($Path, "").TrimStart("\")
            Write-Host "   - $rel  (saiz: $($f.Length) bytes)" -ForegroundColor Red
        }
        if ($files.Count -gt 20) {
            Write-Host "   ... dan $($files.Count - 20) fail lagi" -ForegroundColor DarkRed
        }
        Write-Host ""
    } else {
        Write-Host "OK $($p.label) — tiada dikesan" -ForegroundColor Green
    }
}

# Semak tambahan: fail yang namanya mengandungi SERVICE_ROLE, DB_URL etc (tanpa baca kandungan, hanya nama)
$envLikeNames = @(
    "*SERVICE_ROLE*",
    "*SUPABASE_DB_URL*",
    "*GMAIL_USER*",
    "*GMAIL_APP_PASSWORD*",
    "*CRON_SECRET*"
)

foreach ($pat in $envLikeNames) {
    $files = Get-ChildItem -LiteralPath $Path -Recurse -File -Force -Filter $pat -ErrorAction SilentlyContinue
    if ($files -and $files.Count -gt 0) {
        $foundAny = $true
        Write-Host "!! Nama fail mencurigakan '$pat' — $($files.Count) fail:" -ForegroundColor Red
        foreach ($f in $files | Select-Object -First 10) {
            Write-Host "   - $($f.FullName.Replace($Path,'').TrimStart('\'))" -ForegroundColor Red
        }
    }
}

Write-Host ""
if ($foundAny) {
    Write-Host "RUMUSAN: Terdapat fail berisiko — sila semak backup lama dan pertimbangkan putar rahsia" -ForegroundColor Red
    Write-Host "TIDAK mencetak kandungan fail untuk keselamatan" -ForegroundColor DarkYellow
} else {
    Write-Host "RUMUSAN: Tiada fail berisiko dikesan berdasarkan nama fail" -ForegroundColor Green
    Write-Host "Nota: Semakan ini hanya berdasarkan NAMA fail, bukan kandungan" -ForegroundColor DarkGray
}

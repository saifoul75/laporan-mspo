param([string]$Path = "D:\BACKUP MSPO")
$ErrorActionPreference = "SilentlyContinue"
if (-not (Test-Path -LiteralPath $Path)) { Write-Host "Path tidak wujud: $Path" -ForegroundColor DarkYellow; exit 0 }
Write-Host "=== Semakan Backup untuk Fail Berisiko ===" -ForegroundColor Cyan
Write-Host "Lokasi: $Path"
Write-Host ""
$patterns = @(
  @{ label = ".env files"; pattern = ".env*" },
  @{ label = "Key *.key"; pattern = "*.key" },
  @{ label = "PEM *.pem"; pattern = "*.pem" },
  @{ label = "P12 *.p12"; pattern = "*.p12" },
  @{ label = "PFX *.pfx"; pattern = "*.pfx" },
  @{ label = "pooler-url"; pattern = "pooler-url" }
)
$foundAny = $false
foreach ($p in $patterns) {
  $files = Get-ChildItem -LiteralPath $Path -Recurse -File -Force -Filter $p.pattern -ErrorAction SilentlyContinue
  if ($files -and $files.Count -gt 0) {
    $foundAny = $true
    Write-Host "!! $($p.label) - $($files.Count) fail:" -ForegroundColor Red
    foreach ($f in $files | Select-Object -First 20) {
      $rel = $f.FullName.Replace($Path, "").TrimStart("\")
      Write-Host "   - $rel (saiz: $($f.Length) bytes)" -ForegroundColor Red
    }
  } else {
    Write-Host "OK $($p.label) - tiada" -ForegroundColor Green
  }
}
Write-Host ""
if ($foundAny) {
  Write-Host "RUMUSAN: Ada fail berisiko - pertimbang putar rahsia" -ForegroundColor Red
} else {
  Write-Host "RUMUSAN: Tiada fail berisiko dikesan (berdasar NAMA fail)" -ForegroundColor Green
}
Write-Host "TIDAK mencetak kandungan fail" -ForegroundColor DarkGray

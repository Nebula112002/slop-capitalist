# Expose Slop Capitalist on the Tailscale tailnet (HTTPS :8896)

$ErrorActionPreference = "Stop"

if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
  throw "tailscale CLI not found. Install from https://tailscale.com/download/windows"
}

Write-Host "Tailscale Serve -> https://calebscomputer.tailfdadcb.ts.net:8896"
& tailscale serve --bg --yes --https 8896 "http://127.0.0.1:8896"
if ($LASTEXITCODE -ne 0) {
  throw "tailscale serve failed with exit code $LASTEXITCODE"
}

Write-Host ""
& tailscale serve status
Write-Host ""
Write-Host "Open: https://calebscomputer.tailfdadcb.ts.net:8896" -ForegroundColor Green
Write-Host "(tailnet only - phone/PC must be on Tailscale)" -ForegroundColor DarkGray

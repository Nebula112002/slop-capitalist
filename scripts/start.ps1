#Requires -Version 5.1
<#
.SYNOPSIS
  Start Slop Capitalist on :8896 (PC only).
#>
[CmdletBinding()]
param(
    [int]$Port = 8896,
    [string]$Bind = '0.0.0.0',
    [switch]$Dev
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$RunDir = Join-Path $Root '.run'
$PidFile = Join-Path $RunDir 'slop-capitalist.pid'
$OutLog = Join-Path $RunDir 'slop-capitalist.out.log'
$ErrLog = Join-Path $RunDir 'slop-capitalist.err.log'
$HealthUrl = "http://127.0.0.1:$Port/api/health"
$FallbackUrl = "http://127.0.0.1:$Port/"
$env:Path = "$env:Path;C:\Program Files\nodejs"

$NpmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $NpmCmd) { $NpmCmd = Get-Command npm -ErrorAction Stop }

function Test-UrlOk([string]$Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400)
    } catch {
        return $false
    }
}

if (-not (Test-Path $RunDir)) {
    New-Item -ItemType Directory -Path $RunDir | Out-Null
}

if ((Test-UrlOk $HealthUrl) -or (Test-UrlOk $FallbackUrl)) {
    Write-Host "Slop Capitalist already healthy at $HealthUrl" -ForegroundColor Green
    try { & "$PSScriptRoot\enable-tailscale.ps1" } catch { Write-Warning "Tailscale Serve not applied: $_" }
    exit 0
}

if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
    Write-Host "Installing npm deps..." -ForegroundColor Yellow
    Push-Location $Root
    try {
        & $NpmCmd.Source install --no-fund --no-audit
        if ($LASTEXITCODE -ne 0) { throw "npm install failed ($LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

$useDev = [bool]$Dev
$distIndex = Join-Path $Root 'dist\index.html'
if (-not $useDev -and -not (Test-Path $distIndex)) {
    Write-Host "Building production bundle..." -ForegroundColor Yellow
    Push-Location $Root
    try {
        & $NpmCmd.Source run build
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Production build failed; falling back to vite dev"
            $useDev = $true
        }
    } finally {
        Pop-Location
    }
}

if (Test-Path $PidFile) {
    $existing = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existing -and ($existing -as [int])) {
        Stop-Process -Id ([int]$existing) -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 400
    }
}

Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
        $p = Get-Process -Id $_ -ErrorAction SilentlyContinue
        if ($p -and $p.ProcessName -notmatch 'tailscale') {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
    }

if (Test-Path $OutLog) { Remove-Item $OutLog -Force }
if (Test-Path $ErrLog) { Remove-Item $ErrLog -Force }

if ($useDev) {
    $npmArgs = @('run', 'dev', '--', '--host', $Bind, '--port', "$Port")
} else {
    $npmArgs = @('run', 'preview', '--', '--host', $Bind, '--port', "$Port", '--strictPort')
}

$proc = Start-Process -FilePath $NpmCmd.Source `
    -ArgumentList $npmArgs `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -PassThru
$proc.Id | Set-Content -Path $PidFile -Encoding ascii

$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    if ((Test-UrlOk $HealthUrl) -or (Test-UrlOk $FallbackUrl)) { $ready = $true; break }
    if (-not (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue)) {
        throw "Slop Capitalist process exited. See $ErrLog"
    }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    throw "Slop Capitalist started (PID $($proc.Id)) but health check failed. See $ErrLog"
}

try {
    & "$PSScriptRoot\enable-tailscale.ps1"
} catch {
    Write-Warning "Tailscale Serve not applied: $_"
}

$mode = if ($useDev) { 'dev' } else { 'preview' }
Write-Host "Slop Capitalist running ($mode, PID $($proc.Id))" -ForegroundColor Green
Write-Host "Local:   http://127.0.0.1:$Port" -ForegroundColor Cyan
Write-Host "Tailnet: https://calebscomputer.tailfdadcb.ts.net:$Port" -ForegroundColor Cyan

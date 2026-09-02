#Requires -Version 5.1
<#
.SYNOPSIS
  Start Slop Capitalist on :8896 (PC only) and enable Tailscale Serve.
#>
[CmdletBinding()]
param(
    [int]$Port = 8896,
    [string]$Bind = '0.0.0.0',
    [switch]$Dev,
    [switch]$Open,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$RunDir = Join-Path $Root '.run'
$PidFile = Join-Path $RunDir 'slop-capitalist.pid'
$OutLog = Join-Path $RunDir 'slop-capitalist.out.log'
$ErrLog = Join-Path $RunDir 'slop-capitalist.err.log'
$HealthUrl = "http://127.0.0.1:$Port/api/health"
$FallbackUrl = "http://127.0.0.1:$Port/"
$env:Path = "C:\Program Files\nodejs;$env:Path"

$NodePath = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $NodePath)) {
    $NodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $NodeCmd) { $NodeCmd = Get-Command node -ErrorAction Stop }
    $NodePath = $NodeCmd.Source
}

function Write-Info([string]$Message, [string]$Color = 'White') {
    if (-not $Quiet) { Write-Host $Message -ForegroundColor $Color }
}

function Test-UrlOk([string]$Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400)
    } catch {
        return $false
    }
}

function Test-Healthy {
    return (Test-UrlOk $HealthUrl) -or (Test-UrlOk $FallbackUrl)
}

function Enable-Tailnet {
    try { & "$PSScriptRoot\enable-tailscale.ps1" } catch {
        if (-not $Quiet) { Write-Warning "Tailscale Serve not applied: $_" }
    }
}

if (-not (Test-Path $RunDir)) {
    New-Item -ItemType Directory -Path $RunDir | Out-Null
}

if (Test-Healthy) {
    Write-Info "Slop Capitalist already healthy at $HealthUrl" 'Green'
    Enable-Tailnet
    if ($Open) { Start-Process $FallbackUrl }
    exit 0
}

if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
    Write-Info "Installing npm deps..." 'Yellow'
    $NpmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $NpmCmd) { $NpmCmd = Get-Command npm -ErrorAction Stop }
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
    Write-Info "Building production bundle..." 'Yellow'
    $NpmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $NpmCmd) { $NpmCmd = Get-Command npm -ErrorAction Stop }
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

$ViteJs = Join-Path $Root 'node_modules\vite\bin\vite.js'
if (-not (Test-Path $ViteJs)) {
    throw "Vite is missing at $ViteJs. Run npm install in $Root"
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

$viteMode = if ($useDev) { 'dev' } else { 'preview' }
$nodeArgs = @(
    $ViteJs
    $viteMode
    '--host', $Bind
    '--port', "$Port"
    '--strictPort'
)

$proc = Start-Process -FilePath $NodePath `
    -ArgumentList $nodeArgs `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -PassThru
$proc.Id | Set-Content -Path $PidFile -Encoding ascii

$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    if (Test-Healthy) { $ready = $true; break }
    if (-not (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue)) {
        $err = if (Test-Path $ErrLog) { Get-Content $ErrLog -Raw } else { '' }
        throw "Slop Capitalist process exited. See $ErrLog`n$err"
    }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    throw "Slop Capitalist started (PID $($proc.Id)) but health check failed. See $ErrLog"
}

Enable-Tailnet

Write-Info "Slop Capitalist running ($viteMode, PID $($proc.Id))" 'Green'
Write-Info "Local:   http://127.0.0.1:$Port" 'Cyan'
Write-Info "Tailnet: https://calebscomputer.tailfdadcb.ts.net:$Port" 'Cyan'
if ($Open) { Start-Process $FallbackUrl }

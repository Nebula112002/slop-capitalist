#Requires -Version 5.1
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root '.run\slop-capitalist.pid'
$Port = 8896

if (Test-Path $PidFile) {
    $existing = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existing -and ($existing -as [int])) {
        Stop-Process -Id ([int]$existing) -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped PID $existing"
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
        $procId = $_
        $p = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
        $name = if ($p) { $p.Name } else { '' }
        $cmd = if ($p) { $p.CommandLine } else { '' }
        if ($name -match '^(node|npm)(\.exe)?$' -or ($cmd -and $cmd -match 'vite')) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped listener PID $procId on :$Port"
        }
    }

Write-Host "Slop Capitalist stopped."

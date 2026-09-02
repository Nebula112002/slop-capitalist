@echo off
title Slop Capitalist
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" -Open
if errorlevel 1 (
  echo.
  echo Start failed. Log: "%~dp0.run\slop-capitalist.err.log"
  pause
)

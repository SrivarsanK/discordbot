@echo off
:: update-and-start.bat
:: Double-click launcher for update-and-start.ps1
:: Runs with execution-policy bypass so no manual PS setup needed

title DSC SRM RMP Bot - Auto Updater

echo.
echo  Launching DSC SRM RMP Bot Auto-Updater...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-and-start.ps1" %*

echo.
echo  Script finished. Press any key to close.
pause >nul

@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [Info] Registering nch-mediinfo protocol...

:: 1. Register base protocol
reg add "HKCU\Software\Classes\nch-mediinfo" /ve /t REG_SZ /d "URL:nch-mediinfo Protocol" /f
reg add "HKCU\Software\Classes\nch-mediinfo" /v "URL Protocol" /t REG_SZ /d "" /f

:: 2. Register command with proper quotes
reg add "HKCU\Software\Classes\nch-mediinfo\shell\open\command" /ve /t REG_SZ /d "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%~dp0launch_mediinfo.ps1\" \"%%1\"" /f

echo [Success] Registry successfully updated!
echo You can now use nch-mediinfo:// links in your browser.

pause

@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║          🛑 STUDENTNET - UNIFIED SERVER STOP 🛑            ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 🔍 Searching for running processes...
echo.

REM Kill only processes bound to the StudentNet dev ports
for %%p in (3001 5173) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p"') do (
        echo Stopping process %%a on port %%p...
        taskkill /F /PID %%a 2>nul
    )
)

echo ✅ StudentNet dev ports checked

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║             ✅ All servers have been stopped!              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

timeout /t 2 /nobreak

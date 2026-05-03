@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║          🚀 STUDENTNET - UNIFIED SERVER START 🚀           ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo ⏳ Checking local SQLite setup...
timeout /t 2 /nobreak

echo.
echo 📥 Installing dependencies if needed...
echo.

REM Check if node_modules exist in root
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)

REM Check backend dependencies
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

REM Check frontend dependencies
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                  ✅ Ready to Start!                        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 🔄 Starting StudentNet development servers...
echo.

echo ✅ Backend API:  http://localhost:3001
echo ✅ Frontend dev: http://localhost:5173
echo.
echo 💡 Tip: Open browser and go to http://localhost:5173
echo.
echo 🛑 To stop: Press Ctrl+C in this window or run STOP_ALL.bat
echo.

timeout /t 2 /nobreak

REM Start both backend and frontend
cd backend
start cmd /k "node server.js"

timeout /t 3 /nobreak

cd ..
cd frontend
npm run dev

pause

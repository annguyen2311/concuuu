#!/bin/bash

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║          🚀 STUDENTNET - UNIFIED SERVER START 🚀           ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "⏳ Checking local SQLite setup..."
sleep 2

echo ""
echo "📥 Installing dependencies if needed..."
echo ""

# Check and install root dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

# Check and install backend dependencies
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

# Check and install frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  ✅ Ready to Start!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "🔄 Starting StudentNet development servers..."
echo ""

echo "✅ Backend API:  http://localhost:3001"
echo "✅ Frontend dev: http://localhost:5173"
echo ""
echo "💡 Tip: Open browser and go to http://localhost:5173"
echo ""
echo "🛑 To stop: Press Ctrl+C in this window or run: bash STOP_ALL.sh"
echo ""

sleep 2

# Start backend in background
cd backend
node server.js &
BACKEND_PID=$!
sleep 3
cd ..

# Start frontend
cd frontend
npm run dev
cd ..

# Trap to cleanup on exit
trap "kill $BACKEND_PID" EXIT

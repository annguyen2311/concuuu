#!/bin/bash

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║          🛑 STUDENTNET - UNIFIED SERVER STOP 🛑            ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "🔍 Searching for running processes..."
echo ""

for port in 3001 5173; do
    if command -v lsof >/dev/null 2>&1; then
        pids=$(lsof -ti tcp:$port)
        if [ -n "$pids" ]; then
            echo "Stopping StudentNet process on port $port..."
            kill $pids 2>/dev/null || true
        fi
    fi
done

pkill -f "backend/server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "✅ StudentNet dev processes checked"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║             ✅ All servers have been stopped!              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

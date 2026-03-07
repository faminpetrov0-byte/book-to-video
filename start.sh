#!/bin/bash
# Quick start script — runs backend + frontend concurrently
set -e

cd "$(dirname "$0")"

# Kill background jobs on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo "🎬 Starting Book-to-Video AI..."
echo ""

# Start backend
echo "🔧 Starting backend on :3001..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
sleep 3

# Start frontend
echo "🎨 Starting frontend on :5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ App running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo "   API docs: http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop"

# Wait for any process to exit
wait

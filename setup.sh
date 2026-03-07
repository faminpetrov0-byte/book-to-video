#!/bin/bash
set -e

echo "🎬 Book-to-Video AI MVP — Setup"
echo "================================"

cd "$(dirname "$0")"

# Create necessary directories
mkdir -p backend/uploads backend/output

# Backend setup
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo ""
echo "🗄️ Running database migrations..."
npx prisma generate
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push

echo ""
echo "🧪 Running tests..."
npx vitest run --reporter=verbose 2>&1 || echo "⚠️  Some tests may have failed"

cd ..

# Frontend setup
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the app:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:5173"

#!/usr/bin/env bash
# CipherLoom Runner Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=== Starting CipherLoom Engine ==="

# 1. Start Backend
echo "Starting FastAPI Backend on http://localhost:8000 ..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# 2. Start Frontend Dev Server
echo "Starting Vite Frontend on http://localhost:3000 ..."
cd frontend
npm run dev -- --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!
cd ..

echo "CipherLoom is live:"
echo " - Web Dashboard:  http://localhost:3000"
echo " - API & Direct:   http://localhost:8000"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM

wait

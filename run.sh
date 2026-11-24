#!/usr/bin/env bash
# CipherLoom Runner Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# 1. Environment check for Backend
# If no virtual environment is active in the current shell, check for local venvs
if [ -z "$VIRTUAL_ENV" ]; then
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f "backend/.venv/bin/activate" ]; then
        source backend/.venv/bin/activate
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    elif [ -f "backend/venv/bin/activate" ]; then
        source backend/venv/bin/activate
    fi
fi

# Verify Python dependencies are present in the active environment
if ! python3 -c "import fastapi, uvicorn, numpy, scipy, pydub" &> /dev/null; then
    echo "❌ Error: Required backend dependencies are missing from your current Python environment."
    echo ""
    echo "Please activate your virtual environment or install dependencies:"
    echo "  source .venv/bin/activate  # (or create one: python3 -m venv .venv)"
    echo "  pip install -r requirements.txt"
    echo ""
    exit 1
fi

# 2. Dependency check for Frontend
if ! command -v npm &> /dev/null; then
    echo "❌ Error: 'npm' not found in PATH. Please install Node.js."
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "❌ Error: Frontend dependencies not installed ('frontend/node_modules' missing)."
    echo ""
    echo "Please install frontend dependencies first:"
    echo "  cd frontend && npm install && cd .."
    echo ""
    exit 1
fi

echo "=== Starting CipherLoom Engine ==="

# 3. Start Backend
echo "Starting FastAPI Backend on http://localhost:8000 ..."
(cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!

# 4. Start Frontend Dev Server
echo "Starting Vite Frontend on http://localhost:3000 ..."
(cd frontend && npm run dev -- --host 0.0.0.0 --port 3000) &
FRONTEND_PID=$!

echo ""
echo "CipherLoom is live:"
echo " - Web Dashboard:  http://localhost:3000"
echo " - API & Docs:     http://localhost:8000/docs"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM

wait

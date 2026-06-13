#!/usr/bin/env bash
set -euo pipefail

echo "==> Setting up Pulse HMS development environment..."

# Backend setup
echo "  -> Backend dependencies..."
cd "$(dirname "$0")/../backend"

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

# Apply migrations
echo "  -> Running database migrations..."
flask --app app.py db -d migrations upgrade 2>/dev/null || echo "  [WARN] Migrations failed, try: AUTO_CREATE_TABLES=true"

# Seed demo data
echo "  -> Seeding demo data..."
python seed.py 2>/dev/null || echo "  [WARN] Seed skipped (tables may already exist)"

# Frontend setup
echo "  -> Frontend dependencies..."
cd "$(dirname "$0")/../frontend"
npm install

echo ""
echo "==> Setup complete."
echo "Run 'make dev' to start the application."

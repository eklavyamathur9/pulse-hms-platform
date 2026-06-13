#!/usr/bin/env bash
set -euo pipefail

echo "==> Seeding Pulse HMS database..."
cd "$(dirname "$0")/../backend"
python seed.py "$@"
echo "==> Done."

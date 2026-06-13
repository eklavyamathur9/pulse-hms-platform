#!/usr/bin/env bash
set -euo pipefail

echo "==> Pulse HMS Health Check"
echo ""

BACKEND_URL="${1:-http://localhost:5000}"
FRONTEND_URL="${2:-http://localhost:5173}"

check_endpoint() {
    local name="$1"
    local url="$2"
    local expected="$3"

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [ "$response" = "$expected" ]; then
        echo "  [PASS] $name ($url) -> $response"
    else
        echo "  [FAIL] $name ($url) -> $response (expected $expected)"
        return 1
    fi
}

echo "Backend:"
check_endpoint "Ping" "$BACKEND_URL/api/ping" "200"
check_endpoint "Health" "$BACKEND_URL/api/health" "200"
check_endpoint "Health DB" "$BACKEND_URL/api/health/db" "200"

echo ""
echo "Frontend:"
check_endpoint "Home" "$FRONTEND_URL" "200"

echo ""
echo "==> All checks done."

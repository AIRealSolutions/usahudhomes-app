#!/bin/bash
# Startup script for USAhudHomes with HUD Sync API

echo "=========================================="
echo "Starting USAhudHomes with HUD Sync API"
echo "=========================================="

# Check if Supabase credentials are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "⚠️  WARNING: Supabase credentials not set"
    echo "   Set SUPABASE_URL and SUPABASE_KEY environment variables"
    echo "   HUD Sync import functionality will not work without them"
    echo ""
fi

# Kill any existing processes on ports 5173 and 5000
echo "Checking for existing processes..."
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null

# Start the Flask API server in the background
echo "Starting HUD Sync API server on port 5000..."
cd /home/ubuntu/usahudhomes-app
python3 api/hud_sync_api.py > /tmp/hud_api.log 2>&1 &
API_PID=$!
echo "API server started (PID: $API_PID)"

# Wait a moment for API to start
sleep 2

# Start the Vite development server
echo "Starting Vite development server on port 5173..."
npm run dev &
VITE_PID=$!
echo "Vite server started (PID: $VITE_PID)"

echo ""
echo "=========================================="
echo "✅ Servers started successfully!"
echo "=========================================="
echo "Frontend: http://localhost:5173"
echo "API: http://localhost:5000"
echo ""
echo "API logs: tail -f /tmp/hud_api.log"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=========================================="

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $API_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    echo "Servers stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for both processes
wait

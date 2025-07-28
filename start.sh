#!/bin/bash

echo "🔥 Starting Bonfire Backup in development mode..."

# Kill any existing processes
pkill -f "vite" || true
pkill -f "electron" || true

# Build the electron main process
npm run build:electron

# Start Vite dev server and wait for it to be ready
echo "Starting Vite dev server..."
npm run dev:react &
VITE_PID=$!

# Wait for Vite to start
sleep 4

# Check which port Vite is using
if curl -s http://localhost:3000 > /dev/null; then
    export VITE_DEV_SERVER_URL="http://localhost:3000"
    echo "Vite running on port 3000"
elif curl -s http://localhost:3001 > /dev/null; then
    export VITE_DEV_SERVER_URL="http://localhost:3001"
    echo "Vite running on port 3001"
else
    echo "Warning: Could not detect Vite port, defaulting to 3001"
    export VITE_DEV_SERVER_URL="http://localhost:3001"
fi

# Start Electron
echo "Starting Electron..."
npx electron .

# Cleanup
kill $VITE_PID 2>/dev/null || true
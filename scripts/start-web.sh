#!/bin/bash

echo "Starting frontend development server..."

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    bun install
fi

# Start development server
echo "Starting Vite dev server..."
bun run dev
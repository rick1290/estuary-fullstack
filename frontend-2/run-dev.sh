#!/bin/bash

# Set environment variables
export NEXT_PUBLIC_API_URL=http://localhost:8000
export NEXT_PUBLIC_WS_URL=ws://localhost:8000
export NEXT_PUBLIC_SITE_URL=http://localhost:3001
export PORT=3001

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
fi

# Generate API client from OpenAPI schema
echo "Generating API client..."
pnpm run generate

# Start the development server
echo "Starting development server on port 3001..."
pnpm run dev
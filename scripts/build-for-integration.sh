#!/bin/bash

# Build and prepare Storybook for BrowserStack integration testing
# Usage: npm run build:integration

set -e  # Exit on any error

echo "🔧 Building SDK for integration testing..."

# Step 1: Build the SDK
echo "1/4 Building Braintree SDK..."
npm run build

# Step 2: Copy local builds to Storybook static directory
echo "2/4 Copying local builds to Storybook..."
npm run storybook:copy-local-build

# Step 3: Build Storybook with local assets
echo "3/4 Building Storybook static files..."
npm run storybook:build

# Step 4: Start HTTPS server in background if not already running
echo "4/4 Starting HTTPS server..."

# Check if server is already running
if curl -k -s https://127.0.0.1:8080 > /dev/null 2>&1; then
    echo "✅ HTTPS server already running at https://127.0.0.1:8080"
else
    echo "🚀 Starting HTTPS server at https://127.0.0.1:8080"
    # Start server in background and save PID
    npm run storybook:run-build > /dev/null 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    echo "⏳ Waiting for server to start..."
    for i in {1..10}; do
        if curl -k -s https://127.0.0.1:8080 > /dev/null 2>&1; then
            echo "✅ Server is ready!"
            break
        fi
        sleep 1
    done
    
    if ! curl -k -s https://127.0.0.1:8080 > /dev/null 2>&1; then
        echo "❌ Server failed to start"
        exit 1
    fi
fi

echo ""
echo "🎉 Integration build complete!"
echo "   - Local builds available at: https://127.0.0.1:8080/local-build/"
echo "   - Storybook available at: https://127.0.0.1:8080"
echo "   - Ready for: npm run test:integration"
echo ""
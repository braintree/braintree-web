#!/bin/bash

# Build and prepare Storybook for BrowserStack integration testing
# Usage: npm run build:integration

set -e  # Exit on any error

# Load .env file if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Verify required environment variables are set
REQUIRED_VARS=(
  "BRAINTREE_JS_API_PORT"
  "BRAINTREE_JS_API_PROTOCOL"
  "BRAINTREE_JS_HOSTED_DEST"
  "BRAINTREE_JS_SOURCE_DEST"
  "BRAINTREE_JS_GRAPH_QL_ENDPOINT"
  "BRAINTREE_JS_ASSET_URL"
  "STORYBOOK_BRAINTREE_TOKENIZATION_KEY"
  "BRAINTREE_JS_ENV"
  "BROWSERSTACK_USERNAME"
  "BROWSERSTACK_ACCESS_KEY"
  "PAYPAL_SANDBOX_BUYER_EMAIL"
  "PAYPAL_SANDBOX_BUYER_PASSWORD"
  "STORYBOOK_BRAINTREE_MERCHANT_ID"
  "STORYBOOK_BRAINTREE_PUBLIC_KEY"
  "STORYBOOK_BRAINTREE_PRIVATE_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo "❌ Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "Set these in your .env file or export them before running this script."
  exit 1
fi

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
if curl -k -s https://localhost:8080 > /dev/null 2>&1; then
    echo "✅ HTTPS server already running at https://localhost:8080"
else
    echo "🚀 Starting HTTPS server at https://localhost:8080"
    # Start server in background and save PID
    npm run storybook:run-build > /dev/null 2>&1 &
    SERVER_PID=$!

    # Wait for server to start
    echo "⏳ Waiting for server to start..."
    for i in {1..10}; do
        if curl -k -s https://localhost:8080 > /dev/null 2>&1; then
            echo "✅ Server is ready!"
            break
        fi
        sleep 1
    done

    if ! curl -k -s https://localhost:8080 > /dev/null 2>&1; then
        echo "❌ Server failed to start"
        exit 1
    fi
fi

echo ""
echo "🎉 Integration build complete!"
echo "   - Local builds available at: https://localhost:8080/local-build/"
echo "   - Storybook available at: https://localhost:8080"
echo "   - Ready for: npm run test:integration"
echo ""

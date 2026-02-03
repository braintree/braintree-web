#!/bin/bash

# Generate self-signed SSL certificates for local HTTPS testing
# Required for Apple Pay and other HTTPS-only features

set -e

CERT_DIR=".storybook/certs"
KEY_FILE="$CERT_DIR/localhost.key"
CERT_FILE="$CERT_DIR/localhost.crt"

echo "🔐 Generating self-signed SSL certificates for testing..."

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$KEY_FILE" ] && [ -f "$CERT_FILE" ]; then
    echo "✅ Certificates already exist at $CERT_DIR"
    echo "   To regenerate, delete the certs directory and run this script again."
    exit 0
fi

# Generate private key and certificate
openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 365 \
    -subj "/C=US/ST=Test/L=Test/O=Braintree Test/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo ""
echo "✅ SSL certificates generated successfully!"
echo "   Key:  $KEY_FILE"
echo "   Cert: $CERT_FILE"
echo ""
echo "⚠️  These are self-signed certificates for testing only."
echo "   BrowserStack will automatically accept them."
echo ""

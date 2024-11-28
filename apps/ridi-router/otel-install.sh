#!/bin/sh

# Detect OS and architecture
OS=$(uname | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
OTEL_VERSION="0.111.0"

if [ "$ARCH" = "x86_64" ]; then
    ARCH="amd64"
elif [ "$ARCH" = "aarch64" ]; then
    ARCH="arm64"
fi

# Construct the download URL
DOWNLOAD_URL="https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${OTEL_VERSION}/otelcol-contrib_${OTEL_VERSION}_${OS}_${ARCH}.tar.gz"

# Download the otel-collector binary
curl -L $DOWNLOAD_URL -o otelcol-contrib.tar.gz

# Extract the binary
tar -xzf otelcol-contrib.tar.gz

# make the binary executable
chmod +x otelcol-contrib

# Move the binary to /usr/local/bin
mv otelcol-contrib /usr/local/bin/

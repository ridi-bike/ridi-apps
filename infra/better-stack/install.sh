#!/bin/bash
set -e

# Get STACK from command line argument, default to dev if not provided
STACK=${1:-dev}

# Validate STACK parameter
if [[ "$STACK" != "dev" && "$STACK" != "prod" ]]; then
  echo "Error: STACK must be either 'dev' or 'prod'"
  echo "Usage: $0 [dev|prod]"
  exit 1
fi

# Set kubectl context based on STACK
if [[ "$STACK" == "dev" ]]; then
  KUBE_CONTEXT="ridi-dev"
else
  KUBE_CONTEXT="ridi-prod"
fi

# Using kubectl context with Helm
echo "Will use kubectl context: $KUBE_CONTEXT"
URI_LOGS=$(pulumi config get better_stack_logs_uri -s "$STACK")
URI_METRICS=$(pulumi config get better_stack_metrics_uri -s "$STACK")
TOKEN=$(pulumi config get better_stack_token -s "$STACK")

# Print configuration for verification
echo "Installing Better Stack with configuration:"
echo "Stack: $STACK (kubectl context: $KUBE_CONTEXT)"
echo "Logs URI: $URI_LOGS"
echo "Metrics URI: $URI_METRICS"

helm repo add betterstack-logs https://betterstackhq.github.io/logs-helm-chart
helm repo update

# Install using Helm with specific kubectl context
helm install betterstack-logs betterstack-logs/betterstack-logs \
  --kube-context="$KUBE_CONTEXT" \
  --set vector.customConfig.sinks.better_stack_http_sink.auth.token="$TOKEN" \
  --set vector.customConfig.sinks.better_stack_http_metrics_sink.auth.token="$TOKEN" \
  --set vector.customConfig.sinks.better_stack_http_sink.uri="$URI_LOGS" \
  --set vector.customConfig.sinks.better_stack_http_metrics_sink.uri="$URI_METRICS" \
  -f values.yaml

echo "Better Stack installation completed successfully."

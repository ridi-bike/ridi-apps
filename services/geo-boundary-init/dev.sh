#!/bin/bash

# Default to latvia if no country is specified
COUNTRY=${1:-latvia}
ENV_FILE=".env.$COUNTRY"

# Check if the environment file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file $ENV_FILE does not exist."
  echo "Available environment files:"
  ls -1 .env.*
  exit 1
fi

# Load environment variables and run the application
set -a
source ./.env.base
source ./$ENV_FILE
set +a
cargo run

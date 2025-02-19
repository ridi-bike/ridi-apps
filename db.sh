#!/bin/bash

set -e

# Function to display help/error text
display_help() {
  echo "Usage: $0 [COMMAND]"
  echo ""
  echo "Available commands:"
  echo "  migrate   Reset database, generate Supabase TypeScript types, and run sqlc"
  echo "  sqlc      Generate SQLC types"
  echo ""
  echo "Error: Invalid or no command provided."
  exit 1
}

# Check if an argument is provided
if [ $# -eq 0 ]; then
  display_help
fi

# Process commands
case "$1" in
"migrate")
  supabase db reset
  rm -rf ./services/ridi-router/.ridi-data/pbf
  rm -rf ./services/ridi-router/.ridi-data/cache
  rm -rf ./services/ridi-router/.ridi-data/db
  # supabase gen types --lang=typescript --local >./services/ridi-router/packages/lib/supabase.ts
  # supabase gen types --lang=typescript --local >./services/cfw-api/src/supabase.ts
  sqlc generate
  ;;
"sqlc")
  sqlc generate
  ;;
*)
  display_help
  ;;
esac

exit 0

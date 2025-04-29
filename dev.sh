set -e
trap "exit" INT

COMMAND=$1

if [ -n "$COMMAND" ] && [ "$COMMAND" != "full" ]; then
  echo "Error: Invalid command '$COMMAND'"
  echo "Available commands:"
  echo "  full - Execute in full mode"
  echo "  (empty) - Execute in normal mode"
  exit 1
fi

systemctl is-active --quiet docker.socket || sudo systemctl start docker.socket

supabase start

if [ "$COMMAND" = "full" ]; then
  echo "Running in full mode"

  (cd ./services/map-data-init/ && pnpm tsc && node --import=tsx --env-file=./.env.base --env-file=./.env.latvia ./src/index.ts | pino-pretty)
  (cd ./services/map-data-init/ && node --import=tsx --env-file=./.env.base --env-file=./.env.greece ./src/index.ts | pino-pretty)
  (cd ./services/map-data-init/ && node --import=tsx --env-file=./.env.base --env-file=./.env.estonia ./src/index.ts | pino-pretty)

  (cd ./services/router-cache-init/ && pnpm tsc && node --import=tsx --env-file=./.env.latvia ./src/index.ts | pino-pretty)
  (cd ./services/router-cache-init/ && node --import=tsx --env-file=./.env.greece ./src/index.ts | pino-pretty)
  (cd ./services/router-cache-init/ && node --import=tsx --env-file=./.env.estonia ./src/index.ts | pino-pretty)

  (cd ./services/geo-boundary-init/ && ./dev.sh latvia)
  (cd ./services/geo-boundary-init/ && ./dev.sh greece)
  (cd ./services/geo-boundary-init/ && ./dev.sh estonia)
fi

mprocs

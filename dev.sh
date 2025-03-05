set -e
trap "exit" INT

systemctl is-active --quiet docker.socket || sudo systemctl start docker.socket

supabase start

(cd ./services/map-data-init/ && pnpm tsc && node --import=tsx --env-file=./.env.base --env-file=./.env.latvia ./src/index.ts | pino-pretty)
(cd ./services/map-data-init/ && node --import=tsx --env-file=./.env.base --env-file=./.env.greece ./src/index.ts | pino-pretty)
(cd ./services/map-data-init/ && node --import=tsx --env-file=./.env.base --env-file=./.env.estonia ./src/index.ts | pino-pretty)

(cd ./services/router-cache-init/ && pnpm tsc && node --import=tsx --env-file=./.env.latvia ./src/index.ts | pino-pretty)
(cd ./services/router-cache-init/ && node --import=tsx --env-file=./.env.greece ./src/index.ts | pino-pretty)
(cd ./services/router-cache-init/ && node --import=tsx --env-file=./.env.estonia ./src/index.ts | pino-pretty)

mprocs

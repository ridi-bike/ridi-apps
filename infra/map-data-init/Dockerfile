FROM node:23-bookworm AS build

ENV DOCKER_ENV="true"

WORKDIR /app

RUN npm install -g pnpm

COPY ./libs/ ./libs
COPY ./services/map-data-init ./services/map-data-init
COPY ./package.json ./package.json
COPY ./husky.sh ./husky.sh
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --prod

CMD ["node", "--import=tsx", "./services/map-data-init/src/index.ts"]

FROM node:23-bookworm AS build

ENV DOCKER_ENV="true"

WORKDIR /app

ARG ROUTER_VERSION

RUN apt-get update && apt-get install -y curl unzip coreutils

RUN curl -L "https://github.com/tomsjansons/ridi-router/releases/download/${ROUTER_VERSION}/ridi-router-linux-amd64.zip" -o ridi-router-linux-amd64.zip \
  && unzip ridi-router-linux-amd64.zip \
  && mv ridi-router-linux-amd64 ridi-router \
  && chmod +x ridi-router

ENV ROUTER_BIN=/app/ridi-router

RUN npm install -g pnpm

COPY ./libs/ ./libs
COPY ./services/router-cache-init ./services/router-cache-init
COPY ./package.json ./package.json
COPY ./husky.sh ./husky.sh
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --prod

CMD ["node", "--max_old_space_size=32000", "--import=tsx", "./services/router-cache-init/src/index.ts"]

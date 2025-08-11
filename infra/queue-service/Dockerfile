FROM node:23-bookworm AS build

ENV DOCKER_ENV="true"

WORKDIR /app

RUN npm install -g pnpm

COPY ./libs/ ./libs
COPY ./services/queue-service ./services/queue-service
COPY ./package.json ./package.json
COPY ./husky.sh ./husky.sh
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --prod

EXPOSE 3000

CMD ["node", "--import=tsx", "./services/queue-service/src/index.ts"]

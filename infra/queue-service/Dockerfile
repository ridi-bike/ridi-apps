FROM node:23-bookworm AS build

WORKDIR /app

RUN npm install -g pnpm

COPY ./libs/ ./libs
COPY ./services/queue-service ./services/queue-service
COPY ./package.json ./package.json
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --prod

EXPOSE 3000

CMD ["node", "--import=tsx", "./services/queue-service/src/index.ts"]

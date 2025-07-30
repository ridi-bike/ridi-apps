FROM node:23-bookworm AS build

ENV DOCKER_ENV="true"

WORKDIR /app

ARG PORT

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/google-chrome

RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

RUN useradd -ms /bin/bash nodeuser

RUN npm install -g pnpm

COPY ./libs/ ./libs
COPY ./services/map-preview-service ./services/map-preview-service
COPY ./package.json ./package.json
COPY ./husky.sh ./husky.sh
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install

# RUN pnpm run --filter=@ridi/map-preview-service build

RUN chown -R nodeuser:nodeuser /app

USER nodeuser

EXPOSE ${PORT}

CMD ["node", "--import=tsx", "./services/map-preview-service/src/server.ts", "--dev"]

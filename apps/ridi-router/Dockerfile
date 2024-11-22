FROM denoland/deno:2.0.0

WORKDIR /app

# Install required packages and clean up
RUN apt-get update && apt-get install -y curl coreutils && rm -rf /var/lib/apt/lists/*

# Build arguments for ridi-router
ARG RIDI_ROUTER_VERSION
ENV RIDI_ROUTER_VERSION=${RIDI_ROUTER_VERSION}

COPY . .
ENV REGION_LIST=./region-list-prod.json
RUN chmod +x startup.sh
RUN cd deploy-handler && deno install --lock deno.lock --frozen=true --entrypoint main.ts
RUN cd map-data-handler && deno install --lock deno.lock --frozen=true --entrypoint main.ts
RUN cd router-handler && deno install --lock deno.lock --frozen=true --entrypoint main.ts

ENV RIDI_ROUTER_BIN=./ridi-router
RUN curl -L "https://github.com/tomsjansons/ridi-router/releases/download/${RIDI_ROUTER_VERSION}/ridi-router" -o ridi-router \
    && chmod +x ridi-router

USER ridi

CMD ["/bin/sh", "./startup.sh"]

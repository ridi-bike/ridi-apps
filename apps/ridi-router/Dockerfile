FROM denoland/deno:2.0.0

WORKDIR /app

# Install required packages and clean up
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Build arguments for ridi-router
ARG RIDI_ROUTER_VERSION=""

# Create a startup script
COPY ./startup.sh .
RUN chmod +x startup.sh

COPY ./region-list.json .

COPY . .
RUN deno install --lock deno.lock --frozen=true --entrypoint main.ts

# Download ridi-router binary
RUN curl -L "https://github.com/tomsjansons/ridi-router/releases/download/${RIDI_ROUTER_VERSION}/ridi-router" -o ridi-router \
    && chmod +x ridi-router

USER deno

CMD ["/bin/sh", "./startup.sh"]

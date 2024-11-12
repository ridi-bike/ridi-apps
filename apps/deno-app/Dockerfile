FROM denoland/deno:2.0.0

WORKDIR /app

# Install required packages and clean up
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Environment variables for ridi-router
ENV RIDI_ROUTER_VERSION=""
ENV RIDI_ROUTER_REGION=""

# Create a startup script
COPY startup.sh .
RUN chmod +x startup.sh

COPY . .
RUN deno install --lock deno.lock --frozen=true --entrypoint main.ts

# Download ridi-router binary
# RUN curl -L "https://github.com/tomsjansons/ridi-router/releases/download/${RIDI_ROUTER_VERSION}/ridi_router_${RIDI_ROUTER_VERSION}" -o ridi_router \
    # && chmod +x ridi_router

USER deno

CMD ["./startup.sh"]

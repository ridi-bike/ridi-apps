FROM denoland/deno:2.0.0

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

USER deno

COPY . .
RUN deno install --lock deno.lock --frozen=true --entrypoint main.ts

CMD ["run", "--allow-env", "--allow-net", "main.ts"]

FROM denoland/deno:2.0.0

WORKDIR /app

USER deno

COPY . .
RUN deno install --lock deno.lock --frozen=true --entrypoint main.ts

CMD ["run", "--allow-env", "--allow-net", "main.ts"]

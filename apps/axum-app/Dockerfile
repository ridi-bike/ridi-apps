
FROM rust:latest as builder

WORKDIR /usr/src/axum-app
COPY . .

RUN cargo install --path .

FROM debian:latest

# RUN apt-get update && apt-get install -y extra-runtime-dependencies && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/cargo/bin/axum-app /usr/local/bin/axum-app

CMD ["axum-app"]


FROM rust:latest as builder

WORKDIR /usr/src/ridi-router
COPY . .

RUN cargo install --path .

FROM debian:latest

# RUN apt-get update && apt-get install -y extra-runtime-dependencies && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/cargo/bin/ridi-router /usr/local/bin/ridi-router

CMD ["ridi-router"]

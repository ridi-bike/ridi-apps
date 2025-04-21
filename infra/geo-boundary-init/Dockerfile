FROM rust:latest

WORKDIR /usr/src/geo
COPY . .

RUN cargo install --path .

CMD ["geo"]

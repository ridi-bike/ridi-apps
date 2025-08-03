FROM rust:latest

ENV DOCKER_ENV="true"

WORKDIR /usr/src/geo
COPY ../services/geo-boundary-init .

RUN cargo install --path .

CMD ["geo-boundary-init"]

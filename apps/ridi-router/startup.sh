#!/bin/sh

/usr/local/bin/otelcol-contrib --config /etc/otel-config.yaml &
deno run --allow-all --unstable-ffi main.ts


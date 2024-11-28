#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Error: Please provide the Deno script file as an argument"
    echo "Usage: $0 <script-file>"
    exit 1
fi

# /usr/local/bin/otelcol-contrib --config /etc/otel-config.yaml &
deno run --allow-all --unstable-ffi "$1" &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?

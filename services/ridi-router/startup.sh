#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Error: Please provide the Deno script file as an argument"
    echo "Usage: $0 <script-file>"
    exit 1
fi

deno run --allow-all --unstable-ffi "$1" 2>&1 | tee -a /var/log/ridi-service/service.log | pino-pretty

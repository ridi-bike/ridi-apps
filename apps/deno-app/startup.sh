#!/bin/bash

# Run ridi_router with the specified region file
# ./ridi-router -f "/osm-data/${RIDI_ROUTER_REGION}_latest.osm.pbf"

# After ridi_router completes, start the Deno application
deno run --allow-env --allow-net main.ts


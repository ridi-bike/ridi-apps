#!/bin/bash

# Check if RIDI_ROUTER_REGION environment variable is set
if [ -z "${RIDI_ROUTER_REGION}" ]; then
    echo "Error: RIDI_ROUTER_REGION environment variable is not set"
    exit 1
fi

# Check if the OSM data file exists
if [ -f "/osm-data/${RIDI_ROUTER_REGION}_latest.osm.pbf" ]; then
    echo "OSM data file exists for region: ${RIDI_ROUTER_REGION}"
    exit 0
else
    echo "Error: OSM data file not found for region: ${RIDI_ROUTER_REGION}"
    exit 1
fi

#!/bin/bash

# Check if RIDI_ROUTER_REGION is set
if [ -z "$RIDI_ROUTER_REGION" ]; then
    echo "Error: RIDI_ROUTER_REGION environment variable is not set"
    exit 1
fi

while true; do
    echo "Checking OSM data for region: $RIDI_ROUTER_REGION"
    
    LATEST_FILE="/osm-data/${RIDI_ROUTER_REGION}_latest.osm.pbf"
    NEXT_FILE="/osm-data/${RIDI_ROUTER_REGION}_next.osm.pbf"
    REMOTE_URL="https://download.geofabrik.de/${RIDI_ROUTER_REGION}-latest.osm.pbf"
    MD5_URL="https://download.geofabrik.de/${RIDI_ROUTER_REGION}-latest.osm.md5"

    if [ -f "$LATEST_FILE" ]; then
        echo "Existing OSM data file found"
        
        # Calculate local MD5
        LOCAL_MD5=$(md5sum "$LATEST_FILE" | cut -d' ' -f1)
        
        # Download and extract remote MD5
        REMOTE_MD5=$(curl -s "$MD5_URL" | cut -d' ' -f1)
        
        if [ "$LOCAL_MD5" != "$REMOTE_MD5" ]; then
            echo "MD5 checksums differ, downloading new data"
            
            # Download new data
            if curl -o "$NEXT_FILE" "$REMOTE_URL"; then
                # Remove old file and rename new one
                rm "$LATEST_FILE"
                mv "$NEXT_FILE" "$LATEST_FILE"
                echo "Update completed successfully"
            else
                echo "Error downloading new data"
                rm -f "$NEXT_FILE"  # Clean up partial download
            fi
        else
            echo "Data is up to date"
        fi
    else
        echo "No existing OSM data file found, downloading..."
        
        # Download initial data
        if curl -o "$NEXT_FILE" "$REMOTE_URL"; then
            mv "$NEXT_FILE" "$LATEST_FILE"
            echo "Initial download completed successfully"
        else
            echo "Error downloading initial data"
            rm -f "$NEXT_FILE"  # Clean up partial download
        fi
    fi

    echo "Sleeping for 24 hours..."
    sleep 24h
done


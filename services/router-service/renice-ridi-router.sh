#!/bin/bash
# Script to renice the ridi-router process to priority 20

# Find the PID of the ridi-router process started with 'start-server'
# Only select the first PID if multiple are found
ROUTER_PID=$(ps aux | grep "[s]tart-server" | grep "ridi-router" | awk '{print $2}' | head -n 1)

if [ -z "$ROUTER_PID" ]; then
  echo "Error: ridi-router process not found. Make sure it's running with 'start-server'."
  exit 1
fi

# Renice the process to priority 20
echo "Found ridi-router process with PID: $ROUTER_PID"
echo "Changing niceness priority to 20..."

if renice -n 20 -p "$ROUTER_PID"; then
  echo "Successfully changed priority of ridi-router process to 20."
  ps -o pid,nice,cmd -p "$ROUTER_PID"
else
  echo "Failed to change priority. Make sure you have sufficient permissions."
  exit 2
fi

exit 0

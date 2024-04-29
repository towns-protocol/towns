#!/bin/bash
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

echo "run_info.sh"

# This script starts 100 concurrent 'yarn start' processes and waits for all to complete.

# make sure we're fresh
yarn build

# Array to hold process IDs
declare -a pids

# Loop to kick off 100 'yarn start' processes
for i in {1..1}; do
  yarn start-local &
  # Capture the process ID of the background process
  pids+=($!)
done

# Wait for all processes to finish
for pid in "${pids[@]}"; do
  echo "Waiting on PID $pid to complete..."
  wait $pid || true
done

echo "All processes have completed."



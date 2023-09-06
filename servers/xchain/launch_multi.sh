#!/bin/bash

# Function to handle Ctrl+C and wait for the child processes
cleanup() {
  echo "Sending SIGINT to child processes..."
  for instance_dir in ./instance_*; do
    if [[ -f "${instance_dir}/node.pid" ]]; then
      pid=$(cat "${instance_dir}/node.pid")
      wait "$pid"
      rm -f "${instance_dir}/node.pid"
    fi
  done
  exit 0
}

# Trap Ctrl+C and call cleanup()
trap cleanup SIGINT SIGTERM

# Base directory for the instances
BASE_DIR="./"

# Get number of instances by counting instance directories
N=$(ls -d ${BASE_DIR}/instance_* 2>/dev/null | wc -l)

# Loop to launch N instances from instance directories
for (( i=1; i<=N; i++ ))
do
  INSTANCE_DIR="${BASE_DIR}/instance_${i}"
  pushd "${INSTANCE_DIR}"
  "./bin/node" run &
  echo $! > "node.pid"
  echo "Launched instance $i from ${INSTANCE_DIR} with PID $(cat node.pid)"
  popd
done

# Wait for all child processes to complete
# Wait indefinitely until receiving a signal to trigger cleanup
while true; do
  sleep 1
done

echo "All child processes have completed."

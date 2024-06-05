#!/bin/bash
set -euo pipefail

# Change the current working directory to the directory of the script
cd "$(dirname "$0")"

: ${RUN_ENV:?}

# Base directory for the instances
RUN_FILES_DIR="./run_files"

# PID file for the script, stored in the base directory
SCRIPT_PID_FILE="${RUN_FILES_DIR}/${RUN_ENV}/launch_multi.pid"

BASE_DIR="${RUN_FILES_DIR}/${RUN_ENV}"

mkdir -p "${BASE_DIR}"

# stop previous instances
./stop_multi.sh

# Record the script's own PID
echo $$ > "$SCRIPT_PID_FILE"

make

# Get number of instances by counting instance directories
N=$(ls -d ${BASE_DIR}/instance_* 2>/dev/null | wc -l)

# Function to handle Ctrl+C and wait for the child processes
cleanup() {
  echo "Sending SIGINT to child processes..."

  for (( i=1; i<=N; i++ ))
  do
    instance_dir="${BASE_DIR}/instance_${i}"

    if [[ -f "${instance_dir}/node.pid" ]]; then
      pid=$(cat "${instance_dir}/node.pid")
      echo "Waiting on in ${instance_dir} with PID $pid has completed."
      kill "$pid" 2>/dev/null || true
      wait "$pid" || true
      echo "Instance in ${instance_dir} with PID $pid has completed."
      rm -f "${instance_dir}/node.pid"
    fi
  done
  echo "Sent SIGINT to child processes..."
}

# Trap Ctrl+C and call cleanup()
trap cleanup SIGINT SIGTERM

# Fund the instances
./fund_multi.sh


# Loop to launch N instances from instance directories
for (( i=1; i<=N; i++ ))
do
  INSTANCE_DIR="${BASE_DIR}/instance_${i}"
  cp bin/xchain_node "${INSTANCE_DIR}/bin/xchain_node"
  pushd "${INSTANCE_DIR}"

  "./bin/xchain_node" run &
  node_pid=$!
  pwd
  echo $node_pid > node.pid
  echo "Launched instance $i from ${INSTANCE_DIR} with PID $node_pid"
  popd
done

wait

rm $SCRIPT_PID_FILE
echo "All child processes have completed."

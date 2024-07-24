#!/bin/bash
set -euo pipefail

# Change the current working directory to the directory of the script
cd "$(dirname "$0")"

RUN_FILES_DIR="../run_files"
BASE_DIR="${RUN_FILES_DIR}/${RUN_ENV}/xchain"
SCRIPT_PID_FILE="${BASE_DIR}/launch_multi.pid"


if [[ -f "$SCRIPT_PID_FILE" ]]; then
  old_pid=$(cat "$SCRIPT_PID_FILE")
  if [[ -n "$old_pid" && "$old_pid" != "$$" ]]; then
    echo "Stopping previous script instance with PID $old_pid"
    kill "$old_pid" || true
    while ps -p $old_pid > /dev/null 2>&1; do
        sleep 1  # Wait for 1 second before checking again
    done
    echo "Previous script instance stopped."
  fi
fi


#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Default number of instances to stop
NUM_INSTANCES=10
WAIT_TIME=1
MAX_ATTEMPTS=5

# Parse command-line options
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --instances|-n)
            NUM_INSTANCES="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

for ((i=0; i<NUM_INSTANCES; i++)); do
  printf -v INSTANCE "%02d" $i
  PID_FILE="./run_files/$INSTANCE/pid"

  # Check if PID file exists
  if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found for instance '$INSTANCE'. Skipping..."
    continue
  fi

  PID=$(cat "$PID_FILE")

  # Check if process exists before attempting to stop it
  if ! kill -0 $PID 2>/dev/null; then
    echo "Instance '$INSTANCE' with PID $PID is not running. Skipping..."
    rm -f "$PID_FILE"
    continue
  fi

  # Send SIGTERM (Ctrl-C)
  echo "Stopping instance '$INSTANCE' with PID $PID"
  kill -SIGTERM $PID

  # Loop to check if process stops
  ATTEMPTS=0
  while kill -0 $PID 2>/dev/null && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    sleep $WAIT_TIME
    ((ATTEMPTS++))
  done

  # Check if process is still running, and if so, send SIGKILL (-9)
  if kill -0 $PID 2>/dev/null; then
    echo "Instance '$INSTANCE' did not stop; forcefully killing..."
    kill -SIGKILL $PID
  else
    echo "Instance '$INSTANCE' stopped successfully"
  fi

  rm -f "$PID_FILE"
done

echo "All instances have been processed"

#!/bin/bash
set -euo pipefail

I_RPC_PORT=$1

WAIT_TIME=1
MAX_ATTEMPTS=5

echo "Stopping instance on port $I_RPC_PORT"

PID="$(lsof -t -i:${I_RPC_PORT} || true)"

# Check if PID is empty
if [ -z "$PID" ]; then
  echo "No process found for instance on port $I_RPC_PORT. Skipping..."
  exit 0
fi

# Check if process exists before attempting to stop it
if ! kill -0 $PID 2>/dev/null; then
  echo "Instance with PID $PID on port $I_RPC_PORT is not running. Skipping..."
  exit  0
fi

# Send SIGTERM (Ctrl-C)
echo "Stopping instance with PID $PID on port $I_RPC_PORT"
kill -SIGTERM $PID

# Loop to check if process stops
ATTEMPTS=0
while kill -0 $PID 2>/dev/null && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  sleep $WAIT_TIME
  ((ATTEMPTS++))
done

# Check if process is still running, and if so, send SIGKILL (-9)
if kill -0 $PID 2>/dev/null; then
  echo "Instance with PID $PID on port $I_RPC_PORT did not stop; forcefully killing..."
  kill -SIGKILL $PID
else
  echo "Instance with PID $PID on port $I_RPC_PORT stopped successfully"
fi

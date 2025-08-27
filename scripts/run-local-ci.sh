#!/bin/bash

# Script to run GitHub CI locally using act

# Default values
JOB="Common_CI"
ARCH="linux/amd64"
EVENT_TYPE="schedule"
EVENT_TIME="2023-01-01T00:00:00Z"

# Function to display usage info
function show_usage {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -j, --job JOB_NAME     Specify the job to run (default: Common_CI)"
  echo "  -e, --event TYPE       Event type: schedule, pull_request, workflow_dispatch (default: schedule)"
  echo "  -h, --help             Show this help message"
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -j|--job) JOB="$2"; shift ;;
    -e|--event) EVENT_TYPE="$2"; shift ;;
    -h|--help) show_usage; exit 0 ;;
    *) echo "Unknown parameter: $1"; show_usage; exit 1 ;;
  esac
  shift
done

# Create event.json file
echo "Creating event.json for $EVENT_TYPE event..."
if [ "$EVENT_TYPE" == "schedule" ]; then
  echo "{\"schedule\": {\"scheduled_at\": \"$EVENT_TIME\"}}" > event.json
elif [ "$EVENT_TYPE" == "pull_request" ]; then
  echo "{\"pull_request\": {\"head\": {\"ref\": \"$(git branch --show-current)\"}}}" > event.json
elif [ "$EVENT_TYPE" == "workflow_dispatch" ]; then
  echo "{\"inputs\": {}}" > event.json
else
  echo "Unsupported event type: $EVENT_TYPE"
  exit 1
fi

# Format with prettier
echo "Formatting event.json..."
pnpm exec prettier --write event.json

# Run act and capture output to a temporary file
echo "Running Act for job: $JOB..."
TEMP_LOG=$(mktemp)

# Run command and tee output to both terminal and temp file
act -j "$JOB" --secret-file .env -P arc-runners=ghcr.io/catthehacker/ubuntu:act-latest \
  --container-architecture "$ARCH" --eventpath event.json --detect-event "$EVENT_TYPE" \
  2>&1 | tee "$TEMP_LOG"
EXIT_CODE=${PIPESTATUS[0]}

# If command failed, show error summary
if [ $EXIT_CODE -ne 0 ]; then
  echo -e "\n\n===== ERROR SUMMARY ====="
  
  # Extract and show failed steps
  echo -e "\nFailed steps:"
  grep -E '^\[.*\] ❌' "$TEMP_LOG" | sed 's/\[.*\] ❌ //' 
  
  # Extract specific error messages
  echo -e "\nError details:"
  grep -i -E '(error|failed|failure)' "$TEMP_LOG" | grep -v -E '(Cached|::group)' | sort | uniq
fi

# Cleanup
echo "Cleaning up..."
rm event.json
rm "$TEMP_LOG"

echo "Done! Exit code: $EXIT_CODE"
exit $EXIT_CODE

#!/bin/bash
set -euo pipefail

# Script to run GitHub CI locally using act

# Default values
JOB="Common_CI"
EVENT_TYPE="schedule"
EVENT_TIME="2023-01-01T00:00:00Z"

# Auto-detect architecture - default to native on Apple Silicon
if [[ $(uname -m) == "arm64" ]]; then
    ARCH="${ARCH:-linux/arm64}"
else
    ARCH="${ARCH:-linux/amd64}"
fi

# Function to display usage info
show_usage() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -j, --job JOB_NAME     Specify the job to run (default: Common_CI)"
  echo "  -a, --arch ARCH        Specify container architecture (default: auto-detect)"
  echo "                         Options: linux/arm64, linux/amd64"
  echo "  -h, --help             Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 -j Common_CI                    # Uses native architecture ($(uname -m))"
  echo "  $0 -j Common_CI -a linux/amd64     # Force AMD64 (for compatibility testing)"
  echo ""
  echo "Note: Uses 'schedule' event type (only type that works reliably with act)"
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -j|--job) JOB="$2"; shift ;;
    -a|--arch) ARCH="$2"; shift ;;
    -h|--help) show_usage; exit 0 ;;
    *) echo "Unknown parameter: $1"; show_usage; exit 1 ;;
  esac
  shift
done

# Create event.json file for schedule event
echo "Creating event.json for schedule event..."
cat > event.json << EOF
{
  "schedule": {
    "scheduled_at": "$EVENT_TIME"
  },
  "repository": {
    "default_branch": "main"
  }
}
EOF

# Format with prettier
echo "Formatting event.json..."
yarn prettier --write event.json

# Cleanup function to stop Anvil containers
cleanup_anvil_containers() {
    echo "Stopping Anvil containers..."
    if command -v just >/dev/null 2>&1 && [ -d "core" ]; then
        (cd core && USE_DOCKER_CHAINS=1 just anvils-stop) >/dev/null 2>&1 || true
    fi
}

# Set up trap to cleanup on exit
trap cleanup_anvil_containers EXIT INT TERM

# Run act and capture output to a temporary file
echo "Running Act for job: $JOB..."
echo "Using architecture: $ARCH"
TEMP_LOG=$(mktemp)

# Run command and tee output to both terminal and temp file
act "$EVENT_TYPE" -j "$JOB" --secret-file .env -P ubuntu-x64-16core=ghcr.io/catthehacker/ubuntu:act-latest \
  --container-architecture "$ARCH" --eventpath event.json \
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

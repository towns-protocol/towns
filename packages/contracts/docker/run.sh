#!/bin/bash

# Exit on any error
set -e

export RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

# Parse command line arguments
parse_args() {
  SHOW_HELP=false
  
  while [ $# -gt 0 ]; do
    case $1 in
      --help)
        SHOW_HELP=true
        shift
        ;;
      *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done
}

show_help() {
  cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
  --help    Show this help message

DESCRIPTION:
  This script starts local blockchain networks (base chain and river chain) 
  and optionally runs tests against them.

EXAMPLES:
  $0              # Start both chains in the background and exit
  $0 --help       # Show this help message

EOF
}

main() {
  # Parse command line arguments
  parse_args "$@"
  
  # Show help if requested
  if [ "$SHOW_HELP" = true ]; then
    show_help
    exit 0
  fi

  if [ "$CHAIN" = "base" ]; then
    start_base_chain
  elif [ "$CHAIN" = "river" ]; then
    start_river_chain
  else
    echo "Run with CHAIN=base or CHAIN=river."
    exit 1
  fi
}

setup_trap() {
  trap 'cleanup $?' SIGINT SIGTERM EXIT 
}

start_base_chain() {
  echo "Starting base chain..."
  RIVER_ANVIL_OPTS="--load-state base-anvil-state.json --host 0.0.0.0" bash ./scripts/start-local-basechain.sh 
  sleep 1  # Give it a moment to start
  BASE_PID=$(pgrep -f "anvil.*base-anvil-state.json" | head -n 1)
  echo "Base chain started with PID: $BASE_PID"
}

start_river_chain() {
  echo "Starting river chain..."
  RIVER_ANVIL_OPTS="--load-state river-anvil-state.json --host 0.0.0.0" bash ./scripts/start-local-riverchain.sh 
  sleep 1  # Give it a moment to start
  RIVER_PID=$(pgrep -f "anvil.*river-anvil-state.json" | head -n 1)
  echo "River chain started with PID: $RIVER_PID"
}

# Function to cleanup on exit
cleanup() {
  local exit_code=$1
  echo "Cleaning up..."
  echo "Killing base chain (PID: $BASE_PID)"
  kill -9 $BASE_PID 2>/dev/null || true
  echo "Killing river chain (PID: $RIVER_PID)"
  kill -9 $RIVER_PID 2>/dev/null || true
  exit $exit_code
}

# Call main with all arguments
main "$@"
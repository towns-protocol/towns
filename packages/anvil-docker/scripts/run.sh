#!/bin/bash

# Exit on any error
set -e

export RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

# Anvil's first default private key
ANVIL_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# ERC-4337 EntryPoint addresses
ENTRYPOINT_V06="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
ENTRYPOINT_V07="0x0000000071727De22E5E9d8BAf0edAc6f37da032"

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
  RIVER_ANVIL_OPTS="--load-state base-anvil-state.json --host 0.0.0.0" bash ./scripts/start-local-basechain.sh &
  BASE_SCRIPT_PID=$!
  sleep 2  # Give it a moment to start
  echo "Base chain started with script PID: $BASE_SCRIPT_PID"

  # Start Alto bundler alongside base chain
  start_alto

  # Wait for the base chain script to keep container alive
  wait $BASE_SCRIPT_PID
}

start_alto() {
  echo "Starting Alto bundler on port 4337..."

  # Wait for base chain to be ready
  while ! nc -z localhost 8545 2>/dev/null; do
    echo "Waiting for base chain to be ready..."
    sleep 1
  done

  # Start Alto with explicit simulation contract address
  ENTRYPOINT_SIMULATIONS="0x74Cb5e4eE81b86e70f9045036a1C5477de69eE87"
  # Alto is installed via bun - use bunx to run it (alto script requires node which isn't installed)
  /root/.bun/bin/bunx @pimlico/alto@0.0.20 \
    --entrypoints "$ENTRYPOINT_V06,$ENTRYPOINT_V07" \
    --rpc-url "http://127.0.0.1:8545" \
    --executor-private-keys "$ANVIL_PRIVATE_KEY" \
    --utility-private-key "$ANVIL_PRIVATE_KEY" \
    --min-balance "0" \
    --safe-mode false \
    --entrypoint-simulation-contract "$ENTRYPOINT_SIMULATIONS" \
    --port 4337 &
  ALTO_PID=$!
  echo "Alto bundler started with PID: $ALTO_PID"

  # Wait for Alto to be ready
  sleep 2
  while ! nc -z localhost 4337 2>/dev/null; do
    echo "Waiting for Alto bundler to be ready..."
    sleep 1
  done
  echo "Alto bundler is ready on port 4337"
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
  if [ -n "$ALTO_PID" ]; then
    echo "Killing Alto bundler (PID: $ALTO_PID)"
    kill -9 $ALTO_PID 2>/dev/null || true
  fi
  if [ -n "$BASE_PID" ]; then
    echo "Killing base chain (PID: $BASE_PID)"
    kill -9 $BASE_PID 2>/dev/null || true
  fi
  if [ -n "$RIVER_PID" ]; then
    echo "Killing river chain (PID: $RIVER_PID)"
    kill -9 $RIVER_PID 2>/dev/null || true
  fi
  exit $exit_code
}

# Call main with all arguments
main "$@"

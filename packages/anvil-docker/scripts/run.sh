#!/bin/bash

# Exit on any error
set -e

export RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

# Anvil's first default private key
ANVIL_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# ERC-4337 EntryPoint addresses
ENTRYPOINT_V06="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
ENTRYPOINT_V07="0x0000000071727De22E5E9d8BAf0edAc6f37da032"
ENTRYPOINT_SIMULATIONS="0x74Cb5e4eE81b86e70f9045036a1C5477de69eE87"

main() {
  if [ "$1" = "--help" ]; then
    echo "Usage: CHAIN=base|river $0"
    echo "Starts Anvil chain from pre-deployed state. Base chain includes Alto bundler."
    exit 0
  fi

  case "$CHAIN" in
    base)  start_base_chain ;;
    river) start_river_chain ;;
    *)
      echo "Error: Set CHAIN=base or CHAIN=river"
      exit 1
      ;;
  esac
}

start_base_chain() {
  echo "Starting base chain..."
  RIVER_ANVIL_OPTS="--load-state base-anvil-state.json --host 0.0.0.0" bash ./scripts/start-local-basechain.sh &
  BASE_PID=$!

  # Wait for Anvil to be ready
  while ! nc -z localhost 8545 2>/dev/null; do
    echo "Waiting for base chain..."
    sleep 1
  done
  echo "Base chain ready on port 8545"

  # Start Alto bundler (ERC-4337 contracts are pre-deployed in the Anvil state)
  echo "Starting Alto bundler..."
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

  while ! nc -z localhost 4337 2>/dev/null; do
    echo "Waiting for Alto bundler..."
    sleep 1
  done
  echo "Alto bundler ready on port 4337"

  # Keep container alive
  wait $BASE_PID
}

start_river_chain() {
  echo "Starting river chain..."
  RIVER_ANVIL_OPTS="--load-state river-anvil-state.json --host 0.0.0.0" bash ./scripts/start-local-riverchain.sh
}

cleanup() {
  echo "Cleaning up..."
  [ -n "$ALTO_PID" ] && kill -9 $ALTO_PID 2>/dev/null || true
  [ -n "$BASE_PID" ] && kill -9 $BASE_PID 2>/dev/null || true
  exit "${1:-0}"
}

trap 'cleanup $?' SIGINT SIGTERM EXIT

# Call main with all arguments
main "$@"

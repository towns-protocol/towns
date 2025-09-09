#!/bin/bash

# Exit on any error
set -e

main() {
  setup_trap
  
  start_base_chain
  start_river_chain
  wait_for_base_chain
  wait_for_river_chain

  test_node_registry
}

setup_trap() {
  trap 'cleanup $?' SIGINT SIGTERM EXIT 
}

start_base_chain() {
  echo "Starting base chain..."
  RIVER_BLOCK_TIME=1 RIVER_ANVIL_OPTS="--load-state base-anvil-state.json --quiet" bash ./scripts/start-local-basechain.sh &
  sleep 1  # Give it a moment to start
  BASE_PID=$(pgrep -f "anvil.*base-anvil-state.json" | head -n 1)
  echo "Base chain started with PID: $BASE_PID"
}

start_river_chain() {
  echo "Starting river chain..."
  RIVER_BLOCK_TIME=1 RIVER_ANVIL_OPTS="--load-state river-anvil-state.json --quiet" bash ./scripts/start-local-riverchain.sh &
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

wait_for_base_chain() {
  echo "Waiting for base chain to be ready on port 8545..."
  while ! kill -0 $BASE_PID 2>/dev/null || ! nc -z localhost 8545; do 
    if ! kill -0 $BASE_PID 2>/dev/null; then
      echo "Base chain process died unexpectedly!"
      cleanup
    fi
    echo "Waiting for base chain..."
    sleep 1
  done
  echo "Base chain is ready!"
}

wait_for_river_chain() {
  echo "Waiting for river chain to be ready on port 8546..."
  while ! kill -0 $RIVER_PID 2>/dev/null || ! nc -z localhost 8546; do 
    if ! kill -0 $RIVER_PID 2>/dev/null; then
      echo "River chain process died unexpectedly!"
      cleanup
    fi
    echo "Waiting for river chain..."
    sleep 1
  done
  echo "River chain is ready!"
}

test_node_registry() {
  pushd ./core
    if ! NODE_ADDRESSES=$(just get_all_node_addresses); then
        echo "Failed to get node addresses"
        exit 1
    fi

    echo "Raw node addresses: $NODE_ADDRESSES"
    
    EXPECTED_NODE_ADDRESSES="0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000"

    if [ "$NODE_ADDRESSES" = "$EXPECTED_NODE_ADDRESSES" ]; then
      echo "Success! Empty node addresses."
    else
      echo "Error: Expected $EXPECTED_NODE_ADDRESSES, got $NODE_ADDRESSES"
      exit 1
    fi
  
  popd
}

main 
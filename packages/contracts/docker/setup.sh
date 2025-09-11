#!/bin/sh

set -e

# This script deploys our contracts to base and river chains, and registers the nodes.
# The anvil instances are run with --dump-state, so we can load the state into the chains.
# This file is meant to be run in a `RUN` block in a Dockerfile as part of the build process.
# run.sh is the entrypoint for the container.

export RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

main() {
  # Set up trap to catch exit signals
  trap trap_cleanup SIGINT SIGTERM EXIT 
  start_base_chain
  start_river_chain
  wait_for_base_chain
  wait_for_river_chain
  deploy_contracts
  test_node_registry
  cleanup
  sleep 5 # waiting to avoid race condition
  echo "Done!"
}

start_base_chain() {
  echo "Starting base chain..."
  RIVER_ANVIL_OPTS="--dump-state base-anvil-state.json --state-interval 1 --quiet" ./scripts/start-local-basechain.sh &
  sleep 1  # Give it a moment to start
  BASE_PID=$(pgrep -f "anvil.*base-anvil-state.json" | head -n 1)
  echo "Base chain started with PID: $BASE_PID"
}

start_river_chain() {
  echo "Starting river chain..."
  RIVER_ANVIL_OPTS="--dump-state river-anvil-state.json --state-interval 1 --quiet" ./scripts/start-local-riverchain.sh &
  sleep 1  # Give it a moment to start
  RIVER_PID=$(pgrep -f "anvil.*river-anvil-state.json" | head -n 1)
  echo "River chain started with PID: $RIVER_PID"
}

trap_cleanup() {
  echo "Trap cleanup"
  cleanup
}

assert_dump_state() {
  echo "Asserting dump state..."
  local start_time=$(date +%s)
  local timeout=10
  while true; do
    if [ -f "base-anvil-state.json" ] && [ -f "river-anvil-state.json" ]; then
      break
    fi
    
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))
    
    if [ $elapsed -ge $timeout ]; then
      echo "Timeout waiting for state dumps after ${timeout} seconds"
      exit 1
    fi
    
    echo "Waiting for state dumps... (${elapsed}s elapsed)"
    sleep 1
  done
}

# Function to cleanup on exit
cleanup() {
  echo "Cleaning up..."
  assert_dump_state
  echo "Killing base chain (PID: $BASE_PID)"
  kill -9 $BASE_PID 2>/dev/null || true
  echo "Killing river chain (PID: $RIVER_PID)"
  kill -9 $RIVER_PID 2>/dev/null || true
  exit 0
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

deploy_contracts() {
  pushd ./core
    just config-root deploy-contracts
  popd
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

# cd ./core && just config build
main

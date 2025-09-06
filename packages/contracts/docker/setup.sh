#!/bin/sh

set -e

# This script deploys our contracts to base and river chains, and registers the nodes.
# The anvil instances are run with --dump-state, so we can load the state into the chains.
# This file is meant to be run in a `RUN` block in a Dockerfile as part of the build process.
# run.sh is the entrypoint for the container.

main() {
  # Set up trap to catch exit signals
  trap trap_cleanup SIGINT SIGTERM EXIT 
  start_base_chain
  start_river_chain
  wait_for_base_chain
  wait_for_river_chain
  deploy_contracts
  create_address_manifest
  echo "Done!"
}

start_base_chain() {
  echo "Starting base chain..."
  RIVER_BLOCK_TIME=1 RIVER_ANVIL_OPTS="--dump-state base-anvil-state.json --quiet" ./scripts/start-local-basechain.sh &
  sleep 1  # Give it a moment to start
  BASE_PID=$(pgrep -f "anvil.*base-anvil-state.json" | head -n 1)
  echo "Base chain started with PID: $BASE_PID"
}

start_river_chain() {
  echo "Starting river chain..."
  RIVER_BLOCK_TIME=1 RIVER_ANVIL_OPTS="--dump-state river-anvil-state.json --quiet" ./scripts/start-local-riverchain.sh &
  sleep 1  # Give it a moment to start
  RIVER_PID=$(pgrep -f "anvil.*river-anvil-state.json" | head -n 1)
  echo "River chain started with PID: $RIVER_PID"
}

trap_cleanup() {
  echo "Trap cleanup"
  cleanup
  exit $?
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
  
  # Send SIGTERM for graceful shutdown to allow state dumping
  if kill -0 $BASE_PID 2>/dev/null; then
    echo "Gracefully stopping base chain (PID: $BASE_PID)"
    kill -TERM $BASE_PID
  fi
  
  if kill -0 $RIVER_PID 2>/dev/null; then
    echo "Gracefully stopping river chain (PID: $RIVER_PID)"
    kill -TERM $RIVER_PID
  fi
  
  # Wait for processes to exit and dump state
  wait $BASE_PID 2>/dev/null || true
  wait $RIVER_PID 2>/dev/null || true
  
  # Now check that state files were created
  assert_dump_state
}

wait_for_base_chain() {
  echo "Waiting for base chain to be ready on port 8545..."
  while ! kill -0 $BASE_PID 2>/dev/null || ! nc -z localhost 8545; do 
    if ! kill -0 $BASE_PID 2>/dev/null; then
      echo "Base chain process died unexpectedly!"
      cleanup
      exit 1
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
      exit 1
    fi
    echo "Waiting for river chain..."
    sleep 1
  done
  echo "River chain is ready!"
}

deploy_contracts() {
  pushd ./core
    just just-deploy-contracts
  popd
}

# Create a consolidated address file for easy extraction
create_address_manifest() {
  echo "Creating contract address manifest for easy extraction..."
  copied_any=0

  if [ -d "./packages/contracts/deployments/local_dev" ]; then
    mkdir -p ./local_dev
    
    # Copy base and river addresses
    for chain in base river; do
      source_dir="./packages/contracts/deployments/local_dev/${chain}/addresses"
      if [ -d "$source_dir" ]; then
        mkdir -p "./local_dev/${chain}/addresses"
        if cp -r "$source_dir"/. "./local_dev/${chain}/addresses/"; then
          copied_any=1
        fi
      fi
    done
  fi

  if [ "$copied_any" != 0 ]; then
    echo "Contract addresses saved to ./local_dev/ for extraction"
  else
    echo "No contract addresses found to copy"
  fi
}

# cd ./core && just config build
main

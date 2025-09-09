#!/bin/sh

set -e

# This script deploys contracts to base and river chains and creates contracts.env.
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
  create_contracts_env
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

# Copy contract addresses and create contracts.env file
create_contracts_env() {
  echo "Copying contract addresses and creating contracts.env..."
  contracts_dir="packages/contracts/deployments/local_dev"

  # Fail if contract deployment directory doesn't exist
  if [ ! -d "$contracts_dir" ]; then
    echo "ERROR: Contract deployment directory not found: $contracts_dir"
    echo "Contract deployment may have failed."
    exit 1
  fi

  output_dir="/app/local_dev"
  mkdir -p $output_dir

  # Copy contract addresses and fail if any are missing
  for chain in base river; do
    source_dir="${contracts_dir}/${chain}/addresses"
    if [ ! -d "$source_dir" ]; then
      echo "ERROR: Contract addresses not found for $chain chain: $source_dir"
      exit 1
    fi

    target_dir="${output_dir}/${chain}/addresses"
    mkdir -p "$target_dir"
    if ! cp -r "$source_dir"/. "$target_dir/"; then
      echo "ERROR: Failed to copy $chain contract addresses"
      exit 1
    fi
  done

  # Create contracts.env file using justfile recipe
  cd ./core
  just CONTRACTS_DIR="../${contracts_dir}" RUN_BASE="${output_dir}" create-contracts-env
  cd ..
  
  # Generate config using packages/generated
  if [ -d "./packages/generated" ]; then
    cd ./packages/generated
    yarn make-config
    # Copy generated .env to local_dev for extraction
    cp "./deployments/local_dev/.env" "${output_dir}/.env"
    cd ../..
  fi
  
  echo "Contract addresses and contracts.env created successfully"
}

# cd ./core && just config build
main

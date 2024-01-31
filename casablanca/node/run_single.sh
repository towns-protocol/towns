#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

export RUN_BASE=./run_files
export INSTANCE=single
export USE_CONTRACT=true
export METRICS_ENABLED=true
export METRICS_PORT=8081
export RPC_PORT=5157
export DB_PORT=5433
export LOG_NOCOLOR=false
export LOG_LEVEL=info
export USE_BLOCKCHAIN_STREAM_REGISTRY=true
export NODE_REGISTRY="''"
export REPL_FACTOR=1

CONFIG_ONLY=false
SKIP_CONFIG=false

# Parse command-line options
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        -c|--config-only)
            CONFIG_ONLY=true
            shift
            ;;
        -sc|--skip-config)
            SKIP_CONFIG=true
            shift
            ;;
        --disable_entitlements|--de)
            INSTANCE=single_no_ent
            RPC_PORT=5158
            USE_CONTRACT=false
            METRICS_ENABLED=false
            METRICS_PORT=8082
            USE_BLOCKCHAIN_STREAM_REGISTRY=true
            shift
            ;;
        *)
            args+=("$1")
            shift
            ;;
    esac
done

if [ "$SKIP_CONFIG" = false ]; then
  # Generate the config file
  ./config_instance.sh
fi

# Skip running the server if -c flag is provided
if [ "$CONFIG_ONLY" = false ]; then
  echo Building node binary
  mkdir -p ${RUN_BASE}/bin
  go build -o ${RUN_BASE}/bin/river_node -race ./node/main.go

  cd ./run_files/$INSTANCE
  echo "Running instance '$INSTANCE' with extra arguments: '${args[@]:-}'"

  if [ "$USE_BLOCKCHAIN_STREAM_REGISTRY" == "true" ]; then
    echo "And funding it with 1 ETH"
    cast rpc -r http://127.0.0.1:8546 anvil_setBalance `cat ./wallet/node_address` 1000000000000000000 > /dev/null
  fi

  while true; do
    # Run the built executable
    ../bin/river_node run "${args[@]:-}" || exit_status=$?

    # Break if exit status is not 22 (restart initiated by test)
    if [ "${exit_status:-0}" -ne 22 ]; then
        break
    fi

    echo "RESTARTING"
  done
fi

#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

INSTANCE=single
USE_CONTRACT=true
METRICS_ENABLED=true
RPC_PORT=5157
LOG_NOCOLOR=false
LOG_LEVEL=info
USE_BLOCKCHAIN_STREAM_REGISTRY=true

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
  ./config_instance.sh $INSTANCE \
      RPC_PORT ${RPC_PORT} \
      DB_PORT 5433 \
      USE_CONTRACT $USE_CONTRACT \
      METRICS_ENABLED $METRICS_ENABLED \
      METRICS_PORT 8081 \
      NODE_REGISTRY "''" \
      LOG_NOCOLOR ${LOG_NOCOLOR} \
      LOG_LEVEL ${LOG_LEVEL} \
      REPL_FACTOR 1 \
      USE_BLOCKCHAIN_STREAM_REGISTRY $USE_BLOCKCHAIN_STREAM_REGISTRY
fi

# Skip running the server if -c flag is provided
if [ "$CONFIG_ONLY" = false ]; then
  cd ./run_files/$INSTANCE
  echo "Running instance '$INSTANCE' with extra arguments: '${args[@]:-}'"

  # Build the executable
  go build -o river_node -race ../../node/main.go

  set +e
  while true; do
    temp_file=$(mktemp)

    # Run the built executable
    ./river_node run "${args[@]:-}" | tee "$temp_file"

    # Check for exit code 22
    grep_result=$(grep "Exiting with code 22 to initiate a restart" "$temp_file")

    rm -f "$temp_file"

    if [ -n "$grep_result" ]; then
      echo "RESTARTING"
      # Rebuild the executable if needed
      go build -o river_node -race ../../node/main.go
    else
      break
    fi
  done
fi

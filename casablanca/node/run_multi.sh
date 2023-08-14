#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

USE_CONTRACT=true
METRICS_ENABLED=true
RPC_PORT=5170
METRICS_PORT=8010
DB_PORT=5433

# Default number of instances
NUM_INSTANCES=10

# Parse command-line options
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --instances|-n)
            NUM_INSTANCES="$2"
            shift 2
            ;;
        --disable_entitlements|--de)
            USE_CONTRACT=false
            METRICS_ENABLED=false
            shift
            ;;
        *)
            args+=("$1")
            shift
            ;;
    esac
done

for ((i=0; i<NUM_INSTANCES; i++)); do
  printf -v INSTANCE "%02d" $i
  I_RPC_PORT=$((RPC_PORT + i))
  I_METRICS_PORT=$((METRICS_PORT + i))
  # TODO: DB_PORT=$((DB_PORT + i))

  ./config_instance.sh $INSTANCE \
      RPC_PORT ${I_RPC_PORT} \
      DB_PORT ${DB_PORT} \
      USE_CONTRACT $USE_CONTRACT \
      METRICS_ENABLED $METRICS_ENABLED \
      METRICS_PORT ${I_METRICS_PORT}

  pushd ./run_files/$INSTANCE
  echo "Running instance '$INSTANCE' with extra aguments: '${args[@]:-}'"
  go run --race ../../node/main.go run --config config/config.yaml "${args[@]:-}" &
  echo $! > pid
  popd
done

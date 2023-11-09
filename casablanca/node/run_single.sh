#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

INSTANCE=single
USE_CONTRACT=true
METRICS_ENABLED=true
RPC_PORT=5157
LOG_NOCOLOR=false
LOG_LEVEL=info
USE_BLOCKCHAIN_STREAM_REGISTRY=true

# Parse command-line options
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
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

./config_instance.sh $INSTANCE \
    RPC_PORT ${RPC_PORT} \
    DB_PORT 5433 \
    USE_CONTRACT $USE_CONTRACT \
    METRICS_ENABLED $METRICS_ENABLED \
    METRICS_PORT 8081 \
    NODE_REGISTRY "''" \
    LOG_NOCOLOR ${LOG_NOCOLOR} \
    LOG_LEVEL ${LOG_LEVEL} \
    USE_BLOCKCHAIN_STREAM_REGISTRY $USE_BLOCKCHAIN_STREAM_REGISTRY

cd ./run_files/$INSTANCE
echo "Running instance '$INSTANCE' with extra aguments: '${args[@]:-}'"

set +e
while true; do
  temp_file=$(mktemp)

  go run --race ../../node/main.go run "${args[@]:-}"  | tee "$temp_file"

  # go run masks exit code, so exit code 22 is not making it here.
  grep_result=$(grep "Exiting with code 22 to initiate a restart" "$temp_file")

  rm -f "$temp_file"

  # Use the grep_result variable in an if statement
  if [ -n "$grep_result" ]; then
    echo "RESTARTING"
  else
    break
  fi
done

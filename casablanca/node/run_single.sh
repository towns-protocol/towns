#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

INSTANCE=single
USE_CONTRACT=true
METRICS_ENABLED=true
RPC_PORT=5157

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
    METRICS_PORT 8081 

cd ./run_files/$INSTANCE
echo "Running instance '$INSTANCE' with extra aguments: '${args[@]:-}'"
go run --race ../../node/main.go run "${args[@]:-}"

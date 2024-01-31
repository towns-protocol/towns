#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

export DB_PORT=5433
export INSTANCE=single
export LOG_LEVEL=info
export LOG_NOCOLOR=false
export METRICS_ENABLED=true
export METRICS_PORT=8081
export NODE_REGISTRY="''"
export NUM_INSTANCES=1
export REPL_FACTOR=1
export RPC_PORT=5157
export RUN_BASE=./run_files/single
export USE_BLOCKCHAIN_STREAM_REGISTRY=true
export USE_CONTRACT=true

# Parse command-line options
RUN_OPT="-c -r"
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        -c|--config-only)
            RUN_OPT="-c"
            shift
            ;;
        -sc|--skip-config)
            RUN_OPT="-r"
            shift
            ;;
        --disable_entitlements|--de)
            INSTANCE=single_ne
            METRICS_ENABLED=false
            METRICS_PORT=8082
            RPC_PORT=5158
            USE_BLOCKCHAIN_STREAM_REGISTRY=true
            USE_CONTRACT=false
            shift
            ;;
        *)
            args+=("$1")
            shift
            ;;
    esac
done

./run_impl.sh $RUN_OPT "${args[@]:-}"

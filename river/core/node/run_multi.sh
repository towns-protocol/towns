#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

export DISABLE_BASE_CHAIN="${DISABLE_BASE_CHAIN:-false}"
export METRICS_ENABLED="${METRICS_ENABLED:-true}"
export METRICS_PORT="${METRICS_PORT:-8010}"
export RUN_ENV="${RUN_ENV:-multi}"
export NUM_INSTANCES="${NUM_INSTANCES:-10}"
export RPC_PORT="${RPC_PORT:-5170}"

# Parse command-line options
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --disable_entitlements|--de)
            DISABLE_BASE_CHAIN=true
            METRICS_PORT=8040
            RPC_PORT=5180
            RUN_ENV="multi_ne"
            shift
            ;;
        *)
            args+=("$1")
            shift
            ;;
    esac
done

./run_impl.sh "${args[@]:-}"

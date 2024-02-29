#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

export DISABLE_BASE_CHAIN="${DISABLE_BASE_CHAIN:-false}"
export METRICS_ENABLED="${METRICS_ENABLED:-true}"
export RUN_BASE="${RUN_BASE:-./run_files/multi_ent}"

# Parse command-line options
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --disable_entitlements|--de)
            DISABLE_BASE_CHAIN=true
            METRICS_ENABLED=false
            RUN_BASE="./run_files/multi_ne"
            shift
            ;;
        *)
            args+=("$1")
            shift
            ;;
    esac
done

./run_impl.sh "${args[@]:-}"

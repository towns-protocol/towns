#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

export RUN_ENV="multi"

# Parse command-line options
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --disable_entitlements|--de)
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

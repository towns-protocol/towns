#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

: ${RUN_ENV:?} # values are single, single_ne, multi, multi_ne

export RUN_BASE="./run_files/${RUN_ENV}"
export DB_PORT="${DB_PORT:-5433}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export LOG_NOCOLOR="${LOG_NOCOLOR:-false}"
export METRICS_ENABLED="${METRICS_ENABLED:-true}"
export NUM_INSTANCES="${NUM_INSTANCES:-10}"
export REPL_FACTOR="${REPL_FACTOR:-1}"
export RPC_PORT="${RPC_PORT:-5170}"
export DISABLE_BASE_CHAIN="${DISABLE_BASE_CHAIN:-false}"
export RIVER_ENV="local_${RUN_ENV}"
export POSITIVE_ENTITLEMENT_CACHE_TTL_SECONDS="${POSITIVE_ENTITLEMENT_CACHE_TTL_SECONDS:-5}"
export BLOCK_TIME_MS=${BLOCK_TIME_MS:-2000}
export ENABLE_DEBUG_ENDPOINTS=true

[ -z "${BLOCK_TIME_MS+x}" ] && BLOCK_TIME_MS=$(( ${RIVER_BLOCK_TIME:-1} * 1000 ))
export BLOCK_TIME_MS

CONFIG=false
RUN=false
BUILD=false

# Parse command-line options
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --config|-c)
            CONFIG=true
            shift
            ;;
        --run|-r)
            RUN=true
            BUILD=true
            shift
            ;;
        --build|-b)
            BUILD=true
            shift
            ;;
        *)
            args+=("$1")
            shift
            ;;
    esac
done

if [ "$CONFIG" == "false" ] && [ "$RUN" == "false" ] && [ "$BUILD" == "false" ]; then
  echo "--config to config. --run to run. --build to build without running. --config --run to config and run."
  exit 1
fi

if [ "$CONFIG" == "true" ]; then
    mkdir -p ${RUN_BASE}
    ../../scripts/deploy-contracts.sh

    SPACE_FACTORY_ADDRESS=$(jq -r '.address' ../../packages/generated/deployments/${RIVER_ENV}/base/addresses/spaceFactory.json)
    BASE_REGISTRY_ADDRESS=$(jq -r '.address' ../../packages/generated/deployments/${RIVER_ENV}/base/addresses/baseRegistry.json)
    RIVER_REGISTRY_ADDRESS=$(jq -r '.address' ../../packages/generated/deployments/${RIVER_ENV}/river/addresses/riverRegistry.json)    

    export SPACE_FACTORY_ADDRESS
    export BASE_REGISTRY_ADDRESS
    export RIVER_REGISTRY_ADDRESS

    source ../../contracts/.env.localhost

    ../../scripts/set-riverchain-config.sh

    TEMPLATE_FILE="./config-template.yaml"
    OUTPUT_FILE="${RUN_BASE}/common_config.yaml"

    cp "$TEMPLATE_FILE" "$OUTPUT_FILE"
    grep -o '<.*>' "$TEMPLATE_FILE" | sort | uniq | while read -r KEY; do
        key=$(echo "$KEY" | sed 's/^.\(.*\).$/\1/')
        value=${!key:?$key is not set}

        if [ -z "$value" ]; then
            echo "Error: Missing value for key $key" >&2
            exit 1
        fi

        # Check if key exists in the template file
        if ! grep -q "<${key}>" "$OUTPUT_FILE"; then
            echo "Error: Key $key not found in template." >&2
            exit 1
        fi

        # Substitute the key with the value, adjust for macOS or Linux without creating backup files
        if [ "$(uname)" == "Darwin" ]; then  # macOS
            sed -i '' "s^<${key}>^${value}^g" "$OUTPUT_FILE"
        else  # Linux
            sed -i "s^<${key}>^${value}^g" "$OUTPUT_FILE"
        fi
    done


    for ((i=0; i<NUM_INSTANCES; i++)); do
        printf -v INSTANCE "%02d" $i
        export INSTANCE
        I_RPC_PORT=$((RPC_PORT + i))

        RPC_PORT=${I_RPC_PORT} \
        ./config_instance.sh

        NODE_ADDRESS=$(cat ${RUN_BASE}/$INSTANCE/wallet/node_address)
        echo "Adding node record to blockchain river registry at address ${RIVER_REGISTRY_ADDRESS}"
        cast send \
            --rpc-url http://127.0.0.1:8546 \
            --private-key $LOCAL_PRIVATE_KEY \
            $RIVER_REGISTRY_ADDRESS \
            "registerNode(address,string,uint8)" \
            $NODE_ADDRESS \
            https://localhost:$I_RPC_PORT \
            2 > /dev/null
    done

    echo "Node records in contract:"
    cast call \
        --rpc-url http://127.0.0.1:8546 \
        $RIVER_REGISTRY_ADDRESS \
        "getAllNodes()((uint8,string,address,address)[])" | sed 's/),/),\n/g'
    echo "<<<<<<<<<<<<<<<<<<<<<<<<<"

    # config xchain config for this deployment
    # the script is call create_multi.sh because there are always multiple xchain nodes for a deployment
    # xchain depends on base, so only configure it when base is enabled
    if [ "$DISABLE_BASE_CHAIN" != "true" ]; then
        ../xchain/create_multi.sh
    fi

fi

if [ "$BUILD" == "true" ]; then
    OUTPUT=${RUN_BASE}/bin/river_node
    echo Building node binary ${OUTPUT}
    mkdir -p ${RUN_BASE}/bin
    go build \
        -o ${OUTPUT} \
        -race \
        -ldflags="-X github.com/river-build/river/core/river_node/version.branch=$(git rev-parse --abbrev-ref HEAD) -X github.com/river-build/river/core/river_node/version.commit=$(git describe --tags --always --dirty)" \
        ../river_node/main.go
fi

if [ "$RUN" == "true" ]; then
    pushd ${RUN_BASE}
    while read -r INSTANCE; do
        if [ ! -f $INSTANCE/config/config.env ]; then
            continue
        fi

        pushd $INSTANCE
        echo "Running instance '$INSTANCE' with extra aguments: '${args[@]:-}'"
        cast rpc -r http://127.0.0.1:8546 anvil_setBalance `cat ./wallet/node_address` 10000000000000000000

        ../bin/river_node run stream --config ../common_config.yaml --config config/config.env "${args[@]:-}" &

        popd
    done < <(find . -type d -mindepth 1 -maxdepth 1 | sort)

    echo "All instances started"

    # At the end of the script, or in a cleanup handler
    cleanup() {
        while read -r job_pid; do
            echo "Waiting on job with PID $job_pid"
            wait "$job_pid" 2>/dev/null
        done < <(jobs -p)
        echo "Cleanup complete."
    }

    # Register the cleanup function to handle SIGINT and SIGTERM
    trap cleanup SIGINT SIGTERM
    wait
fi

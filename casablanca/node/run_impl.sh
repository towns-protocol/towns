#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

: ${RUN_BASE:?}

export DB_PORT="${DB_PORT:-5433}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export LOG_NOCOLOR="${LOG_NOCOLOR:-false}"
export METRICS_ENABLED="${METRICS_ENABLED:-true}"
export METRICS_PORT="${METRICS_PORT:-8010}"
export NODE_REGISTRY="${NODE_REGISTRY:-../node_registry.json}"
export NODE_REGISTRY_PATH="${NODE_REGISTRY_PATH:-${RUN_BASE}/node_registry.json}"
export NUM_INSTANCES="${NUM_INSTANCES:-10}"
export REPL_FACTOR="${REPL_FACTOR:-1}"
export RPC_PORT="${RPC_PORT:-5170}"
export USE_BLOCKCHAIN_STREAM_REGISTRY="${USE_BLOCKCHAIN_STREAM_REGISTRY:-true}"
export USE_CONTRACT="${USE_CONTRACT:-true}"

CONFIG=false
RUN=false

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
            shift
            ;;    
        *)
            args+=("$1")
            shift
            ;;
    esac
done

if [ "$CONFIG" == "false" ] && [ "$RUN" == "false" ]; then
  echo "--config to config. --run to run. Both to config and run."
  exit 1
fi

if [ "$CONFIG" == "true" ]; then
    mkdir -p ${RUN_BASE}
    cp -r ./run_files/addresses ${RUN_BASE}/addresses
    SAVE_DEPLOYMENTS_PATH=casablanca/node/${RUN_BASE}/addresses ../../scripts/deploy-river-registry.sh

    if [ "$USE_BLOCKCHAIN_STREAM_REGISTRY" == "true" ]; then
        source ../../contracts/.env.localhost
        RIVER_REGISTRY_ADDRESS=$(jq -r .address ${RUN_BASE}/addresses/riverRegistry.json)
    fi
    
   echo "{" > ${NODE_REGISTRY_PATH}
    echo "  \"nodes\": [" >> ${NODE_REGISTRY_PATH}

    for ((i=0; i<NUM_INSTANCES; i++)); do
        printf -v INSTANCE "%02d" $i
        export INSTANCE
        I_RPC_PORT=$((RPC_PORT + i))
        I_METRICS_PORT=$((METRICS_PORT + i))

        RPC_PORT=${I_RPC_PORT} \
        METRICS_PORT=${I_METRICS_PORT} \
        ./config_instance.sh

        NODE_ADDRESS=$(cat ${RUN_BASE}/$INSTANCE/wallet/node_address)
        echo "    { \"name\": \"$INSTANCE\", \"address\": \"$NODE_ADDRESS\", \"url\": \"http://localhost:$I_RPC_PORT\", \"port\": $I_RPC_PORT }," >> ${NODE_REGISTRY_PATH}

        if [ "$USE_BLOCKCHAIN_STREAM_REGISTRY" == "true" ]; then
            echo "Adding node record to blockchain river registry"
            cast send \
                --rpc-url http://127.0.0.1:8546 \
                --private-key $LOCAL_PRIVATE_KEY \
                $RIVER_REGISTRY_ADDRESS \
                "addNode(address,string)" \
                $NODE_ADDRESS \
                http://localhost:$I_RPC_PORT > /dev/null
        fi
    done

    sed -i.bak '$ s/,$//' ${NODE_REGISTRY_PATH} && rm ${NODE_REGISTRY_PATH}.bak
    echo "  ]" >> ${NODE_REGISTRY_PATH}
    echo "}" >> ${NODE_REGISTRY_PATH}

    if [ "$USE_BLOCKCHAIN_STREAM_REGISTRY" == "true" ]; then
        echo "Node records in contract:"
        cast call \
            --rpc-url http://127.0.0.1:8546 \
            $RIVER_REGISTRY_ADDRESS \
            "getAllNodes()((address,string)[])" | sed 's/),/),\n/g'
        echo "<<<<<<<<<<<<<<<<<<<<<<<<<"
    fi
fi

if [ "$RUN" == "true" ]; then
    echo Building node binary
    mkdir -p ${RUN_BASE}/bin
    go build -o ${RUN_BASE}/bin/river_node -race ./node/main.go

    jq -r ".nodes[].name" ${NODE_REGISTRY_PATH} | while read -r INSTANCE; do
        pushd ${RUN_BASE}/$INSTANCE
        echo "Running instance '$INSTANCE' with extra aguments: '${args[@]:-}'"
        if [ "$USE_BLOCKCHAIN_STREAM_REGISTRY" == "true" ]; then
            echo "And funding it with 1 ETH"
            cast rpc -r http://127.0.0.1:8546 anvil_setBalance `cat ./wallet/node_address` 1000000000000000000 > /dev/null
        fi

        # if NUM_INSTANCES in not one, run in background, otherwise run with optional restart
        if [ "$NUM_INSTANCES" -ne 1 ]; then
            ../bin/river_node run --config config/config.yaml "${args[@]:-}" &
        else 
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
        popd
    done
fi



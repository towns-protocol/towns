#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

export USE_CONTRACT=true
export METRICS_ENABLED=true
export RPC_PORT=5170
export METRICS_PORT=8010
export DB_PORT=5433
export USE_BLOCKCHAIN_STREAM_REGISTRY=true
export NODE_REGISTRY=../node_registry.json
export LOG_NOCOLOR=false
export LOG_LEVEL=info
export NUM_INSTANCES=10
export REPL_FACTOR=1
export RUN_BASE=./run_files

CONFIG=false
RUN=false

# Parse command-line options
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --disable_entitlements|--de)
            USE_CONTRACT=false
            METRICS_ENABLED=false
            shift
            ;;
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
    echo "{" > ${RUN_BASE}/node_registry.json
    echo "  \"nodes\": [" >> ${RUN_BASE}/node_registry.json

    for ((i=0; i<NUM_INSTANCES; i++)); do
        printf -v INSTANCE "%02d" $i
        export INSTANCE
        I_RPC_PORT=$((RPC_PORT + i))
        I_METRICS_PORT=$((METRICS_PORT + i))

        RPC_PORT=${I_RPC_PORT} \
        METRICS_PORT=${I_METRICS_PORT} \
        ./config_instance.sh

        NODE_ADDRESS=$(cat ${RUN_BASE}/$INSTANCE/wallet/node_address)
        echo "    { \"name\": \"$INSTANCE\", \"address\": \"$NODE_ADDRESS\", \"url\": \"http://localhost:$I_RPC_PORT\", \"port\": $I_RPC_PORT }," >> ${RUN_BASE}/node_registry.json
    done

    sed -i.bak '$ s/,$//' ${RUN_BASE}/node_registry.json && rm ${RUN_BASE}/node_registry.json.bak
    echo "  ]" >> ${RUN_BASE}/node_registry.json
    echo "}" >> ${RUN_BASE}/node_registry.json
fi

if [ "$RUN" == "true" ]; then
    echo Building node binary
    mkdir -p ${RUN_BASE}/bin
    go build -o ${RUN_BASE}/bin/river_node -race ./node/main.go

    jq -r ".nodes[].name" ${RUN_BASE}/node_registry.json | while read -r INSTANCE; do
        pushd ${RUN_BASE}/$INSTANCE
        echo "Running instance '$INSTANCE' with extra aguments: '${args[@]:-}'"
        if [ "$USE_BLOCKCHAIN_STREAM_REGISTRY" == "true" ]; then
            echo "And funding it with 1 ETH"
            cast rpc -r http://127.0.0.1:8546 anvil_setBalance `cat ./wallet/node_address` 1000000000000000000 > /dev/null
        fi
        ../bin/river_node run --config config/config.yaml "${args[@]:-}" &
        popd
    done
fi



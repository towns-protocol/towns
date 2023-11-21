#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

USE_CONTRACT=true
METRICS_ENABLED=true
RPC_PORT=5170
METRICS_PORT=8010
DB_PORT=5433
USE_BLOCKCHAIN_STREAM_REGISTRY=false

# Default number of instances
NUM_INSTANCES=3
REPL_FACTOR=1

CONFIG=false
RUN=false

# Parse command-line options
args=() # Collect arguments to pass to the last command
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --instances|-n)
            NUM_INSTANCES="$2"
            shift 2
            ;;
        --repl)
            REPL_FACTOR="$2"
            shift 2
            ;;            
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
    echo "{" > ./run_files/node_registry.json
    echo "  \"nodes\": [" >> ./run_files/node_registry.json

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
            METRICS_PORT ${I_METRICS_PORT} \
            NODE_REGISTRY ../node_registry.json \
            LOG_NOCOLOR false \
            LOG_LEVEL info \
            REPL_FACTOR $REPL_FACTOR \
            USE_BLOCKCHAIN_STREAM_REGISTRY $USE_BLOCKCHAIN_STREAM_REGISTRY

        NODE_ADDRESS=$(cat ./run_files/$INSTANCE/wallet/node_address)
        echo "    { \"name\": \"$INSTANCE\", \"address\": \"$NODE_ADDRESS\", \"url\": \"http://localhost:$I_RPC_PORT\", \"port\": $I_RPC_PORT }," >> ./run_files/node_registry.json
    done

    sed -i.bak '$ s/,$//' ./run_files/node_registry.json && rm ./run_files/node_registry.json.bak
    echo "  ]" >> ./run_files/node_registry.json
    echo "}" >> ./run_files/node_registry.json
fi

if [ "$RUN" == "true" ]; then
    jq ".nodes[].name" ./run_files/node_registry.json | while read -r INSTANCE; do
        INSTANCE=${INSTANCE//\"}
        pushd ./run_files/$INSTANCE
        echo "Running instance '$INSTANCE' with extra aguments: '${args[@]:-}'"
        LOGINSTANCE=true go run --race ../../node/main.go run --config config/config.yaml "${args[@]:-}" &
        popd
    done
fi



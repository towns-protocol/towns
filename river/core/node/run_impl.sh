#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

: ${RUN_ENV:?} # values are multi, multi_ne

# check given env.env exists to validate RUN_ENV
export ENV_PATH_BASE="../env/local"
export ENV_PATH="${ENV_PATH_BASE}/${RUN_ENV}"
if [ ! -f "${ENV_PATH}/env.env" ]; then
    echo "Invalid RUN_ENV: ${RUN_ENV}"
    exit 1
fi
# source env params from ../env/local/${RUN_ENV}/env.env
source ${ENV_PATH}/env.env

# check required vars are set
: ${NUM_INSTANCES:?}
: ${RPC_PORT:?}
: ${DISABLE_BASE_CHAIN:?}

export RUN_BASE="../run_files/${RUN_ENV}"
export RIVER_ENV="local_${RUN_ENV}"

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

    export SPACE_FACTORY_ADDRESS=$(jq -r '.address' ../../packages/generated/deployments/${RIVER_ENV}/base/addresses/spaceFactory.json)
    export BASE_REGISTRY_ADDRESS=$(jq -r '.address' ../../packages/generated/deployments/${RIVER_ENV}/base/addresses/baseRegistry.json)
    export RIVER_REGISTRY_ADDRESS=$(jq -r '.address' ../../packages/generated/deployments/${RIVER_ENV}/river/addresses/riverRegistry.json)    
    export ENTITLEMENT_TEST_ADDRESS=$(jq -r '.address' ../../packages/generated/deployments/${RIVER_ENV}/base/addresses/entitlementGatedExample.json)

    echo "" > ${RUN_BASE}/contracts.env
    echo "RIVER_ARCHITECTCONTRACT_ADDRESS=${SPACE_FACTORY_ADDRESS}" >> ${RUN_BASE}/contracts.env
    echo "RIVER_ENTITLEMENT_CONTRACT_ADDRESS=${BASE_REGISTRY_ADDRESS}" >> ${RUN_BASE}/contracts.env
    echo "RIVER_REGISTRYCONTRACT_ADDRESS=${RIVER_REGISTRY_ADDRESS}" >> ${RUN_BASE}/contracts.env
    echo "RIVER_TEST_CONTRACT_ADDRESS=${ENTITLEMENT_TEST_ADDRESS}" >> ${RUN_BASE}/contracts.env

    source ../../contracts/.env.localhost
    OPERATOR_ADDRESS=$(cast wallet addr $LOCAL_PRIVATE_KEY)

    if [ "$DISABLE_BASE_CHAIN" != "true" ]; then
        echo "Registration of operator $OPERATOR_ADDRESS in base registry at address $BASE_REGISTRY_ADDRESS"
        # register operator
        cast send \
            --rpc-url http://127.0.0.1:8545 \
            --private-key $LOCAL_PRIVATE_KEY \
            $BASE_REGISTRY_ADDRESS \
            "registerOperator(address)" \
            $OPERATOR_ADDRESS > /dev/null
        # set operator to approved
        cast send \
            --rpc-url http://127.0.0.1:8545 \
            --private-key $TESTNET_PRIVATE_KEY \
            $BASE_REGISTRY_ADDRESS \
            "setOperatorStatus(address,uint8)" \
            $OPERATOR_ADDRESS \
            2 > /dev/null
    fi

    ../../scripts/set-riverchain-config.sh

    cp ${ENV_PATH_BASE}/common/common.yaml ${RUN_BASE}/common.yaml
    cp ${ENV_PATH_BASE}/common/run.sh ${RUN_BASE}/run.sh
    cp ${ENV_PATH}/config.yaml ${RUN_BASE}/config.yaml

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

        if [ "$DISABLE_BASE_CHAIN" != "true" ]; then
            echo "Registration of node $NODE_ADDRESS in base registry at address $BASE_REGISTRY_ADDRESS"
            cast send \
                --rpc-url http://127.0.0.1:8545 \
                --private-key $LOCAL_PRIVATE_KEY \
                $BASE_REGISTRY_ADDRESS \
                "registerNode(address)" \
                $NODE_ADDRESS > /dev/null
        fi
    done

    echo "Node records in contract:"
    cast call \
        --rpc-url http://127.0.0.1:8546 \
        $RIVER_REGISTRY_ADDRESS \
        "getAllNodes()((uint8,string,address,address)[])" | sed 's/),/),\n/g'
    echo "<<<<<<<<<<<<<<<<<<<<<<<<<"
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
    if [ "$DISABLE_BASE_CHAIN" == "true" ]; then
        RUN_CMD="run stream"
    else
        RUN_CMD="run"
    fi

    pushd ${RUN_BASE}
    while read -r INSTANCE; do
        if [ ! -f $INSTANCE/config/config.env ]; then
            continue
        fi

        pushd $INSTANCE
        echo "Running instance '$INSTANCE' with extra aguments: '${args[@]:-}'"
        # could be a geth node, in which case funding should be handled elsewhere
        if ! cast rpc -r http://127.0.0.1:8545 anvil_setBalance `cat ./wallet/node_address` 10000000000000000000; then
            echo "Failed to set balance on port 8545, continuing..."
        fi
        cast rpc -r http://127.0.0.1:8546 anvil_setBalance `cat ./wallet/node_address` 10000000000000000000

        ../bin/river_node ${RUN_CMD} --config ../common.yaml --config ../contracts.env --config ../config.yaml --config config/config.env "${args[@]:-}" &

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

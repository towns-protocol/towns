#!/bin/bash

# Node registration library for River Registry

# Environment variables needed:
# - RPC_URL
# - PRIVATE_KEY

# Construct the relative path to the address file for the River Registry
JSON_FILE="packages/generated/addresses/river/riverRegistry.json"

RIVER_REGISTRY_ADDRESS=$(jq -r '.address' "$JSON_FILE")

# Export the variable if you want it available in subsequent commands
export RIVER_REGISTRY_ADDRESS

echo "RIVER_REGISTRY_ADDRESS: $RIVER_REGISTRY_ADDRESS"


function register_node() {
    local node_address=$1 # node wallet address
    local node_url=$2 # node https url

    # uint8 is the NodeStatus enum
    # and 2 corresponds to Operational

    cast send \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY \
        $RIVER_REGISTRY_ADDRESS \
        "registerNode(address,string,uint8)" \
        $node_address \
        $node_url \
        2 > /dev/null
}

function update_node_url() {
    local node_address=$1
    local node_url=$2

    cast send \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY \
        $RIVER_REGISTRY_ADDRESS \
        "updateNodeUrl(address nodeAddress, string url)" \
        $node_address \
        $node_url > /dev/null
}

function update_node_status() {
    local node_address=$1
    local node_status=$2

    cast send \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY \
        $RIVER_REGISTRY_ADDRESS \
        "updateNodeStatus(address,uint8)" \
        $node_address \
        $node_status > /dev/null
}

function node_exists() {
    local node_address=$1
    
    # if the node doesnt exist, this will revert
    # so detect that and return false

    cast call \
        --rpc-url $RPC_URL \
        $RIVER_REGISTRY_ADDRESS \
        "getNode(address)" \
        $node_address &>/dev/null

    # Check exit status of the cast call
    if [ $? -eq 0 ]; then
        echo "true"
    else
        # Reverted or other error
        echo "false"
    fi
}

function register_or_update_node_url() {
    local node_address=$1
    local node_url=$2

    local exists=$(node_exists $node_address)

    if [ "$exists" == "true" ]; then
        echo "Node exists at $node_address, updating node url"
        update_node_url $node_address $node_url
    else
        echo "Node does not exist at $node_address, adding"
        register_node $node_address $node_url
    fi
}
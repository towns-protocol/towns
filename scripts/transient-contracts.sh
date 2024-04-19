#!/bin/bash

set -eo pipefail

# This script does the following:
# 1. Deploys the contracts
# 2. Registers the nodes
# 3. Updates the aws parameter stores with the deployed contracts

function main() {
    check_env

    # if the parameter store is dirty, exit with 0. This is to prevent the script from running multiple times.
    if [ $(is_dirty_parameter_store) == "true" ]; then
        echo "The parameter store is dirty. Exiting."
        exit 0
    else
        echo "The parameter store is clean. Proceeding."
    fi

    deploy_contracts
    fund_wallets $BASE_ANVIL_RPC_URL
    fund_wallets $RIVER_ANVIL_RPC_URL
    register_nodes
    update_parameter_stores_with_deployed_contracts
    echo "Updated parameter stores."
    check_parameter_stores
}

function check_env() {
    if [ -z "$TRANSIENT_ID" ]; then
        echo "TRANSIENT_ID is not set"
        exit 1
    fi

    if [ -z "$NUM_NODES" ]; then
        echo "NUM_NODES is not set"
        exit 1
    fi

    export ENVIRONMENT_NAME="transient-${TRANSIENT_ID}"
    export BASE_ANVIL_RPC_URL="https://base-anvil-${ENVIRONMENT_NAME}.towns.com"
    export RIVER_ANVIL_RPC_URL="https://river-anvil-${ENVIRONMENT_NAME}.towns.com"
}

function register_nodes() {
    pushd ./river/contracts

        set -a
        . .env.localhost
        set +a

        export NUM_NODES=${NUM_NODES}
        export NODE_URL_SUFFIX="-nlb-${TRANSIENT_ID}.nodes.transient.towns.com"
        export NODE_URL_INCREMENT_VIA_PORT="true"
        make interact-river-anvil contract=InteractRiverRegistry

    popd
}

function fund_wallet() {
    local rpc_url=$1
    local wallet=$2
    local amount="0x021e19e0c9bab2400000" # 1000 ETH
    
    local curl_data_payload='{
        "method": "anvil_setBalance",
        "id": 1,
        "jsonrpc": "2.0",
        "params": [
            "'${wallet}'", 
            "'${amount}'"
        ]
    }'

    echo "Funding wallet: $wallet"

    curl "$rpc_url" \
        -X POST \
        -H "Content-Type: application/json" \
        --data "$curl_data_payload"
}

function fund_wallets() {
    local rpc_url=$1;

    local wallets=(
        "0xBF2Fe1D28887A0000A1541291c895a26bD7B1DdD"
        "0x43EaCe8E799497f8206E579f7CCd1EC41770d099"
        "0x4E9baef70f7505fda609967870b8b489AF294796"
        "0xae2Ef76C62C199BC49bB38DB99B29726bD8A8e53"
        "0xC4f042CD5aeF82DB8C089AD0CC4DD7d26B2684cB"
        "0x9BB3b35BBF3FA8030cCdb31030CF78039A0d0D9b"
        "0x582c64BA11bf70E0BaC39988Cd3Bf0b8f40BDEc4"
        "0x9df6e5F15ec682ca58Df6d2a831436973f98fe60"
        "0xB79FaCbFC07Bff49cD2e2971305Da0DF7aCa9bF8"
        "0xA278267f396a317c5Bb583f47F7f2792Bc00D3b3"
    )

    for wallet in "${wallets[@]}"
    do
        fund_wallet $rpc_url $wallet
    done

}

function is_dirty_parameter_store() {
    wallet_link_contract_address=$(get_aws_parameter_store_value_for_contract "wallet-link")
    if [ "$wallet_link_contract_address" != "NULL" ]; then
        echo "true"
    else
        echo "false"
    fi
}

function get_aws_parameter_store_value_for_contract() {
    local contract_name=$1

    # Define the parameter name
    PARAM_NAME="${contract_name}-contract-address-${ENVIRONMENT_NAME}"

    # Retrieve the parameter value
    PARAM_VALUE=$(aws ssm get-parameter --name "$PARAM_NAME" --query "Parameter.Value" --output text)

    # Check if the retrieval was successful
    if [ $? -eq 0 ]; then
        echo "$PARAM_VALUE"
    else
        echo "Failed to retrieve the parameter." >&2
        exit 1
    fi
}

function set_aws_parameter_store_value_for_contract() {
    local contract_name=$1
    local contract_address=$2

    # Define the parameter name
    PARAM_NAME="${contract_name}-contract-address-${ENVIRONMENT_NAME}"

    # Set the parameter value
    aws ssm put-parameter --name "$PARAM_NAME" --value "$contract_address" --type "String" --overwrite

    # Check if the setting was successful
    if [ $? -eq 0 ]; then
        echo "Parameter set successfully."
    else
        echo "Failed to set the parameter."
        exit 1
    fi
}

function deploy_contracts() {
    export SKIP_CHAIN_WAIT="true"
    export RIVER_ENV=$ENVIRONMENT_NAME

    pushd ./river
        ./scripts/deploy-contracts.sh
    popd
}

function update_parameter_stores_with_deployed_contracts() {
    local transient_deployment=$(cat "./river/packages/generated/config/deployments.json" | jq '.["'${ENVIRONMENT_NAME}'"]')

    local spaceFactory=$(echo $transient_deployment | jq '.["base"]["addresses"]["spaceFactory"]' | tr -d '"')
    local walletLink=$(echo $transient_deployment | jq '.["base"]["addresses"]["walletLink"]' | tr -d '"')
    local entitlementChecker=$(echo $transient_deployment | jq '.["base"]["addresses"]["entitlementChecker"]' | tr -d '"')
    local riverRegistry=$(echo $transient_deployment | jq '.["river"]["addresses"]["riverRegistry"]' | tr -d '"')
    local spaceOwner=$(echo $transient_deployment | jq '.["base"]["addresses"]["spaceOwner"]' | tr -d '"')

    echo "spaceFactory: $spaceFactory"
    echo "walletLink: $walletLink"
    echo "entitlementChecker: $entitlementChecker"
    echo "riverRegistry: $riverRegistry"
    echo "spaceOwner: $spaceOwner"

    set_aws_parameter_store_value_for_contract "space-factory" $spaceFactory > /dev/null    
    set_aws_parameter_store_value_for_contract "entitlement-checker" $entitlementChecker > /dev/null
    set_aws_parameter_store_value_for_contract "river-registry" $riverRegistry > /dev/null
    set_aws_parameter_store_value_for_contract "wallet-link" $walletLink > /dev/null
    set_aws_parameter_store_value_for_contract "space-owner" $spaceOwner > /dev/null
}

function check_parameter_stores() {
    echo "Checking parameter stores..."

    local spaceFactory=$(get_aws_parameter_store_value_for_contract "space-factory")
    local entitlementChecker=$(get_aws_parameter_store_value_for_contract "entitlement-checker")
    local riverRegistry=$(get_aws_parameter_store_value_for_contract "river-registry")
    local walletLink=$(get_aws_parameter_store_value_for_contract "wallet-link")
    local spaceOwner=$(get_aws_parameter_store_value_for_contract "space-owner")

    echo "spaceFactory: $spaceFactory"
    echo "entitlementChecker: $entitlementChecker"
    echo "riverRegistry: $riverRegistry"
    echo "walletLink: $walletLink"
    echo "spaceOwner: $spaceOwner"
}

main
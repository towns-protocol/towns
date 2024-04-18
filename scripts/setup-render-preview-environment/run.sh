#!/usr/bin/env bash

set -eo pipefail
set +v

# Main logic
function main() {
    if [ "$IS_PULL_REQUEST" != true ]; then
        echo "Not a pull request. No preview setup needed."
        return 0
    fi

    check_env

    pr_number=$(get_pr_number_of_preview)
    mode=$(get_transient_env_mode "$pr_number")

    set_domain "$pr_number"

    if [ "$mode" = "lite" ]; then
        echo "Lite mode detected. No need to set up transient environment."
        return 0
    fi

    # install boto3 via pip to use aws. unfortunately, we can't setup aws inside render.
    pip install boto3
    set_env "$pr_number"
}

function check_env() {

    if [ -z "$RENDER_API_KEY" ] || [ -z "$PREVIEW_DOMAIN_SUFFIX" ]; then
        echo "Must set RENDER_API_KEY and PREVIEW_DOMAIN_SUFFIX environment variables!"
        exit 1
    fi

    if [ -z "$AWS_ACCESS_KEY_ID" ]; then
        echo "AWS_ACCESS_KEY_ID is not set."
        exit 1
    fi

    if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        echo "AWS_SECRET_ACCESS_KEY is not set."
        exit 1
    fi

    AWS_REGION=${AWS_REGION:-$AWS_DEFAULT_REGION}

    if [ -z "$AWS_REGION" ]; then
        echo "AWS_REGION is not set."
        exit 1
    fi
}

function set_domain() {
    local pr_number="$1"
    domain="$pr_number.$PREVIEW_DOMAIN_SUFFIX"

    echo "Setting service $RENDER_SERVICE_ID domain to $domain"
    curl  \
        --url https://api.render.com/v1/services/$RENDER_SERVICE_ID/custom-domains \
        --header "Accept: application/json" \
        --header "Authorization: Bearer $RENDER_API_KEY" \
        --header "Content-Type: application/json" \
        --data '{"name":"'"$domain"'"}'
}

function assert_is_address() {
    local address="$1"
    if [[ ! "$address" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
        echo "Invalid Ethereum address: $address"
        exit 1
    fi
}

function set_env() {
    local pr_number="$1"

    export VITE_RIVER_ENV="transient-${pr_number}"
    export VITE_BASE_CHAIN_RPC_URL="https://base-anvil-transient-${pr_number}.towns.com"
    export VITE_BASE_CHAIN_WS_URL="wss://base-anvil-transient-${pr_number}.towns.com"
    export VITE_RIVER_CHAIN_RPC_URL="https://river-anvil-transient-${pr_number}.towns.com"
    export VITE_RIVER_CHAIN_WS_URL="wss://river-anvil-transient-${pr_number}.towns.com"
    export VITE_BASE_CHAIN_ID="31337"
    export VITE_RIVER_CHAIN_ID="31338"

    export VITE_ADDRESS_SPACE_FACTORY=$(get_aws_parameter_store_value_for_contract $pr_number "space-factory")
    export VITE_ADDRESS_SPACE_OWNER=$(get_aws_parameter_store_value_for_contract $pr_number "space-owner")
    export VITE_ADDRESS_WALLET_LINK=$(get_aws_parameter_store_value_for_contract $pr_number "wallet-link")
    export VITE_ADDRESS_RIVER_REGISTRY=$(get_aws_parameter_store_value_for_contract $pr_number "river-registry")

    assert_is_address "$VITE_ADDRESS_SPACE_FACTORY"
    assert_is_address "$VITE_ADDRESS_SPACE_OWNER"
    assert_is_address "$VITE_ADDRESS_WALLET_LINK"
    assert_is_address "$VITE_ADDRESS_RIVER_REGISTRY"

    echo "Setting VITE_ADDRESS_SPACE_FACTORY to $VITE_ADDRESS_SPACE_FACTORY"
    echo "Setting VITE_ADDRESS_SPACE_OWNER to $VITE_ADDRESS_SPACE_OWNER"
    echo "Setting VITE_ADDRESS_WALLET_LINK to $VITE_ADDRESS_WALLET_LINK"
    echo "Setting VITE_ADDRESS_RIVER_REGISTRY to $VITE_ADDRESS_RIVER_REGISTRY"

    echo "Setting VITE_TRANSIENT_ENV_GITHUB_PR_NUMBER to $pr_number"
    export VITE_TRANSIENT_ENV_GITHUB_PR_NUMBER="$pr_number"
}

# Function to get transient environment mode
function get_transient_env_mode() {
    local pr_number="$1"
    if [ -z "$pr_number" ]; then
        echo "Usage: get_transient_env_mode <pr_number>"
        return 1
    fi

    local api_url="https://api.github.com/repos/HereNotThere/harmony/issues/$pr_number/labels"
    local labels
    labels=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "$api_url" | jq -r '.[].name')

    if [[ $labels == *"single-node"* ]]; then
        echo "single-node"
    elif [[ $labels == *"multi-node"* ]]; then
        echo "multi-node"
    else
        echo "lite"
    fi
}

# Function to get PR number from preview
function get_pr_number_of_preview() {
    local service_info_url
    local response
    local body
    local status
    local slug
    local last_element

    service_info_url="https://api.render.com/v1/services/$RENDER_SERVICE_ID"
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" --request GET \
                        --url "$service_info_url" \
                        --header 'accept: application/json' \
                        --header "Authorization: Bearer $RENDER_API_KEY")
    body=$(echo "$response" | sed -e 's/HTTPSTATUS\:.*//g')
    status=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

    if [ "$status" -ne 200 ]; then
        echo "Error while getting the service info. [HTTP status: $status]"
        echo "$body"
        exit 1
    fi

    slug=$(echo "$body" | jq -r '.slug')
    last_element="${slug##*-}"

    echo "$last_element"
}

function get_aws_parameter_store_value_for_contract() {
    local pr_number=$1
    local contract_name=$2

    local environment_name="transient-${pr_number}"
    local param_name="${contract_name}-contract-address-${environment_name}"

    python_script_dir="$current_script_dir/get-parameter.py"


    param_value=$(python "./scripts/setup-render-preview-environment/get-parameter.py" "$param_name")

    # exit if the python script fails
    if [ $? -ne 0 ]; then
        echo "Failed to get parameter value for $param_name">&2
        exit 1
    else
        echo "Got parameter value for $param_name: $param_value">&2
        echo "$param_value"
    fi
}

main
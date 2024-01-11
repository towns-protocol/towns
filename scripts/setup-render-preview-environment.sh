#!/usr/bin/env bash

set -e

# Function to get transient environment mode
get_transient_env_mode() {
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

# Function to get transient river node URL
get_transient_river_node_url() {
    local pr_number="$1"
    local node_number="$2"

    echo "https://river${node_number}-transient-${pr_number}.towns.com"
}

# Function to get comma-separated list of transient river node URLs
get_transient_multinode_csv_node_urls() {
    local pr_number="$1"
    local num_nodes="$2"
    local node_urls=""
    local current_node_url

    for i in $(seq 1 "$num_nodes"); do
        current_node_url=$(get_transient_river_node_url "$pr_number" "$i")
        if [ -z "$node_urls" ]; then
            node_urls="$current_node_url"
        else
            node_urls="$node_urls,$current_node_url"
        fi
    done
    echo "$node_urls"
}

# Function to get PR number from preview
get_pr_number_of_preview() {
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
        return 1
    fi

    slug=$(echo "$body" | jq -r '.slug')
    last_element="${slug##*-}"

    echo "$last_element"
}

# Main logic
if [ "$IS_PULL_REQUEST" = true ]; then
    if [ -z "$RENDER_API_KEY" ] || [ -z "$PREVIEW_DOMAIN_SUFFIX" ]; then
        echo "Must set RENDER_API_KEY and PREVIEW_DOMAIN_SUFFIX environment variables!"
        exit 1
    fi

    pr_number=$(get_pr_number_of_preview)
    mode=$(get_transient_env_mode "$pr_number")
    domain="$pr_number.$PREVIEW_DOMAIN_SUFFIX"
    transient_provider_http_url="https://base-fork-transient-${pr_number}.towns.com"
    transient_provider_ws_url="wss://base-fork-transient-${pr_number}.towns.com"

    echo "Setting service $RENDER_SERVICE_ID domain to $domain"
    curl  \
        --url https://api.render.com/v1/services/$RENDER_SERVICE_ID/custom-domains \
        --header "Accept: application/json" \
        --header "Authorization: Bearer $RENDER_API_KEY" \
        --header "Content-Type: application/json" \
        --data '{"name":"'"$domain"'"}'

    transient_single_node_river_url=$(get_transient_river_node_url $pr_number 1)
    transient_multi_node_river_url=$(get_transient_multinode_csv_node_urls $pr_number 10)
    test_beta_river_node_url="https://river1-test-beta.towns.com"

    # Set VITE_CASABLANCA_HOMESERVER_URL based on mode
    if [ "$mode" = "single-node" ]; then
        echo "Setting VITE_CASABLANCA_HOMESERVER_URL to $transient_single_node_river_url"
        export VITE_CASABLANCA_HOMESERVER_URL="$transient_single_node_river_url"
    elif [ "$mode" = "multi-node" ]; then
        echo "Setting VITE_CASABLANCA_HOMESERVER_URL to $transient_multi_node_river_url"
        export VITE_CASABLANCA_HOMESERVER_URL="$transient_multi_node_river_url"
    fi

    if [ "$mode" = "single-node" ] || [ "$mode" = "multi-node" ]; then
        echo "Setting VITE_PROVIDER_HTTP_URL to $transient_provider_http_url"
        export VITE_PROVIDER_HTTP_URL="$transient_provider_http_url"

        echo "Setting VITE_PROVIDER_WS_URL to $transient_provider_ws_url"
        export VITE_PROVIDER_WS_URL="$transient_provider_ws_url"
    fi

    echo "Setting VITE_TRANSIENT_ENV_GITHUB_PR_NUMBER to $pr_number"
    export VITE_TRANSIENT_ENV_GITHUB_PR_NUMBER="$pr_number"

else
    echo "Not a pull request. No custom domain needed."
fi
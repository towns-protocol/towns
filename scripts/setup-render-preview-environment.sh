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
    set_domain "$pr_number"
    set_pr_number_render_environment "$pr_number"
}

function set_pr_number_render_environment() {
    local pr_number="$1"

    echo "Setting VITE_GITHUB_PR_NUMBER number $pr_number in Render environment"

    curl  \
        --request PUT \
        --url https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars/VITE_GITHUB_PR_NUMBER \
        --header "Authorization: Bearer $RENDER_API_KEY" \
        --header 'accept: application/json' \
        --header 'content-type: application/json' \
        --data '{ "value": "'"$pr_number"'" }'
}

function check_env() {
    if [ -z "$RENDER_API_KEY" ]; then
        echo "Must set RENDER_API_KEY environment variable"
        exit 1
    fi

    if [ -z "$RENDER_SERVICE_ID" ]; then
        echo "RENDER_SERVICE_ID must be set automatically by the render builder"
        exit 1
    fi
}

function set_domain() {
    local pr_number="$1"
    domain="$pr_number.app-preview.towns.com"

    echo "Setting service $RENDER_SERVICE_ID domain to $domain"
    curl  \
        --url https://api.render.com/v1/services/$RENDER_SERVICE_ID/custom-domains \
        --header "Accept: application/json" \
        --header "Authorization: Bearer $RENDER_API_KEY" \
        --header "Content-Type: application/json" \
        --data '{"name":"'"$domain"'"}'
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

main
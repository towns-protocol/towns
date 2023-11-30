#!/usr/bin/env bash

# render.com does not make the PR number of the preview available, so
# we run this script to grap it from the slug. it's a hack but it works.
function get_pr_number_of_preview() {
    service_info_url="https://api.render.com/v1/services/$RENDER_SERVICE_ID"
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" --request GET \
                        --url "$service_info_url" \
                        --header 'accept: application/json' \
                        --header "Authorization: Bearer $RENDER_API_KEY")
    # Extract the body
    body=$(echo "$response" | sed -e 's/HTTPSTATUS\:.*//g')

    # Extract the status code
    status=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

    if [ "$status" -ne 200 ]; then
        echo "Error while getting the service info. [HTTP status: $status]"
        echo "$body"
        exit 1
    fi

    # grab the slug from the service info
    slug=$(echo $body | jq -r '.slug')

    # Split the string by '-' and get the last element
    last_element=$(echo $slug | awk -F"-" '{print $NF}')

    # Output the last element
    echo $last_element
}


if [ "$IS_PULL_REQUEST" = true ]; then
    if [ -z "$RENDER_API_KEY" ]; then
        echo "Must set RENDER_API_KEY environment variable!"
        exit 1
    fi

    if [ -z "PREVIEW_DOMAIN_SUFFIX" ]; then
        echo "Must set PREVIEW_DOMAIN_SUFFIX environment variable!"
        exit 1
    fi

    pr_number=$(get_pr_number_of_preview)
    domain="$pr_number.$PREVIEW_DOMAIN_SUFFIX"

    echo "Setting service $RENDER_SERVICE_ID domain to $domain"

    curl  \
        --url https://api.render.com/v1/services/$RENDER_SERVICE_ID/custom-domains \
        --header "Accept: application/json" \
        --header "Authorization: Bearer $RENDER_API_KEY" \
        --header "Content-Type: application/json" \
        --data '{"name":"'"$domain"'"}'

    river_node_url="https://river1-transient-${pr_number}.towns.com"
    
    echo "Setting VITE_CASABLANCA_HOMESERVER_URL to ${river_node_url}"

    curl  \
        --request PUT \
        --url https://api.render.com/v1/services/$RENDER_SERVICE_ID/env-vars \
        --header "accept: application/json" \
        --header "authorization: Bearer $RENDER_API_KEY" \
        --header "content-type: application/json" \
        --data '[{"key":"VITE_CASABLANCA_HOMESERVER_URL","value":"'"$river_node_url"'"}]'
        
else
    echo "Not a pull request. No custom domain needed."
fi
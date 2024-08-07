#!/usr/bin/env bash
set -eo pipefail

DEPLOYMENT_TIMEOUT=1200s # 20 minutes

function main() {
    check_env

    if ! ( timeout $DEPLOYMENT_TIMEOUT bash -c 'deploy_and_wait' ); then
        echo "Deployment failed to complete in time" >&2
        exit 1
    fi
}

function check_env() {
    if [ -z "$HARMONY_WEB_WEBHOOK_URL" ]; then
        echo "HARMONY_WEB_WEBHOOK_URL is not set" >&2
        exit 1
    fi

    if [ -z "$HARMONY_WEB_SERVICE_ID" ]; then
        echo "HARMONY_WEB_SERVICE_ID is not set" >&2
        exit 1
    fi

    if [ -z "$RENDER_BEARER_TOKEN" ]; then
        echo "RENDER_BEARER_TOKEN is not set" >&2
        exit 1
    fi
}

function deploy_harmony_web() {
    echo "Deploying harmony-web to Render" >&2

    render_response=$(curl $HARMONY_WEB_WEBHOOK_URL)

    deploy_id=$(echo $render_response | jq -r '.deploy.id')

    echo $deploy_id
}
# we need to "export -f" these functions to make them available to the `timeout` command
export -f deploy_harmony_web 

function get_deployment_status() {
    local deploy_id=$1
    echo "Getting deployment status for harmony-web" >&2

    status_url="https://api.render.com/v1/services/$HARMONY_WEB_SERVICE_ID/deploys/$deploy_id"

    render_response=$(curl --request GET \
        --url $status_url \
        --header "accept: application/json" \
        --header "authorization: Bearer $RENDER_BEARER_TOKEN" \
    )

    deploy_status=$(echo $render_response | jq -r '.status')

    echo "Deployment status: $deploy_status" >&2

    echo $deploy_status
}
# we need to "export -f" these functions to make them available to the `timeout` command
export -f get_deployment_status 

function deploy_and_wait() {
    deploy_id=$(deploy_harmony_web)
    echo "Deploy ID: $deploy_id" >&2

    while true; do
        status=$(get_deployment_status $deploy_id)
        if [ "$status" != "build_in_progress" ]; then
            break
        fi
        sleep 10
    done

    while true; do
        status=$(get_deployment_status $deploy_id)
        if [ "$status" != "update_in_progress" ]; then
            break
        fi
        sleep 10
    done

    if [ "$status" == "canceled" ]; then
        echo "Deployment was canceled." >&2
        exit 0
    elif [ "$status" == "live" ]; then
        echo "Deployment was successful." >&2
        exit 0
    else
        echo "Deployment failed." >&2
        exit 1
    fi
}
# we need to "export -f" these functions to make them available to the `timeout` command
export -f deploy_and_wait

main
#!/bin/bash
set -eo pipefail

TTL=60

function check_env() {
    # check for CLUSTER_NAME
    if [ -z "$CLUSTER_NAME" ]; then
        echo "CLUSTER_NAME is not set"
        exit 1
    fi

    # check for CLOUDFLARE_ZONE_ID
    if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
        echo "CLOUDFLARE_ZONE_ID is not set"
        exit 1
    fi

    # check for CLOUDFLARE_API_TOKEN
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        echo "CLOUDFLARE_API_TOKEN is not set"
        exit 1
    fi

    # check for NODE_NAME
    if [ -z "$NODE_NAME" ]; then
        echo "NODE_NAME is not set"
        exit 1
    fi

    # check for AWS_REGION
    if [ -z "$AWS_REGION" ]; then
        echo "AWS_REGION is not set"
        exit 1
    fi
}

function check_deps() {
    # Check for jq
    if ! [ -x "$(command -v jq)" ]; then
        echo "Error: jq is not installed." >&2
        exit 1
    fi

    # Check for aws
    if ! [ -x "$(command -v aws)" ]; then
        echo "Error: aws is not installed." >&2
        exit 1
    fi

    if ! [ -x "$(command -v curl)" ]; then
        echo "Error: curl is not installed." >&2
        exit 1
    fi
}

function get_own_task_id() {
    TASK_ID=$(curl -s 169.254.170.2/v2/metadata | jq -r '.TaskARN')

    # Echo the Task ID
    echo $TASK_ID
}

function get_public_ip_of_ecs_task() {
    local task_id=$1

    # Fetch the network interface ID of the ECS task
    NETWORK_INTERFACE_ID=$(aws ecs describe-tasks \
        --cluster "${CLUSTER_NAME}" \
        --tasks $task_id | \
        jq -r '.tasks[0].attachments[0].details[] | select(.name == "networkInterfaceId") | .value')

    # Fetch the public IP using the network interface ID
    PUBLIC_IP=$(aws ec2 describe-network-interfaces \
        --network-interface-ids $NETWORK_INTERFACE_ID | \
        jq -r '.NetworkInterfaces[0].Association.PublicIp')

    # Echo the public IP
    echo $PUBLIC_IP
}

# Function to get the cloudflare record ID
function get_record_id() {
    # Fetch the DNS records and find the record ID
    RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=$NODE_NAME.towns.com" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" | jq -r ".result[0].id")

    echo $RECORD_ID
}

# Function to update a DNS record
function update_dns_record() {
    local public_ip=$1
    local record_id=$2

    # Updating DNS record
    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$record_id" \
        -H "X-Auth-Email: kerem@hntlabs.com" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
       --data "{\"type\":\"A\",\"name\":\"$NODE_NAME\",\"content\":\"$public_ip\",\"proxied\":false, \"ttl\":$TTL}"
}

function main() {
    my_task_id=$(get_own_task_id)
    public_ip=$(get_public_ip_of_ecs_task $my_task_id)
    record_id=$(get_record_id)
    echo "Record ID: $record_id"
    if [ "$record_id" == "null" ]; then
        echo "Record does not exist, even thought terraform should have created it."
        exit 1
    else
        echo "Found record. Updating."
        update_dns_record $public_ip $record_id
    fi
}

check_deps
check_env
main
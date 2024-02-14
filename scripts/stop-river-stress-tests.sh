#!/bin/bash
set -eo pipefail

function check_env() {
    if [ -z "$ENVIRONMENT_NAME" ]; then
        echo "ENVIRONMENT_NAME is not set. Exiting."
        exit 1
    fi
}

function get_ecs_cluster_arn() {
    local cluster_name=$1
    local cluster_arn=$(aws ecs list-clusters | jq -r ".clusterArns[] | select(. | contains(\"$cluster_name\"))")
    echo $cluster_arn
}

function stop_service() {
    local service_name=$1
    local cluster_arn=$2
    echo "stopping service: $service_name"
    aws ecs update-service --service $service_name --cluster $cluster_arn --desired-count 0 > /dev/null
    echo "stopped service: $service_name"
}

function stop_all_services() {
    local cluster_arn=$1
    local services=$(aws ecs list-services --cluster $cluster_arn | jq -r '.serviceArns[]')
    echo "stopping all services in cluster: $cluster_arn"
    for service in $services; do
        local service_name=$(echo $service | awk -F/ '{print $3}')
        stop_service $service_name $cluster_arn &
    done
    echo "stopped all services in cluster: $cluster_arn"

    for task in $(aws ecs list-tasks --cluster $cluster_arn | jq -r '.taskArns[]'); do
        aws ecs stop-task --cluster $cluster_arn --task $task > /dev/null
    done
    echo "stopped all tasks in cluster: $cluster_arn"
}

function main() {
    local cluster_name="loadtest-cluster-${ENVIRONMENT_NAME}"
    echo "cluster name: $cluster_name"

    local cluster_arn=$(get_ecs_cluster_arn $cluster_name)

    if [ -z "$cluster_arn" ]; then
        echo "cluster not found: $cluster_name"
        exit 1
    fi

    stop_all_services $cluster_arn
}

check_env
main
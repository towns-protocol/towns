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

function leader_task_exist() {
    local cluster_name="loadtest-cluster-${ENVIRONMENT_NAME}"
    local service_name="loadtest-leader-${ENVIRONMENT_NAME}-service"
    echo "logic to check if leader task is up and running"
    leader_task_arns=$(aws ecs list-tasks --cluster $cluster_name --service-name $service_name --query 'taskArns' --output text)
    leader_status=$(aws ecs describe-tasks --cluster $cluster_name --tasks $leader_task_arns --query 'tasks[0].lastStatus' --output text)
    echo $leader_status
    if [[ "$leader_status" == "RUNNING" ]]; then
        echo "leader task up and running"
        return 1    #return false to exit
    else
        echo "leader task not up and running"
        return 0    #return true to wait more
    fi
}

function start_service() {
    local service_name=$1
    local cluster_arn=$2
    echo "starting service: $service_name"
    aws ecs update-service --service $service_name --cluster $cluster_arn --desired-count 1 > /dev/null
    echo "started service: $service_name"
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

function start_load_test() {
    # 5 minutes
    local hacky_wait_time=300
    local cluster_name="loadtest-cluster-${ENVIRONMENT_NAME}"
    local leader_task_def="loadtest-leader-${ENVIRONMENT_NAME}-fargate"

    #get the total number of follower from leader task def env variables
    leader_task_def_arn=$(aws ecs list-task-definitions --family-prefix $leader_task_def --status ACTIVE --output text | awk '{print $2}')
    num_follower_containers=$(aws ecs describe-task-definition --task-definition $leader_task_def_arn | jq -r '.taskDefinition.containerDefinitions[].environment[] | select(.name == "NUM_FOLLOWER_CONTAINERS").value')

    # starting leader service
    start_service "loadtest-leader-${ENVIRONMENT_NAME}-service" $cluster_name

    echo "waiting for 5 minutes before starting the followers"
    sleep $hacky_wait_time

    #Logic to wait for leader task up and running

    echo "starting the follower services"

    #Starting the follower services
    for i in $(seq 1 $num_follower_containers); do
        start_service "loadtest-follower-${i}-${ENVIRONMENT_NAME}-service" $cluster_name
    done

    echo "load test started"
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
    start_load_test
}

check_env
main

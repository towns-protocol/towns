#!/bin/bash
set -eo pipefail

function check_env() {
    if [ -z "$ENVIRONMENT_NAME" ]; then
        echo "ENVIRONMENT_NAME is not set. Exiting."
        exit 1
    fi

    if [ -z "$CONTAINER_COUNT" ]; then
        echo "CONTAINER_COUNT is not set. Exiting."
        exit 1
    fi

    if [ -z "$CLIENTS_COUNT" ]; then
        echo "CLIENTS_COUNT is not set. Exiting."
        exit 1
    fi

    if [ -z "$PROCESSES_PER_CONTAINER" ]; then
        echo "PROCESSES_PER_CONTAINER is not set. Exiting."
        exit 1
    fi

    if [ -z "$STRESS_DURATION" ]; then
        echo "STRESS_DURATION is not set. Exiting."
        exit 1
    fi
}

function get_ecs_cluster_arn() {
    local cluster_name=$1
    local cluster_arn=$(aws ecs list-clusters | jq -r ".clusterArns[] | select(. | contains(\"$cluster_name\"))")
    echo $cluster_arn
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

function set_system_parameters() {
    set_session_id
    set_clients_count
    set_container_count
    set_processes_per_container
    set_stress_duration
}

function set_stress_duration() {
    local ssm_parameter_store_name="stress-test-stress-duration-${ENVIRONMENT_NAME}"

    # store the stress duration in the SSM parameter store
    aws ssm put-parameter --name $ssm_parameter_store_name --value $STRESS_DURATION --type String --overwrite
}

function set_processes_per_container() {
    local ssm_parameter_store_name="stress-test-processes-per-container-${ENVIRONMENT_NAME}"

    # store the processes per container in the SSM parameter store
    aws ssm put-parameter --name $ssm_parameter_store_name --value $PROCESSES_PER_CONTAINER --type String --overwrite
}

function set_clients_count() {
    local ssm_parameter_store_name="stress-test-clients-count-${ENVIRONMENT_NAME}"

    # store the client count in the SSM parameter store
    aws ssm put-parameter --name $ssm_parameter_store_name --value $CLIENTS_COUNT --type String --overwrite
}

function set_container_count() {
    local ssm_parameter_store_name="stress-test-container-count-${ENVIRONMENT_NAME}"

    # store the container count in the SSM parameter store
    aws ssm put-parameter --name $ssm_parameter_store_name --value $CONTAINER_COUNT --type String --overwrite
}

function set_session_id() {
    local ssm_parameter_store_name="stress-test-session-id-${ENVIRONMENT_NAME}"

    # create a session_id variable by putting today's date and time in the format of YYYY-MM-DD-HH:MM:SS
    local sesion_id=$(date +"%Y-%m-%d-%H:%M:%S")

    echo "session_id: $sesion_id"

    # store the session_id in the SSM parameter store
    aws ssm put-parameter --name $ssm_parameter_store_name --value $sesion_id --type String --overwrite
}

function start_via_services() {
    local loop_end=$(expr $CONTAINER_COUNT - 1)

    #Starting the stress test nodes by updating the service desired count
    for i in $(seq 0 $loop_end); do
        start_service "stress-test-node-${ENVIRONMENT_NAME}-${i}-service" $cluster_name
    done
}

function start_via_tasks() {
    local loop_end=$(expr $CONTAINER_COUNT - 1)

    #Starting the stress test nodes by running the task directly
    for i in $(seq 0 $loop_end); do
        task_def_family="stress-test-node-${ENVIRONMENT_NAME}-${i}-fargate"

        # get the task definition arn
        task_def_arn=$(aws ecs list-task-definitions --family-prefix $task_def_family --status ACTIVE --output text | awk '{print $2}')

        # run the task
        aws ecs run-task --cluster $cluster_name --task-definition $task_def_arn > /dev/null
    done

}

function start_stress_test() {
    local cluster_name="stress-test-cluster-${ENVIRONMENT_NAME}"
    local reference_task_def="stress-test-node-gamma-0-fargate"

    #get the total number of containers from the env vars of the reference task definition
    reference_task_def_arn=$(aws ecs list-task-definitions --family-prefix $reference_task_def --status ACTIVE --output text | awk '{print $2}')

    echo "starting stress test nodes with ${CONTAINER_COUNT} containers"

    # start_via_tasks
    start_via_services

    echo "stress tests started"
}

function main() {
    local cluster_name="stress-test-cluster-${ENVIRONMENT_NAME}"
    echo "cluster name: $cluster_name"

    local cluster_arn=$(get_ecs_cluster_arn $cluster_name)

    if [ -z "$cluster_arn" ]; then
        echo "cluster not found: $cluster_name"
        exit 1
    fi

    set_system_parameters
    stop_all_services $cluster_arn
    start_stress_test
}

check_env
main

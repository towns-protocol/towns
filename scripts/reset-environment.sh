#!/usr/bin/env bash

# If any command fails, stop executing this script and return its exit code
set -eo pipefail

LATEST_DEV_TOWN_WORKER_PATH="servers/workers/latest-dev-town-worker"

function reset_latest_dev_town_invite_url() {
    if [ "$CREATE_NEW_DEV_TOWN" == "true" ]; then
        # Remove the previous the latest dev town url
        echo "Removing the previous dev town url ..."

        pushd $LATEST_DEV_TOWN_WORKER_PATH
            # If the next line fails, don't quit.
            # We do this, because if the secret was not
            # properly re-set last time, it won't exist,
            # and the next time we try to delete it, it
            # will fail.
            set +e

            echo "yes" | yarn delete-latest-devtown-url:${CLOUDFLARE_ENVIRONMENT}
            # TODO: consolidate environment names: https://linear.app/hnt-labs/issue/HNT-3252/unify-environment-names-between-terraform-and-cloudflare

            # Setting it back to quit on error
            set -eo pipefail
        popd
    else
        echo "Not creating a new dev town."
    fi
}

function reset_db() {
    # Check for env var named $RESET_DB, and skip
    # the database reset if it is not set to "true"
    if [ "$RESET_DB" == "true" ]; then
        if [ -z "$DB_URL" ]; then
            echo "DB_URL is not set"
            exit 1
        fi

        echo "Resetting the database ..."

        # We drop the database and recreate it
        psql $DB_URL -c "DROP DATABASE river WITH (FORCE);"
        psql $DB_URL -c "CREATE DATABASE river;"
    else 
        echo "Skipping database reset"
    fi
}

function reset_ecs_containers() {
    # if not restting the db, we don't need to reset
    # the ECS containers
    if [ "$RESET_DB" != "true" ]; then
        echo "Skipping ECS container reset"
        return
    fi

    if [ -z "$CLUSTER_NAME" ]; then
        echo "CLUSTER_NAME is not set"
        exit 1
    fi

    if [ -z "$ENVIRONMENT" ]; then
        echo "ENVIRONMENT is not set"
        exit 1
    fi

    if [ -z "$RIVER_NODE_NAME" ]; then
        echo "RIVER_NODE_NAME is not set"
        exit 1
    fi

    SERVICE_NAME="${ENVIRONMENT}-river-${RIVER_NODE_NAME}-fargate-service"

    echo "Service name: $SERVICE_NAME"

    # We just signal the ECS tasks to stop, which will trigger the ECS service to restart them
    echo "Resetting the ECS cluster $CLUSTER_NAME ..."
    for task in $(aws ecs list-tasks --cluster $CLUSTER_NAME --query "taskArns[]" --output text); do
        # stop all the tasks
        echo "Stopping task $task ..."
        aws ecs stop-task --cluster $CLUSTER_NAME --task $task
    done

    # Wait for all the tasks to stop
    echo "Waiting for the ECS tasks to stop ..."
    for task in $(aws ecs list-tasks --cluster $CLUSTER_NAME --query "taskArns[]" --output text); do
        # wait for all the tasks to stop
        echo "Waiting for task $task to stop ..."
        aws ecs wait tasks-stopped --cluster $CLUSTER_NAME --tasks $task
    done

    # Wait for all the tasks to start again
    echo "Waiting for the ECS tasks to start ..."

    while :; do
        # Fetch the desired task count of the service
        DESIRED_COUNT=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query "services[0].desiredCount" --output text)

        echo "Desired count: $DESIRED_COUNT"

        # Fetch the count of the running tasks of the service
        RUNNING_TASKS_COUNT=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --query "taskArns" --output text | wc -w)

        echo "Running tasks count: $RUNNING_TASKS_COUNT"

        # Check if the desired count matches the running task count
        if [ "$DESIRED_COUNT" -eq "$RUNNING_TASKS_COUNT" ]; then
            echo "All tasks are running."
            break
        else
            echo "Not all tasks are running. Desired: $DESIRED_COUNT, Running: $RUNNING_TASKS_COUNT"
            sleep 10
        fi
    done
}

function wait_for_river_to_stop() {
    # if not restting the db, we don't need to wait 
    if [ "$RESET_DB" != "true" ]; then
        return
    fi

    set +e
    # Wait for the river to stop

    echo "Waiting for river to stop ..."
    URL="${CASABLANCA_SERVER_URL}/info"
    while true; do
         # Use curl to fetch the HTTP header & get the HTTP response code
        RESPONSE=$(curl -f -o /dev/null -s -w "%{http_code}" $URL)
        # Get the exit code of curl
        CURL_EXIT_CODE=$?

        if [ $CURL_EXIT_CODE -eq 0 ]; then
            if [ "$RESPONSE" -eq "200" ]; then
                echo "Website $URL is still up. Waiting..."
            else
                echo "Website $URL returned HTTP code: $RESPONSE"
                break;
            fi
        else
            echo "Website $URL is down. curl exit code: $CURL_EXIT_CODE"
            break;
        fi

        # Wait for 10 seconds before the next check
        sleep 10
    done
    echo "River is down! Continuing..."

    set -eo pipefail
}

function wait_for_river_to_start() {
    # if not restting the db, we don't need to wait 
    if [ "$RESET_DB" != "true" ]; then
        return
    fi

    set +e

    # Wait for the river to start
    echo "Waiting for river to start ..."
    URL="${CASABLANCA_SERVER_URL}/info"
    while true; do
        # Use curl to fetch the HTTP header & get the HTTP response code
        RESPONSE=$(curl -f -o /dev/null -s -w "%{http_code}" $URL)
        # Get the exit code of curl
        CURL_EXIT_CODE=$?

        if [ $CURL_EXIT_CODE -eq 0 ]; then
            if [ "$RESPONSE" -eq "200" ]; then
                echo "Website $URL is up!"
                break;
            else
                echo "Website $URL returned HTTP code: $RESPONSE"
            fi
        else
            echo "Website $URL is down. curl exit code: $CURL_EXIT_CODE"
        fi

        # Wait for 10 seconds before the next check
        sleep 10
    done
    echo "River is up!"
    set -eo pipefail
}

function create_new_dev_town() {
    if [ "$CREATE_NEW_DEV_TOWN" == "true" ]; then
        # Create the new dev town
        echo "Creating the new dev town ..."
        pushd ./clients/web/lib
            yarn create-dev-town

            # Read the new town invite link from ./inviteLink.txt
            echo "Reading the latest dev town name ..."
            export LATEST_DEV_TOWN_INVITE_URL=$(cat ./inviteLink.txt)
        popd

        # Set the latest dev town url
        echo "Setting the latest dev town url ..."
        pushd $LATEST_DEV_TOWN_WORKER_PATH

            if [ -z "$LATEST_DEV_TOWN_INVITE_URL" ]; then
                echo "LATEST_DEV_TOWN_INVITE_URL is not set"
                exit 1
            else
                echo "LATEST_DEV_TOWN_INVITE_URL: $LATEST_DEV_TOWN_INVITE_URL"
            fi

            # Resetting the latest dev town url
            yarn set-latest-devtown-url:${CLOUDFLARE_ENVIRONMENT}
            # TODO: consolidate environment names: https://linear.app/hnt-labs/issue/HNT-3252/unify-environment-names-between-terraform-and-cloudflare
        popd
    fi
}

reset_latest_dev_town_invite_url
reset_db
reset_ecs_containers
wait_for_river_to_stop
wait_for_river_to_start
create_new_dev_town

echo "Done"

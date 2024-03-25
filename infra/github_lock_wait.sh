#!/bin/bash
function check_lock {
    TABLE_NAME=$1
    LOCK_ID=$2
    echo "logic for checking the lock"
    #metadata should be null if there is no lock occured on dynamodb
    lock_metadata=$(aws dynamodb get-item --table-name $TABLE_NAME --key "{\"LockID\":{\"S\":\"$LOCK_ID\"}}" | jq -r '.Item.LockID.S')
    echo $lock_metadata
    if [[ -z "$lock_metadata" || "$lock_metadata" == "null" ]]; then
        echo "unlocked state"
        return 1    #false  #unlocked state
    else
        echo "locked state"
        return 0    #true   #locked state
    fi
}

function github_lock_wait {
    TABLE_NAME=$1
    LOCK_ID=$2
    TIMEOUT=$3
    # Wait for the github wrokflow lock to be released
    start_time=$(date +%s)
    while check_lock $TABLE_NAME $LOCK_ID; do
        current_time=$(date +%s)
        elapsed_time=$((current_time - start_time))
        echo "Waiting for the lock to be released..."
        sleep 10  # Adjust the sleep duration based on your needs
        if [ $elapsed_time -ge $TIMEOUT ]; then
            echo "Timeout reached. Exiting script."
            exit 1
        fi
    done
    echo "terraform locked is free and Available"
}
#======Main Body=====#
ACTION_TYPE=$1
if [ -z "$ENV" ]; then
    echo "Must set ENV environment variable!"
    exit 1
fi
# If its running via CLI when git_pr_number provided
if [ ! -z "$GIT_PR_NUMBER" ]; then
    ENV=$ENV-$GIT_PR_NUMBER
fi

echo $ENV

# Logic to add a centralize flag using dynamodb
TABLE_NAME="here-not-there-terraform-state-lock"
GITHUB_LOCK_ID=$ENV-provision-lock-flag
TIMEOUT=1800 #30 min max timeout
github_lock_wait $TABLE_NAME $GITHUB_LOCK_ID $TIMEOUT

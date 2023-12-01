#!/bin/bash
if [ -z "$ENV" ]; then
    echo "Must set ENV environment variable!"
    exit 1
fi

DYNAMODB_TABLE_NAME="here-not-there-terraform-state-lock"
LOCK_ID="here-not-there-terraform-state/env:/$ENV/default"
TIMEOUT=1800 #30 min max timeout
function check_lock {
    echo "logic for checking the lock"
    #metadata should be null if there is no lock occured on dynamodb
    lock_metadata=$(aws dynamodb get-item --table-name $DYNAMODB_TABLE_NAME --key "{\"LockID\":{\"S\":\"$LOCK_ID\"}}" | jq -r .[].Info)
    echo $lock_metadata
    if [[ -z "$lock_metadata" || "$lock_metadata" == "null" ]]; then
        echo "unlocked state"
        return 1    #false  #unlocked state
    else
        echo "locked state"
        return 0    #true   #locked state
    fi

}

# Wait for the lock to be released
start_time=$(date +%s)
while check_lock; do
    current_time=$(date +%s)
    elapsed_time=$((current_time - start_time))
    echo "Waiting for the lock to be released..."
    sleep 10  # Adjust the sleep duration based on your needs
    if [ $elapsed_time -ge $TIMEOUT ]; then
        echo "Timeout reached. Exiting script."
        exit 1
    fi
done

echo "Available backend locked state"

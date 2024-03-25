#!/bin/bash
function set_dynamodb_lock {
    TABLE_NAME=$1
    LOCK_ID=$2
    DATA='{"LockID": {"S": "'$LOCK_ID'"}}'
    # Checking if flag already set
    response=$(aws dynamodb get-item --table-name $TABLE_NAME --key "{\"LockID\":{\"S\":\"$LOCK_ID\"}}" | jq -r '.Item.LockID.S')
    echo "Checking for Provision flag if already present"
    if [[ -z $response && $response == $LOCK_ID ]]; then
        echo "Provision lock is already set"
    else
        echo "Not present so setting the Provision lock for github workflow"
        aws dynamodb put-item --table-name $TABLE_NAME --item "$DATA"
    fi
}

function clear_dynamodb_lock {
    TABLE_NAME=$1
    LOCK_ID=$2
    DATA='{"LockID": {"S": "'$LOCK_ID'"}}'
    response=$(aws dynamodb get-item --table-name $TABLE_NAME --key "{\"LockID\":{\"S\":\"$LOCK_ID\"}}" | jq -r '.Item.LockID.S')
    if [[ ! -z $response && $response == $LOCK_ID ]]; then
        echo "Provision lock is present so deleting it"
        aws dynamodb delete-item --table-name $TABLE_NAME --key "$DATA"
    else
        echo "Provision lock is alredy cleared"
    fi
}


#======Main Body=====#
ACTION_TYPE=$1
if [ -z "$ENV" ]; then
    echo "Must set ENV environment variable!"
    exit 1
fi
# If its running via CLI when git_pr_number provided
if [ ! -z "$GIT_PR_NUMBER" ]; then
    FULL_ENV=$ENV-$GIT_PR_NUMBER
else
    FULL_ENV=$ENV
fi

echo $FULL_ENV

TABLE_NAME="here-not-there-terraform-state-lock"
LOCK_ID=$FULL_ENV-provision-lock-flag
DATA='{"LockID": {"S": "'$LOCK_ID'"}}'

case $ACTION_TYPE in
    "add_lock")
        set_dynamodb_lock $TABLE_NAME $LOCK_ID $DATA
        ;;
    "clear_lock")
        clear_dynamodb_lock $TABLE_NAME $LOCK_ID $DATA
        ;;
    *)
        echo "Unknown Action passed"
        ;;
esac


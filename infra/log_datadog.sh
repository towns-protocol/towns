#!/bin/bash
set -eo pipefail

function check_env()
{
    if [ -z "$ENV" ]; then
        echo "Must set ENV environment variable!"
        exit 1
    fi
    if [ -z "$TF_VAR_datadog_api_key" ]; then
        echo "DATADOG_API_KEY is not set"
        exit 1
    fi
}
function determine_runtype()
{
    if [ -z "$CI_AUTOAPPROVE" ]; then
        RUN_TYPE=Local
    elif [ "$CI_AUTOAPPROVE" = true ] || [ "$CI_AUTOAPPROVE" = "-auto-approve" ] ; then
        RUN_TYPE=CI
    else
        RUN_TYPE=Local
    fi
    echo $RUN_TYPE
}
function sendto_datadog()
{
    RUN_TYPE=$1
    LOG_MESSAGE=$2
    TF_STATUS=$3
    JSON_PAYLOAD="{\"ddsource\": \"log_datadog\", \"hostname\": \"$ENV\" , \"service\": \"terraform\", \"status\": \"$TF_STATUS\", \"ddtags\": \"environment:$ENV, run_type:$RUN_TYPE, tf_run_type:$TF_ACTION_TYPE\", \"message\": \"$LOG_MESSAGE\"}"
    DATADOG_URL="https://http-intake.logs.datadoghq.com/v1/input"
    echo "Sending metrics to Datadog"
    RESPONSE_CODE=$(curl -o /dev/null -sw '%{http_code}' -X POST -H "Content-type: application/json" -H "DD-API-KEY: $TF_VAR_datadog_api_key" -d "$JSON_PAYLOAD" "$DATADOG_URL")
    if [ "$RESPONSE_CODE" -ne 200 ]; then
        echo "DataDog request failed with response code: $RESPONSE_CODE"
        exit 1
    fi
    echo "Metrics sent to Datadog"
}

#======Main Body======
check_env
# If its running via CLI when git_pr_number provided
if [ ! -z "$TF_VAR_git_pr_number" ]; then
    ENV=$ENV-$TF_VAR_git_pr_number
fi
current_date_time=$(date "+%Y-%m-%d %H:%M:%S")
log_message="$LOG_MESSAGE: $current_date_time"
run_type=$(determine_runtype)
status="${TF_STATUS:-info}"
sendto_datadog "$run_type" "$log_message" "$status"

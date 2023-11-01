#!/usr/bin/env bash

# If any command fails, stop executing this script and return its exit code
set -eo pipefail

LOAD_TEST_PATH="./clients/web/lib"

# exit if DATADOG_API_KEY is not set
if [ -z "$DATADOG_API_KEY" ]; then
    echo "DATADOG_API_KEY is not set"
    exit 1
fi

pushd $LOAD_TEST_PATH
    yarn run test:load:all

    METRICS_FILE_PATH="loadtestMetrics.json"

    if [ ! -f "$METRICS_FILE_PATH" ]; then
        echo "Metrics file not found"
        exit 1
    fi

    PAYLOAD=$(cat $METRICS_FILE_PATH)
    echo "Metrics payload found: $PAYLOAD"

    DATADOG_URL="https://api.datadoghq.com/api/v1/series?api_key=$DATADOG_API_KEY"

    echo "Sending metrics to Datadog"

    RESPONSE_CODE=$(curl -o /dev/null -sw '%{http_code}' -X POST -H "Content-type: application/json" -d "$PAYLOAD" "$DATADOG_URL")

    if [ "$RESPONSE_CODE" -ne 202 ]; then
        echo "DataDog request failed with response code: $RESPONSE_CODE"
        exit 1
    fi

    echo "Metrics sent to Datadog"
popd
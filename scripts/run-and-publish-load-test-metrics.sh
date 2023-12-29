#!/usr/bin/env bash


if [ -z "$LOAD_TEST_PATH" ]; then
    echo "LOAD_TEST_PATH is not set"
    exit 1
fi

if [ -z "$TEST_CMD" ]; then
    echo "TEST_CMD is not set"
    exit 1
fi

# exit if DATADOG_API_KEY is not set
if [ -z "$DATADOG_API_KEY" ]; then
    echo "DATADOG_API_KEY is not set"
    exit 1
fi

pushd $LOAD_TEST_PATH
    eval $TEST_CMD
    
    # Save the exit code of the test, so we can exit with it at the end,
    # but still post load test durations if available
    
    LOAD_TEST_EXIT_CODE=$?  

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

exit $LOAD_TEST_EXIT_CODE

#!/bin/bash

PROXY_URL="http://localhost:43370"
PM_URL="http://localhost:43371"

while true; do
    # Check Bundler HTTP server is ready.
    BUNDLER_REQ='{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_supportedEntryPoints",
        "params": []
    }'
    BUNDLER_RESP=$(curl -s -X POST -H "Content-Type: application/json" --data "$BUNDLER_REQ" "$PROXY_URL")
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to make bundler request. Checking again soon..."
        sleep 3
        continue
    elif ! echo $BUNDLER_RESP | jq . > /dev/null 2>&1; then
        echo "Error: Bundler response is not valid JSON. Checking again soon..."
        sleep 3
        continue
    fi
    
    # Check if 'result' exists in the response and is not null
    if ! echo "$BUNDLER_RESP" | jq -e '.result' > /dev/null 2>&1 || [ "$(echo "$BUNDLER_RESP" | jq 'if .result == null then "null" else "not_null" end')" = "\"null\"" ]; then
        echo "Bundler not ready: No supported entry points found. Checking again soon..."
        sleep 3
        continue
    fi
    
    # Check if 'result' is an array and has elements
    if [ "$(echo "$BUNDLER_RESP" | jq 'if (.result | type) == "array" and (.result | length) > 0 then "true" else "false" end')" != "\"true\"" ]; then
        echo "Bundler not ready: No entry points in array. Checking again soon..."
        sleep 3
        continue
    fi
    
    echo "Bundler is ready"
    READY=true

    # Check all supported EntryPoint contracts are deployed.
    SUPPORTED_ENTRYPOINTS=()
    while IFS= read -r line; do
        SUPPORTED_ENTRYPOINTS+=("$line")
    done < <(echo "$BUNDLER_RESP" | jq -r '.result[]')
    
    for ENTRYPOINT in "${SUPPORTED_ENTRYPOINTS[@]}"; do
        NODE_REQ="{
            \"jsonrpc\": \"2.0\",
            \"id\": 1,
            \"method\": \"eth_getCode\",
            \"params\": [\"$ENTRYPOINT\", \"latest\"]
        }"
        NODE_RESP=$(curl -s -X POST -H "Content-Type: application/json" --data "$NODE_REQ" "$PROXY_URL")
        
        if [ $? -ne 0 ]; then
            echo "Error: Failed to make node request. Checking again soon..."
            READY=false
            break
        fi

        CODE_HEX=$(echo "$NODE_RESP" | jq -r '.result')
        if [ "$CODE_HEX" == "0x" ]; then
            echo "ERC-4337 Devnet EntryPoint not yet deployed. Checking again soon..."
            READY=false
            break
        fi
    done
    
    # Only check paymaster if EntryPoints are deployed
    if [ "$READY" == "true" ]; then
        PM_RESP=$(curl -s -X GET "$PM_URL/ping")
        if [ $? -ne 0 ]; then
            echo "Error: Failed to make paymaster request. Checking again soon..."
            READY=false
        elif ! echo "$PM_RESP" | jq -e '.message == "pong"' > /dev/null 2>&1; then
            echo "Error: Unexpected paymaster response."
            exit 1
        fi
    fi

    # Check if devnet is ready.
    if [ "$READY" == "true" ]; then
        echo "ERC-4337 Devnet is ready."
        exit 0
    fi
    
    sleep 3
done
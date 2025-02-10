#!/bin/bash

# Initialize variables
start=0
page_size=5000
is_last_page=false

while [ "$is_last_page" = false ]; do
    echo "Fetching streams from $start to $((start + page_size))"
    
    # Make the cast call
    result=$(cast call $RIVER_REGISTRY_CONTRACT \
        "getPaginatedStreams(uint256,uint256)((bytes32,(bytes32,uint64,uint64,uint64,address[]))[],bool)" \
        $start $((start + page_size)) \
        --rpc-url $RIVER_RPC_URL)
    
    # Print the result
    # echo "$result"
    
    # Extract is_last_page value from the last line of the result
    is_last_page=$(echo "$result" | tail -n 1)
    
    # Move to next page
    start=$((start + page_size))
    
    # Add a 100ms delay between calls
    sleep 0.1
    
    # Break if we just processed the last page
    if [ "$is_last_page" = true ]; then
        echo "Reached last page. Exiting..."
        break
    fi
done
#!/bin/bash

# Check if input file is provided
if [ -z "$1" ]; then
    echo "Usage: ./verify_facets.sh <path_to_source_diff_yaml>"
    exit 1
fi

SOURCE_DIFF_YAML=$1
BASESCAN_SEPOLIA_URL=${BASESCAN_SEPOLIA_URL:-'https://api-sepolia.basescan.org/api'}
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY:-'your_api_key_here'}
echo "Source diff yaml: ${SOURCE_DIFF_YAML}"

# Read the updated facets from the YAML file and verify each one
yq e '.updated[].facets[]' "${SOURCE_DIFF_YAML}" | while read -r facet; do
    FACET_NAME=$(echo "$facet" | yq e '.facetName' -)
    DEPLOYED_ADDRESS=$(echo "$facet" | yq e '.deployedAddress' -)
    
    echo "Verifying $FACET_NAME at $DEPLOYED_ADDRESS"
    
    make verify-on-etherscan \
        etherscan_url="${BASESCAN_SEPOLIA_URL}" \
        address="${DEPLOYED_ADDRESS}" \
        contract="${FACET_NAME}"
done 

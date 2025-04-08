#!/bin/bash
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

# Function to find the most recent file
find_most_recent_file() {
    local dir="$1"
    find "$dir" -name "facet_diff_*.yaml" | sort -r | head -n 1
}

# Check if the correct number of arguments is provided
if [ $# -lt 1 ] || [ $# -gt 3 ]; then
    echo "Usage: $0 <network> [diff_directory] [file_name]"
    echo "  <network>: Must be either 'gamma' or 'omega'"
    exit 1
fi

# Set the network and validate it
network="$1"
if [ "$network" != "gamma" ] && [ "$network" != "omega" ]; then
    echo "Error: Network must be either 'gamma' or 'omega'"
    exit 1
fi

# Set default values and parse additional arguments
diff_dir="deployed-diffs"
file_name=""

if [ $# -eq 2 ]; then
    diff_dir="$2"
elif [ $# -eq 3 ]; then
    diff_dir="$2"
    file_name="$3"
fi

# If file_name is not provided, find the most recent file
if [ -z "$file_name" ]; then
    most_recent_file=$(find_most_recent_file "$diff_dir")
    if [ -n "$most_recent_file" ]; then
        file_name=$(basename "$most_recent_file")
        echo "Using most recent file: $file_name"
    else
        echo "No matching files found in $diff_dir"
        exit 1
    fi
fi

# Function to process a single YAML file
process_file() {
    local file="$1"
    echo "Processing file: $file"

    # Extract sourceContractNames into an array, strip "Facet" suffix, and remove duplicates
    contract_names=($(yq e '.diamonds[].facets[].sourceContractName' "$file" | sed 's/Facet$//' | sort -u))

    # Determine which make command to use
    if [[ "$network" == "omega" ]]; then
        chain_id=8453
        context="omega"
        make_command="make deploy-any rpc=base private_key=${OMEGA_PRIVATE_KEY}"
        resume_any="make resume-any rpc=base private_key=${OMEGA_PRIVATE_KEY} verifier=${BASESCAN_URL} etherscan=${BASESCAN_API_KEY}"
    elif [[ "$network" == "gamma" ]]; then
        chain_id=84532
        context="gamma"
        make_command="make deploy-base-sepolia"
    else
        echo "Error: Unknown file type $file. Cannot determine chain ID and context."
        exit 1
    fi

    # Loop through each contract name and call the appropriate make command
    if [ ${#contract_names[@]} -eq 0 ]; then
        echo "No contracts to deploy."
        exit 0
    else
        current_dir=$(pwd)
        cd ../../contracts
        for contract in "${contract_names[@]}"; do
            deploy_file=$(find ./scripts -name "Deploy${contract}.s.sol" -o -name "Deploy${contract}Facet.s.sol" | head -n1)
            
            if [ -n "$deploy_file" ]; then
                deploy_contract=$(basename "$deploy_file" .s.sol)
                echo "Deploying contract: $contract using $deploy_contract to chain $chain_id with context $context"
                OVERRIDE_DEPLOYMENTS=1 $make_command context="$context" type=facets contract="$deploy_contract"

                if [ $? -ne 0 ]; then
                    echo "Error deploying $contract"
                else
                    # Run resume-any command for omega network
                    if [[ "$network" == "omega" ]]; then
                        echo "Running resume-any for $contract"
                        $resume_any context="$context" type=facets contract="$deploy_contract"
                        if [ $? -ne 0 ]; then
                            echo "Error running resume-any for $contract"
                        fi
                    fi
                fi
            else
                echo "Error: Deploy file not found for $contract. Skipping."
            fi
        done
        cd "$current_dir"
    fi

    # Call process_deployments after processing the file
    process_deployments "$chain_id" "$file" "${contract_names[@]}"
}

# Function to process deployments and create a new YAML file
process_deployments() {
    local chain_id="$1"
    local input_file="$2"
    shift 2
    local contract_names=("$@")

    # Append a new deployments section to the input file
    echo -e "\ndeployments:" >> "$input_file"

    for contract in "${contract_names[@]}"; do
        local json_file="../../broadcast/Deploy${contract}.s.sol/${chain_id}/run-latest.json"
        if [[ -f "$json_file" ]]; then
            local contract_name=$(jq -r '.transactions[0].contractName' "$json_file")
            local contract_address=$(jq -r '.transactions[0].contractAddress' "$json_file")
            local tx_hash=$(jq -r '.transactions[0].hash' "$json_file")
            local deployment_date=$(date -r "$json_file" -u +"%Y-%m-%d %H:%M")

            # Determine the baseScanLink based on the chain_id
            if [ "$chain_id" == "84532" ]; then
                local base_scan_link="https://sepolia.basescan.org/tx/$tx_hash"
            elif [ "$chain_id" == "8453" ]; then
                local base_scan_link="https://basescan.org/tx/$tx_hash"
            else
                local base_scan_link=""
            fi

            # Append deployment information for each contract
            echo "  $contract_name:" >> "$input_file"
            echo "    address: $contract_address" >> "$input_file"
            echo "    transactionHash: $tx_hash" >> "$input_file"
            echo "    deploymentDate: $deployment_date" >> "$input_file"
            echo "    bytecodeHash: " >> "$input_file"
            if [ -n "$base_scan_link" ]; then
                echo "    baseScanLink: $base_scan_link" >> "$input_file"
            fi
        fi
    done

    echo "Deployment information appended to $input_file"
}

# Main script
if [ -n "$file_name" ]; then
    if [[ -f "$diff_dir/$file_name" ]]; then
        process_file "$diff_dir/$file_name"
    else
        echo "Error: Specified file $diff_dir/$file_name not found."
        exit 1
    fi
else
    for file in "$diff_dir"/diff_*.yaml; do
        if [[ -f "$file" ]]; then
            process_file "$file"
        fi
    done
fi
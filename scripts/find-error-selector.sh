#!/bin/bash

# Script to find error names for error selectors in contract compilation artifacts.
# Usage: ./find-error-selector.sh [selector] [--threads N]
# Examples: 
#   ./find-error-selector.sh                          # List all errors and their selectors (16 threads)
#   ./find-error-selector.sh 08c379a0                 # Find specific error by selector (16 threads)
#   ./find-error-selector.sh --threads 8              # List all errors using 8 threads
#   ./find-error-selector.sh 08c379a0 --threads 4     # Find specific error using 4 threads

# Handle broken pipe gracefully (when output is piped to head, less, etc.)
trap 'exit 0' PIPE

# Function to safely echo (suppress broken pipe errors)
safe_echo() {
    echo "$@" 2>/dev/null || exit 0
}

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required but not installed. Please install jq to use this script."
    echo "On macOS: brew install jq"
    echo "On Ubuntu/Debian: sudo apt-get install jq"
    exit 1
fi

# Check if cast is available (from foundry)
if ! command -v cast >/dev/null 2>&1; then
    echo "Error: cast is required but not installed. Please install foundry to use this script."
    echo "Visit: https://book.getfoundry.sh/getting-started/installation"
    exit 1
fi

# Check if xargs supports -P (parallel processing)
if ! echo "test" | xargs -P 1 echo >/dev/null 2>&1; then
    echo "Error: xargs with parallel processing (-P) is required but not supported."
    echo "Please use GNU xargs or update your system."
    exit 1
fi

# Parse command line arguments
SEARCH_SELECTOR=""
THREADS=16  # Default to 16 threads

# Function to show usage
show_usage() {
    echo "Usage: $0 [selector] [--threads N]"
    echo ""
    echo "Examples:"
    echo "  $0                          # List all errors and their selectors (16 threads)"
    echo "  $0 08c379a0                 # Find specific error by selector (16 threads)"
    echo "  $0 --threads 8              # List all errors using 8 threads"
    echo "  $0 08c379a0 --threads 4     # Find specific error using 4 threads"
    echo ""
    echo "Arguments:"
    echo "  selector                    # 8-character hex string (without 0x prefix)"
    echo "  --threads N                 # Number of parallel threads (default: 16)"
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --threads)
            if [[ -n "$2" ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
                THREADS="$2"
                shift 2
            else
                echo "Error: --threads requires a numeric argument"
                show_usage
            fi
            ;;
        --help|-h)
            show_usage
            ;;
        -*)
            echo "Error: Unknown option $1"
            show_usage
            ;;
        *)
            if [[ -z "$SEARCH_SELECTOR" ]]; then
                SEARCH_SELECTOR="$1"
                shift
            else
                echo "Error: Too many arguments"
                show_usage
            fi
            ;;
    esac
done

# Validate selector format if provided
if [[ -n "$SEARCH_SELECTOR" ]]; then
    # Remove 0x prefix if present
    SEARCH_SELECTOR=$(echo "$SEARCH_SELECTOR" | sed 's/^0x//')
    
    # Check if it's exactly 8 hex characters
    if [[ ! "$SEARCH_SELECTOR" =~ ^[0-9a-fA-F]{8}$ ]]; then
        echo "Error: Selector must be exactly 8 hexadecimal characters (e.g., 08c379a0)"
        echo "You provided: $SEARCH_SELECTOR"
        exit 1
    fi
    
    # Convert to lowercase for consistent matching
    SEARCH_SELECTOR=$(echo "$SEARCH_SELECTOR" | tr '[:upper:]' '[:lower:]')
fi

# Validate thread count
if [[ ! "$THREADS" =~ ^[0-9]+$ ]] || [[ "$THREADS" -lt 1 ]] || [[ "$THREADS" -gt 32 ]]; then
    echo "Error: Thread count must be between 1 and 32"
    exit 1
fi

if [[ -n "$SEARCH_SELECTOR" ]]; then
    safe_echo "Searching for error selector: 0x$SEARCH_SELECTOR"
else
    safe_echo "Building error selector database..."
fi
safe_echo "Using $THREADS parallel threads..."
safe_echo ""

# Function to convert types to canonical form (handles tuples/structs)
canonical_type() {
    local input_obj="$1"
    local file="$2"
    local error_index="$3"
    
    local type_name=$(echo "$input_obj" | jq -r '.type')
    
    if [[ "$type_name" == "tuple" ]]; then
        # For tuples, we need to recursively process components
        local components=$(echo "$input_obj" | jq -r '.components')
        local component_count=$(echo "$components" | jq 'length')
        local canonical_components=""
        
        for i in $(seq 0 $((component_count - 1))); do
            local component=$(echo "$components" | jq ".[$i]")
            local canonical_component=$(canonical_type "$component" "$file" "$error_index")
            
            if [ -n "$canonical_components" ]; then
                canonical_components="$canonical_components,$canonical_component"
            else
                canonical_components="$canonical_component"
            fi
        done
        
        echo "($canonical_components)"
    else
        echo "$type_name"
    fi
}

# Function to process a single file
process_file() {
    local file="$1"
    local search_selector="$2"
    local temp_dir="$3"
    local file_index="$4"
    local total_files="$5"
    
    # Extract contract name from file path
    CONTRACT_NAME=$(basename "$(dirname "$file")" | sed 's/\.sol$//')
    
    # Show progress
    safe_echo "[$file_index/$total_files] Processing $CONTRACT_NAME..."
    
    # Check if file exists and is readable
    if [[ ! -f "$file" ]] || [[ ! -r "$file" ]]; then
        return
    fi
    
    # Check if file contains ABI data
    if ! jq -e '.abi' "$file" >/dev/null 2>&1; then
        return
    fi
    
    # Count errors in this file
    ERROR_COUNT=$(jq '[.abi[] | select(.type == "error")] | length' "$file" 2>/dev/null)
    
    if [[ "$ERROR_COUNT" -gt 0 ]]; then
        safe_echo "  Found $ERROR_COUNT error(s)"
        
        # Process each error
        for i in $(seq 0 $((ERROR_COUNT - 1))); do
            ERROR_NAME=$(jq -r "[.abi[] | select(.type == \"error\")][$i].name" "$file" 2>/dev/null)
            
            if [[ -n "$ERROR_NAME" ]] && [[ "$ERROR_NAME" != "null" ]]; then
                safe_echo "    Processing error: $ERROR_NAME"
                
                # Get the inputs array for this error
                INPUTS_JSON=$(jq -r "[.abi[] | select(.type == \"error\")][$i].inputs" "$file" 2>/dev/null)
                INPUT_COUNT=$(echo "$INPUTS_JSON" | jq 'length' 2>/dev/null)
                
                # Build canonical input types
                CANONICAL_INPUTS=""
                if [[ "$INPUT_COUNT" -gt 0 ]]; then
                    for k in $(seq 0 $((INPUT_COUNT - 1))); do
                        INPUT_OBJ=$(echo "$INPUTS_JSON" | jq ".[$k]")
                        CANONICAL_TYPE=$(canonical_type "$INPUT_OBJ" "$file" "$i")
                        
                        if [[ -n "$CANONICAL_INPUTS" ]]; then
                            CANONICAL_INPUTS="$CANONICAL_INPUTS,$CANONICAL_TYPE"
                        else
                            CANONICAL_INPUTS="$CANONICAL_TYPE"
                        fi
                    done
                fi
                
                # Create error signature
                ERROR_SIGNATURE="$ERROR_NAME($CANONICAL_INPUTS)"
                
                # Compute keccak256 hash and get first 4 bytes (8 hex chars)
                SELECTOR=$(echo -n "$ERROR_SIGNATURE" | cast keccak | cut -c1-10 | sed 's/0x//')
                
                safe_echo "      Signature: $ERROR_SIGNATURE"
                safe_echo "      Selector: 0x$SELECTOR"
                
                # Write to temporary file for later processing
                echo "$CONTRACT_NAME|$ERROR_NAME|$ERROR_SIGNATURE|$SELECTOR|$file" >> "$temp_dir/results_$file_index.txt"
                
                # If searching for specific selector, check for match
                if [[ -n "$search_selector" ]] && [[ "$SELECTOR" == "$search_selector" ]]; then
                    echo "MATCH:$CONTRACT_NAME|$ERROR_NAME|$ERROR_SIGNATURE|$SELECTOR|$file" >> "$temp_dir/matches.txt"
                fi
            fi
        done
    fi
}

# Create temporary directory for parallel processing
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Count total files for progress
TOTAL_FILES=$(find packages/contracts/out -name "*.json" -type f | grep -v "\.t\.sol/" | grep -v "\.s\.sol/" | wc -l)
safe_echo "Processing $TOTAL_FILES files using $THREADS parallel threads..."
safe_echo ""

# Export function and variables for parallel processing
export -f process_file canonical_type safe_echo
export TEMP_DIR SEARCH_SELECTOR

# Process files in parallel
FILE_INDEX=0
find packages/contracts/out -name "*.json" -type f | grep -v "\.t\.sol/" | grep -v "\.s\.sol/" | while read -r file; do
    FILE_INDEX=$((FILE_INDEX + 1))
    echo "$file|$FILE_INDEX|$TOTAL_FILES"
done | xargs -P "$THREADS" -I {} bash -c '
    IFS="|" read -r file file_index total_files <<< "{}"
    process_file "$file" "$SEARCH_SELECTOR" "$TEMP_DIR" "$file_index" "$total_files"
'

safe_echo ""
safe_echo "Database scan complete!"
safe_echo ""

# Process results
if [[ -n "$SEARCH_SELECTOR" ]]; then
    # Search for specific selector
    if [[ -f "$TEMP_DIR/matches.txt" ]]; then
        safe_echo "Found matches:"
        safe_echo ""
        
        while IFS='|' read -r match_type contract_name error_name error_signature selector file_path; do
            if [[ "$match_type" == "MATCH" ]]; then
                safe_echo "Contract: $contract_name"
                safe_echo "Error: $error_signature"
                safe_echo "Selector: 0x$selector"
                safe_echo "File: $file_path"
                safe_echo ""
            fi
        done < "$TEMP_DIR/matches.txt"
        
        safe_echo "Processing complete!"
    else
        safe_echo "No errors found with selector: 0x$SEARCH_SELECTOR"
        safe_echo "Processing complete!"
    fi
else
    # List all errors
    safe_echo "All errors and their selectors:"
    safe_echo ""
    
    # Combine all result files and sort by selector
    if ls "$TEMP_DIR"/results_*.txt >/dev/null 2>&1; then
        cat "$TEMP_DIR"/results_*.txt | sort -t'|' -k4 | while IFS='|' read -r contract_name error_name error_signature selector file_path; do
            safe_echo "Contract: $contract_name"
            safe_echo "Error: $error_signature"
            safe_echo "Selector: 0x$selector"
            safe_echo ""
        done
    else
        safe_echo "No errors found in any contracts."
    fi
    
    safe_echo "Processing complete!"
fi 
#!/bin/bash

# Check if required arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <database_id> <output_path> <column_name>"
    echo "Example: $0 1ca3562b1f4e8001b7d5ec2cfc1b2cd5 ../../servers/gateway-worker/.dev.vars alpha"
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the script's directory
cd "$SCRIPT_DIR"

echo "Querying Notion database"
echo "Database ID: $1"
echo "Column Name: $3"

# Call the script and capture both stdout and stderr
NOTION_VALUES=$("./query-db.sh" "$1" "$3" 2>&1)

# Check if the script executed successfully
if [ $? -ne 0 ]; then
    echo "Failed to get Notion values"
    echo "Error output: $NOTION_VALUES"
    exit 1
fi

# Write NOTION_VALUES to specified file
echo "$NOTION_VALUES" > "$2"
echo "Successfully wrote values to $2" 
echo "NOTION_VALUES: $NOTION_VALUES"
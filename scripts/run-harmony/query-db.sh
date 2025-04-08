#!/bin/bash
# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the script's directory
cd "$SCRIPT_DIR"

# Check if both database ID and column name are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Error: Please provide both database ID and column name" >&2
    echo "Usage: $0 <database_id> <column_name>" >&2
    echo "Example: $0 1ca3562b1f4e8001b7d5ec2cfc1b2cd5 alpha" >&2
    exit 1
fi

DATABASE_ID="$1"
ENV_COLUMN="$2"

# If ENV_COLUMN is "gamma", change it to "test-beta"
if [ "$ENV_COLUMN" = "gamma" ]; then
    ENV_COLUMN="test-beta"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found in $SCRIPT_DIR" >&2
    exit 1
fi

# Read NOTION_API_KEY from .env without prompting
export $(cat .env | xargs)
NOTION_API_KEY=$NOTION_API_KEY

# Check if NOTION_API_KEY is set and not empty
if [ -z "$NOTION_API_KEY" ]; then
    echo "Error: NOTION_API_KEY not found in .env file or is empty" >&2
    exit 1
fi

# Fetch the database content and extract values for the specified column
RESPONSE=$(curl -s -X POST "https://api.notion.com/v1/databases/$DATABASE_ID/query" \
  -H 'Authorization: Bearer '"$NOTION_API_KEY"'' \
  -H 'Notion-Version: 2022-06-28' \
  -H "Content-Type: application/json")

# Check if curl request was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to fetch data from Notion API" >&2
    exit 1
fi

# Check if the response contains an error
if echo "$RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
    echo "Error: Notion API returned an error" >&2
    echo "$RESPONSE" | jq -r '.error' >&2
    exit 1
fi

# Output the filtered results
echo "$RESPONSE" | jq -r --arg col "$ENV_COLUMN" '.results[] | select(.properties[$col].rich_text[0].plain_text != null) | "\(.properties.Name.title[0].plain_text)=\(.properties[$col].rich_text[0].plain_text)"'

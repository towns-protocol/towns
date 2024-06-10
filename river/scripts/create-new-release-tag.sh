#!/usr/bin/env bash

# Check if prefix is provided as an argument
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <prefix>"
    exit 1
fi

# Get the prefix argument
prefix="$1"

# Check if prefix is either "mainnet" or "testnet"
if [ "$prefix" != "mainnet" ] && [ "$prefix" != "testnet" ]; then
    echo "Prefix must be either 'mainnet' or 'testnet'"
    exit 1
fi

# Get the current year and month in YYYY-MM format
current_date=$(date "+%Y-%m-%d")

git fetch --tags > /dev/null 2>&1

# Get the list of tags matching the prefix and filter them by the format
tags=$(git tag -l "$prefix/*" | grep -E "^$prefix/[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]+$")

# Sort the tags lexicographically (highest first)
sorted_tags=$(echo "$tags" | sort -r)

# Iterate over the sorted tags
for tag in $sorted_tags; do
    # Extract the date and number parts from the tag
    tag_date=$(echo "$tag" | cut -d'/' -f2 | cut -d'-' -f1-3)
    tag_number=$(echo "$tag" | cut -d'-' -f4)
    # If the tag's date matches the current date
    if [ "$tag_date" == "$current_date" ]; then
        # Increment the number part of the tag
        new_number=$((tag_number + 1))
        new_tag="$prefix/$current_date-$new_number"

        echo "$new_tag"
        exit 0
    fi
done

# If no matching tag was found for the current date, create a new one with number 01
new_tag="$prefix/$current_date-1"
echo "$new_tag"
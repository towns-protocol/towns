#!/usr/bin/env bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -z "$1" ]; then
    echo "Usage: $0 <env> [-w|workers]"
    exit 1
fi

env=$1
include_workers=0

# Check if the second argument is the workers flag
if [[ "$2" == "-w" || "$2" == "workers" ]]; then
    include_workers=1
fi

# Ensure there is an .env file to work with
touch clients/web/app/.env

# Function to handle environment switching
switch_env() {
    local env=$1
    local env_file="clients/web/app/.deployment.env.${env}"
    local overrides_file="clients/web/app/.deployment.overrides.${env}"
    local cf_workers_file="clients/web/app/.deployment.cf-workers"

    echo "Switching to ${env}"
    "$SCRIPT_DIR/download-envs.sh" "$env"
    cp "$env_file" clients/web/app/.env

    if [ "$include_workers" -eq 1 ]; then
        if [ -f "$cf_workers_file" ]; then
            echo "Overriding CF workers config..."
            cat "$cf_workers_file" >> clients/web/app/.env
        else
            echo "Warning: CF workers file not found at $cf_workers_file"
        fi
    fi

    if [ -f "$overrides_file" ]; then
        echo "" >> clients/web/app/.env  # Add a blank line
        echo "## Overrides from .deployment.overrides.${env}" >> clients/web/app/.env
        cat "$overrides_file" >> clients/web/app/.env  # Append the overrides
    fi
}

# Switch to the specified environment
case "$env" in
    "gamma" | "alpha" | "omega" | "delta")
        switch_env "$env"
        ;;
    "localhost")
        echo "Switching to localhost"
        cp clients/web/app/.deployment.env.localhost clients/web/app/.env
        ;;
    *)
        echo "Invalid environment: $1"
        exit 1
        ;;
esac

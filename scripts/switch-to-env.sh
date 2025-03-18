#!/usr/bin/env bash

if [ -z "$1" ]; then
    echo "Usage: $0 <env>"
    exit 1
fi

# Ensure there is an .env file to work with
touch clients/web/app/.env

# Function to handle environment switching
switch_env() {
    local env=$1
    local env_file="clients/web/app/.deployment.env.${env}"
    local overrides_file="clients/web/app/.deployment.overrides.${env}"

    echo "Switching to ${env}"
    ./scripts/download-envs.sh "$env"
    cp "$env_file" clients/web/app/.env

    if [ -f "$overrides_file" ]; then
        echo "" >> clients/web/app/.env  # Add a blank line
        echo "## Overrides from .deployment.overrides.${env}" >> clients/web/app/.env
        cat "$overrides_file" >> clients/web/app/.env  # Append the overrides
    fi
}

# Switch to the specified environment
case "$1" in
    "gamma" | "alpha" | "omega" | "delta")
        switch_env "$1"
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

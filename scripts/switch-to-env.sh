#!/usr/bin/env bash

if [ -z "$1" ]; then
    echo "Usage: $0 <env>"
    exit 1
fi


# Ensure there is an .env file to work with
touch clients/web/app/.env

# Switch to the specified environment by copying .env.xyz -> .env
case "$1" in
    "gamma")
        echo "Switching to gamma"
        ./scripts/download-envs.sh gamma
        cp clients/web/app/.deployment.env.gamma clients/web/app/.env
        ;;
    "alpha")
        echo "Switching to alpha"
        ./scripts/download-envs.sh alpha
        cp clients/web/app/.deployment.env.alpha clients/web/app/.env
        ;;
    "omega")
        echo "Switching to omega"
        ./scripts/download-envs.sh omega
        cp clients/web/app/.deployment.env.omega clients/web/app/.env
        ;;
    "localhost")
        echo "Switching to localhost"
        # the localhost env is checked into the repo
        cp clients/web/app/.deployment.env.localhost clients/web/app/.env
        ;;
    *)
        echo "Invalid environment: $1"
        exit 1
        ;;
esac

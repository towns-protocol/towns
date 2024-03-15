#!/bin/bash

### install dependencies
# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew is not installed. Installing Homebrew first..."
    # Download and execute Homebrew installation script
    # Handle potential failure in downloading the script
    if ! /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; then
        echo "Failed to install Homebrew."
        exit 1
    fi
fi

# Install yq using Homebrew if not present
if ! command -v yq &> /dev/null; then
    echo "yq is not installed. Installing it using Homebrew..."
    if ! brew install yq; then
        echo "Failed to install yq."
        exit 1
    fi
    echo "yq installed successfully."
fi

### run from the notification directory
RUN_DIR=$(git rev-parse --show-toplevel)/servers/notification-service
pushd $RUN_DIR

# generate the VAPID keys
./scripts/create-vapid-keys.sh

# generate config if not present
ENV_LOCAL=./.env.local
if [ ! -f "$ENV_LOCAL" ]
then    
    echo "$ENV_LOCAL does not exist. Generating it now..."
    cp .env.local-sample $ENV_LOCAL
    PUBLIC_KEY=$(yq eval '.publicKey' ./.keys/vapid-keys.json -o=j)
    PRIVATE_KEY=$(yq eval '.privateKey' ./.keys/vapid-keys.json -o=j)
    # echo "PUBLIC_KEY: $PUBLIC_KEY", "PRIVATE_KEY: $PRIVATE_KEY"
    sed -i '' "s/VAPID_PUBLIC_KEY=/VAPID_PUBLIC_KEY=$PUBLIC_KEY/" "$ENV_LOCAL"
    sed -i '' "s/VAPID_PRIVATE_KEY=/VAPID_PRIVATE_KEY=$PRIVATE_KEY/" "$ENV_LOCAL"
    echo "VAPID keys updated in $ENV_LOCAL"
fi


# build and deploy
yarn build
docker compose up -d db
yarn dev

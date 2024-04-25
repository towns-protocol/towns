#!/usr/bin/env bash

set -eo pipefail

usage()
{
cat << EOF
usage: $0 PARAM [-e|--environment] [-h|--help] [-o|--output]

OPTIONS:
   PARAM                The param
   -h|--help            Show this message
   -p|--privy           Run as privy user
EOF
}

AS_PRIVY_USER="false"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p | --privy )  
            AS_PRIVY_USER="true"
            ;;
        -h | --help )
            usage
            exit
            ;;
        * )                     
            usage
            exit 1
            ;;
    esac
    shift
done

# Set the environment
RIVER_ENV="${RIVER_ENV:-gamma}"

# Defaults in case not in .env file
AA_PAYMASTER_PROXY_URL=http://localhost:8686
AA_PAYMASTER_PROXY_AUTH_SECRET=Zm9v
RIVER_CHAIN_RPC_URL=https://devnet.rpc.river.build


BASE_CHAIN_RPC_URL=""
AA_RPC_URL=""
AA_BUNDLER_URL=""


ENV_FILE="./clients/web/lib/.env.test.userops"


# Check if the file exists
if [ -f "$ENV_FILE" ]; then
    # Source the file to read variables
    source "$ENV_FILE"
    echo "Variables loaded from $ENV_FILE"
else
    echo "ERROR: .env file not found at $ENV_FILE"
    exit 1
fi

# if variables are not present, throw an error
if [ -z "$BASE_CHAIN_RPC_URL" ]; then
    echo "ERROR: Missing BASE_CHAIN_RPC_URL in $ENV_FILE"
    exit 1
fi
if [ -z "$AA_RPC_URL" ]; then
    echo "ERROR: Missing AA_RPC_URL in $ENV_FILE"
    exit 1
fi
if [ -z "$AA_BUNDLER_URL" ]; then
    echo "ERROR: Missing AA_BUNDLER_URL in $ENV_FILE"
    exit 1
fi

echo "BASE_CHAIN_RPC_URL: ${BASE_CHAIN_RPC_URL}"
echo "AA_RPC_URL: ${AA_RPC_URL}"
echo "AA_BUNDLER_URL: ${AA_BUNDLER_URL}"

cd clients/web/lib

if [ "$AS_PRIVY_USER" = "false" ]; then
    echo "Running tests as random user"
    yarn test:userops:random-wallet
else
    echo "Running tests as privy user"
    yarn test:userops:privy-wallet
fi

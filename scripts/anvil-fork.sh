#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

# Default values
FORK_URL="${FORK_URL:-https://sepolia.base.org}"
FORK_BLOCK_NUMBER="${FORK_BLOCK_NUMBER:-}"
CHAIN_ID="${CHAIN_ID:-84532}"  # Default to Base Sepolia testnet
PORT="${PORT:-8545}"
BLOCK_TIME="${BLOCK_TIME:-1}"
ACCOUNTS="${ACCOUNTS:-10}"
BALANCE="${BALANCE:-10000}"  # In ETH
OUTPUT_BLOCK_NUMBER="${OUTPUT_BLOCK_NUMBER:-false}"
SILENT="${SILENT:-false}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fork-url)
      FORK_URL="$2"
      shift 2
      ;;
    --fork-block-number)
      FORK_BLOCK_NUMBER="$2"
      shift 2
      ;;
    --chain-id)
      CHAIN_ID="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --block-time)
      BLOCK_TIME="$2"
      shift 2
      ;;
    --accounts)
      ACCOUNTS="$2"
      shift 2
      ;;
    --balance)
      BALANCE="$2"
      shift 2
      ;;
    --output-block-number)
      OUTPUT_BLOCK_NUMBER="true"
      shift
      ;;
    --silent)
      SILENT="true"
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --fork-url URL             RPC URL to fork from (default: $FORK_URL)"
      echo "  --fork-block-number NUM    Block number to fork from (default: latest)"
      echo "  --chain-id ID              Chain ID for the forked network (default: $CHAIN_ID)"
      echo "  --port PORT                Port to run Anvil on (default: $PORT)"
      echo "  --block-time SECONDS       Block time in seconds (default: $BLOCK_TIME)"
      echo "  --accounts NUM             Number of test accounts to create (default: $ACCOUNTS)"
      echo "  --balance AMOUNT           Initial balance in ETH for test accounts (default: $BALANCE)"
      echo "  --output-block-number      Output only the block number and exit"
      echo "  --silent                   Run Anvil in silent mode"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# If no fork block number is specified, get the latest block number
if [ -z "$FORK_BLOCK_NUMBER" ]; then
  # Only show debug messages if not in output-block-number mode
  if [ "$OUTPUT_BLOCK_NUMBER" = "false" ]; then
    echo "Getting latest block number from $FORK_URL..."
  fi

  FORK_BLOCK_NUMBER=$(cast block-number --rpc-url $FORK_URL)
  if [ $? -eq 0 ]; then
    # Only show debug messages if not in output-block-number mode
    if [ "$OUTPUT_BLOCK_NUMBER" = "false" ]; then
      echo "Latest block number: $FORK_BLOCK_NUMBER"
    fi
  else
    if [ "$OUTPUT_BLOCK_NUMBER" = "false" ]; then
      echo "Failed to get latest block number. Using default."
    fi
  fi
fi

# If only output block number is requested, print it and exit
if [ "$OUTPUT_BLOCK_NUMBER" = "true" ]; then
  echo "$FORK_BLOCK_NUMBER"
  exit 0
fi

echo "Starting Anvil fork of $FORK_URL..."
echo "Chain ID: $CHAIN_ID"
echo "Port: $PORT"
echo "Block time: $BLOCK_TIME seconds"

# Build the Anvil command
ANVIL_CMD="anvil --fork-url $FORK_URL --chain-id $CHAIN_ID --port $PORT --block-time $BLOCK_TIME --accounts $ACCOUNTS --balance $BALANCE"

# Add silent flag if requested
if [ "$SILENT" = "true" ]; then
  ANVIL_CMD="$ANVIL_CMD --silent"
fi

# Add fork block number if specified
if [ -n "$FORK_BLOCK_NUMBER" ]; then
  ANVIL_CMD="$ANVIL_CMD --fork-block-number $FORK_BLOCK_NUMBER"
  echo "Forking from block: $FORK_BLOCK_NUMBER"
else
  echo "Forking from latest block"
fi

# Execute Anvil
echo "Running: $ANVIL_CMD"
eval "$ANVIL_CMD"

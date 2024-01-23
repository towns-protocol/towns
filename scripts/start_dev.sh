#!/bin/bash
set -euo pipefail

SESSION_NAME="River"
YAML_FILE="./casablanca/node/run_files/single/config/config.yaml"
PNW_URL="http://localhost:8787"
PNW_AUTH_TOKEN="Zm9v"

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

# Install Tmux using Homebrew if not present
if ! command -v tmux &> /dev/null; then
    echo "Tmux is not installed. Installing it using Homebrew..."
    if ! brew install tmux; then
        echo "Failed to install Tmux."
        exit 1
    fi
    echo "Tmux installed successfully."
fi

# Install Netcat using Homebrew if not present
if ! command -v nc &> /dev/null; then
    echo "Netcat is not installed. Installing it using Homebrew..."
    if ! brew install netcat; then
        echo "Failed to install Netcat."
        exit 1
    fi
    echo "Netcat installed successfully."
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

# Create a new tmux session
tmux new-session -d -s $SESSION_NAME

./casablanca/scripts/launch_storage.sh &

# Set the block chains to run with 2 second block times
# referenced by the start-local scripts
export RIVER_BLOCK_TIME=2 

# Start chains and Postgres in separate panes of the same window
tmux new-window -t $SESSION_NAME -n 'BlockChains'
tmux send-keys -t $SESSION_NAME:1 "./scripts/start-local-basechain.sh" C-m
tmux split-window -v
tmux send-keys -t $SESSION_NAME:1 "./scripts/start-local-riverchain.sh" C-m

# Function to wait for a specific port
wait_for_port() {
    local port=$1
    echo "Waiting for process to listen on TCP $port..."

    while ! nc -z localhost $port; do   
        echo "Waiting for TCP $port..."
        sleep 1
    done

    echo "TCP $port is now open."
}

# Wait for both chains
wait_for_port 8545
wait_for_port 8546

# Wait for Postgres
wait_for_port 5433

echo "Both Anvil chains and Postgres are now running, deploying contracts"

#!/bin/bash

# Create temporary files in the system's temp directory
tmpfile_river_chain=$(mktemp /tmp/anvil_river_chain.XXXXXX)
tmpfile_base_chain=$(mktemp /tmp/anvil_base_chain.XXXXXX)

# Run the scripts in the background and capture their outputs
(./scripts/deploy-river-registry.sh > "$tmpfile_river_chain" 2>&1 && ./scripts/deploy-entitlement-checker.sh >> "$tmpfile_river_chain" 2>&1) &
pid1=$!
(./scripts/deploy-towns-contracts.sh > "$tmpfile_base_chain" 2>&1 && ./scripts/deploy-wallet-link-contracts.sh >> "$tmpfile_base_chain" 2>&1) &
pid2=$!

# Wait for all scripts to finish
wait $pid1
exit_status1=$?
wait $pid2
exit_status2=$?

# Check the exit status of each script and display the output if it failed
if [ $exit_status1 -ne 0 ]; then
    echo "Anvil river chain deploy failed with exit status $exit_status1"
    cat "$tmpfile_river_chain"
fi

if [ $exit_status2 -ne 0 ]; then
    echo "Anvil base chain deploy failed with exit status $exit_status2"
    cat "$tmpfile_base_chain"
fi

# Now generate the casablanca server config
./casablanca/node/run_single.sh -c
# and set the PNW settings in it's config
yq eval ".pushNotification.url = \"$PNW_URL\"" -i $YAML_FILE
yq eval ".pushNotification.authToken = \"$PNW_AUTH_TOKEN\"" -i $YAML_FILE

# xchain nodes
# disabled: https://linear.app/hnt-labs/issue/HNT-4317/create-multish-call-in-the-start-devsh-fails
# ./servers/xchain/create_multi.sh

# Continue with rest of the script
echo "Continuing with the rest of the script..."

# Array of commands from the VS Code tasks
commands=(
    "watch_lib:cd clients/web/lib && yarn watch"
    "watch_sdk:cd casablanca/sdk && yarn watch"
    "watch_mecholm:cd casablanca/waterproof && yarn watch"
    "watch_worker:cd servers/workers/worker-common && yarn watch"
    "watch_proto:cd casablanca/proto && yarn watch"
    "watch_web3:cd casablanca/web3 && yarn watch"
    "watch_go:cd casablanca/proto && yarn watch:go"
    "app:cd clients/web/app && yarn dev"
    "sample_app:cd clients/web/sample-app && yarn dev"
    "debug_app:cd casablanca/debug-app && yarn dev"
    "worker_unfurl:cd servers/workers/unfurl-worker && yarn dev:local"
    "worker_token:cd servers/workers/token-worker && yarn dev:local"
    "worker_gateway:cd servers/workers/gateway-worker && yarn dev:local"
    "worker_push:cd servers/workers/push-notification-worker && ./scripts/start-local-push-worker.sh"
    "casablanca:./casablanca/node/run_single.sh --skip-config"
    "casablanca-no-entitlements:./casablanca/node/run_single.sh --disable_entitlements"
    "xchain:./servers/xchain/launch_multi.sh"
)

# Create a Tmux window for each command
for cmd in "${commands[@]}"; do
    window_name="${cmd%%:*}"
    command="${cmd#*:}"
    tmux new-window -t $SESSION_NAME -n "$window_name" -d
    tmux send-keys -t $SESSION_NAME:"$window_name" "$command" C-m
done

# Attach to the tmux session
tmux attach -t $SESSION_NAME

# test if the session has windows
is_closed() { 
    n=$(tmux ls 2> /dev/null | grep "^$SESSION_NAME" | wc -l)
    [[ $n -eq 0 ]]
}

# Wait for the session to close
if is_closed ; then
    echo "Session $SESSION_NAME has closed; delete casablanca postgres container and volume"
    ./casablanca/scripts/stop_storage.sh
fi

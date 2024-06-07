#!/bin/bash
set -euo pipefail

SESSION_NAME="River"

# Function to wait for a process and exit if it fails
wait_for_process() {
    local pid=$1
    local name=$2
    wait "$pid" || { echo "Error: $name (PID: $pid) failed." >&2; exit 1; }
}

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

yarn install

# Create a new tmux session
tmux new-session -d -s $SESSION_NAME

# Start contract build in background
pushd contracts
set -a
. .env.localhost
set +a
make build & BUILD_PID=$!
popd

./core/scripts/launch_storage.sh &

# Start chains and Postgres in separate panes of the same window
tmux new-window -t $SESSION_NAME -n 'BlockChains_base'
tmux send-keys -t $SESSION_NAME:'BlockChains_base' "./scripts/start-local-basechain.sh &" C-m
tmux new-window -t $SESSION_NAME -n 'BlockChains_river'
tmux send-keys -t $SESSION_NAME:'BlockChains_river' "./scripts/start-local-riverchain.sh &" C-m

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

# Wait for build to finish
wait_for_process "$BUILD_PID" "build"


echo "STARTED ALL CHAINS AND BUILT ALL CONTRACTS"

# Now generate the core server config
./scripts/configure-nodes.sh --single
./scripts/configure-nodes.sh --single_ne
./scripts/configure-nodes.sh --multi
#./scripts/configure-nodes.sh --multi_ne


# Define the base directory for easier reference
CONFIGS_DIR="./core/node/run_files/"
PNW_URL="http://localhost:8787"
PNW_AUTH_TOKEN="Zm9v"

# Loop over each config.yaml file in the run_files subdirectories
find "$CONFIGS_DIR" -type f -name "config.yaml" | while read -r YAML_FILE; do
    yq eval ".pushNotification.url = \"$PNW_URL\"" -i $YAML_FILE
    yq eval ".pushNotification.authToken = \"$PNW_AUTH_TOKEN\"" -i $YAML_FILE
done

# Continue with rest of the script
echo "Continuing with the rest of the script..."

yarn csb:build

# Array of commands from the VS Code tasks
commands=(
    "watch_sdk:cd packages/sdk && yarn watch"
    "watch_encryption:cd packages/encryption && yarn watch"
    "watch_dlog:cd packages/dlog && yarn watch"
    "watch_proto:cd packages/proto && yarn watch"
    "watch_web3:cd packages/web3 && yarn watch"
    "watch_go:cd protocol && yarn watch:go"
    "debug_app:cd packages/debug-app && yarn dev"
    "core_single:./core/node/run_single.sh -r"
    "core_single_ne:./core/node/run_single.sh -r --de"
    "core_multi:./core/node/run_multi.sh -r"
    #"core_multi_ne:./core/node/run_multi.sh -r --de"
    "xchain_single:RUN_ENV=single ./core/xchain/launch_multi.sh"
    "xchain_multi:RUN_ENV=multi ./core/xchain/launch_multi.sh"
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
    echo "Session $SESSION_NAME has closed; delete core postgres container and volume"
    ./core/scripts/stop_storage.sh
fi

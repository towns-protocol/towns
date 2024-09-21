#!/bin/bash
set -euo pipefail

SESSION_NAME="USEROPS_TESTS_DEVNET"

# kill any existing tmux session
# Try to kill the tmux session and handle any errors
if ! tmux kill-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "No sessions found for: $SESSION_NAME"
else
    echo "Successfully killed tmux session: $SESSION_NAME"
fi

trap 'kill $(jobs -p)' EXIT

sh ./scripts/stop-4337.sh

sh ./river/scripts/foundry-up.sh

yarn install
yarn workers:build


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

# Create a new tmux session
tmux new-session -d -s $SESSION_NAME

# Start contract build in background
pushd river/contracts
set -a
. .env.localhost
set +a
make build & BUILD_PID=$!
popd


# Start chains and Postgres in separate panes of the same window
tmux new-window -t $SESSION_NAME -n '4337'
tmux send-keys -t $SESSION_NAME:1 "./scripts/start-4337.sh" C-m
tmux split-window -v
tmux send-keys -t $SESSION_NAME:1 "./river/scripts/start-local-riverchain.sh" C-m

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


# Wait for River
wait_for_port 8546

# wait for base and 4337 contracts
sh ./scripts/wait-for-4337.sh

echo "Geth node running and 4337 contracts deployed, deploying Base contracts"

# Wait for build to finish
wait_for_process "$BUILD_PID" "build"

echo "STARTED ALL CHAINS AND DEPLOYED ALL CONTRACTS"

# Now generate the core server config
BASE_EXECUTION_CLIENT="geth_dev" (cd ./river/core && just RUN_ENV=multi config)
./scripts/fund_multi_for_geth.sh

# Continue with rest of the script
echo "Continuing with the rest of the script..."

# Array of commands from the VS Code tasks
commands=(
    "worker_stackup: sh ./scripts/run-stackup-worker-development.sh"
    "userops: cd clients/web/userops && yarn test:userops:random-wallet"
)

# Create a Tmux window for each command
for cmd in "${commands[@]}"; do
    window_name="${cmd%%:*}"
    command="${cmd#*:}"
    tmux new-window -t $SESSION_NAME -n "$window_name" -d
    tmux send-keys -t $SESSION_NAME:"$window_name" "$command" C-m
done

# Attach to the tmux session
tmux attach -t $SESSION_NAME:'userops'

# test if the session has windows
is_closed() { 
    n=$(tmux ls 2> /dev/null | grep "^$SESSION_NAME" | wc -l)
    [[ $n -eq 0 ]]
}

# Wait for the session to close
if is_closed ; then
    echo "Session $SESSION_NAME has closed; stop 4337"
    ./scripts/stop-4337.sh
fi

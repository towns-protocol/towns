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

export RIVER_BLOCK_TIME=0.1
export RIVER_ENV=local_multi


# Start
tmux new-window -t $SESSION_NAME -n 'BlockChains'
tmux send-keys -t $SESSION_NAME:1 "RIVER_BLOCK_TIME=$RIVER_BLOCK_TIME ./river/scripts/start-local-basechain.sh" C-m

# Start 4337 in a new window
tmux new-window -t $SESSION_NAME -n '4337'
tmux send-keys -t $SESSION_NAME:2 "./scripts/start-4337.sh" C-m
sh ./scripts/wait-for-4337.sh

# wait for base and 4337 contracts
sh ./scripts/wait-for-4337.sh

echo "Anvil running and 4337 contracts deployed, deploying Base contracts"

# Now deploy base contracts

rm -rf river/packages/contracts/deployments/${RIVER_ENV}
rm -rf river/packages/generated/deployments/${RIVER_ENV}

sh ./scripts/deploy-config-base-only.sh

# Continue with rest of the script
echo "Continuing with the rest of the script..."

# Array of commands from the VS Code tasks
commands=(
    "watch_web3:cd river/packages/web3 && yarn watch"
    "worker_stackup: sh ./scripts/run-stackup-worker-development.sh"
    "userops: cd clients/web/userops && yarn test:userops"
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

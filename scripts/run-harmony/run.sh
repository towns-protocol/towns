#!/bin/bash
set -euo pipefail

SESSION_NAME="Harmony"

# Validate command line argument
if [ $# -eq 0 ]; then
    echo "Error: No environment specified. Usage: $0 <environment>"
    echo "Valid environments: localhost, alpha, gamma, delta, omega"
    exit 1
fi

ENV="$1"

# Validate ENV value
case "$ENV" in
    alpha|gamma|delta|localhost|omega)
        echo "Using environment: $ENV"
        ;;
    *)
        echo "Error: Invalid environment '$ENV'. Must be one of: localhost, alpha, gamma, delta or omega"
        exit 1
        ;;
esac

# Set ENABLE_4337 based on environment
if [ "$ENV" = "localhost" ]; then
    ENABLE_4337=true
else
    ENABLE_4337=false
fi

# Print the value of ENABLE_4337
echo "ENABLE_4337 is set to: $ENABLE_4337"

# Function to wait for a process and exit if it fails
wait_for_process() {
    local pid=$1
    local name=$2
    wait "$pid" || { echo "Error: $name (PID: $pid) failed." >&2; exit 1; }
}

yarn install

# Create a new tmux session
tmux new-session -d -s $SESSION_NAME

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

# Install required packages using Homebrew if not present
for package in tmux netcat yq jq; do
    if ! command -v $package &> /dev/null; then
        echo "$package is not installed. Installing it using Homebrew..."
        if ! brew install $package; then
            echo "Failed to install $package."
            exit 1
        fi
        echo "$package installed successfully."
    fi
done

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


if [ "$ENV" = "localhost" ]; then

    # Start contract build in background
    pushd river/packages/contracts
    set -a
    . .env.localhost
    set +a
    make build & BUILD_PID=$!
    popd

    ./river/core/scripts/launch_storage.sh &

    # Set the block chains to run with 2 second block times
    # referenced by the start-local scripts
    export RIVER_BLOCK_TIME=2

    # Start chains and Postgres in separate panes of the same window
    tmux new-window -t $SESSION_NAME -n 'BlockChains'

    tmux send-keys -t $SESSION_NAME:1 "./river/scripts/start-local-basechain.sh" C-m
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

    # Wait for both chains
    wait_for_port 8545
    wait_for_port 8546

    if [ -n "$ENABLE_4337" ]; then
        # Start 4337 in a new window
        tmux new-window -t $SESSION_NAME -n '4337'
        tmux send-keys -t $SESSION_NAME:2 "./scripts/start-4337.sh" C-m
        sh ./scripts/wait-for-4337.sh
    fi

    # Wait for Postgres
    wait_for_port 5433

    echo "Both Anvil chains and Postgres are now running, deploying contracts"

    # Wait for build to finish
    wait_for_process "$BUILD_PID" "build"

    echo "STARTED ALL CHAINS AND DEPLOYED ALL CONTRACTS"

    # Now generate the core server config
    (cd ./river/core && just RUN_ENV=multi stop config build)
fi

# Continue with rest of the script
echo "Continuing with the rest of the script..."

# build protobufs
yarn csb:build

# Array of commands from the VS Code tasks
commands=(
    "watch_userops:cd clients/web/userops && yarn watch"
    "watch_lib:cd clients/web/lib && yarn watch"
    "watch_sdk:cd river/packages/sdk && yarn watch"
    "watch_encryption:cd river/packages/encryption && yarn watch"
    "watch_dlog:cd river/packages/dlog && yarn watch"
    "watch_proto:cd river/packages/proto && yarn watch"
    "watch_web3:cd river/packages/web3 && yarn watch"
    # download envs for the app + the workers, and run the app
    "app:sh ./scripts/run-harmony/switch-to-env.sh $ENV -w && cd clients/web/app && yarn dev"
    "watch_worker:cd servers/workers/worker-common && yarn watch"
    "worker_unfurl:sh ./scripts/run-harmony/run-unfurl-worker.sh $ENV"
    "worker_token:sh ./scripts/run-harmony/run-token-worker.sh $ENV"
    "worker_gateway:sh ./scripts/run-harmony/run-gateway-worker.sh $ENV"
    "worker_stackup:sh ./scripts/run-harmony/run-stackup-worker.sh $ENV"
    #"notification_service:sleep 4 && ./scripts/start-local-notification-service.sh"
)

if [ "$ENV" = "localhost" ]; then
    commands+=(
        "river_stream_metadata_multi:yarn workspace @towns-protocol/stream-metadata dev:local_multi"
        "core:(cd ./river/core && just RUN_ENV=multi start)"
    )
fi

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
    echo "Session $SESSION_NAME has closed; delete postgres containers and volumes"
    ./river/core/scripts/stop_storage.sh
    #./scripts/stop-local-notification-db.sh
    ./scripts/stop-4337.sh
fi

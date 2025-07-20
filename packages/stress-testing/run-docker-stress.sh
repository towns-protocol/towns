#!/bin/bash
set -euo pipefail

# Default values
CONTAINER_COUNT=1
PROCESSES_PER_CONTAINER=2
CLIENTS_COUNT=8
STRESS_DURATION=180
SESSION_ID=""
SKIP_BUILD=false
IMAGE_TAG=alpha

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Run Towns stress test using Docker containers"
    echo ""
    echo "Options:"
    echo "  -c, --containers COUNT        Number of containers to run (default: 1)"
    echo "  -p, --processes COUNT         Processes per container (default: 2)"
    echo "  -t, --total-clients COUNT     Total number of clients (default: 8)"
    echo "  -d, --duration SECONDS        Test duration in seconds (default: 180)"
    echo "  -s, --session-id ID           Session ID for this test run (default: auto-generated)"
    echo "  --skip-build                  Skip Docker image build step"
    echo "  --image-tag TAG               Docker image tag to use (default: alpha)"
    echo "  -h, --help                    Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  All values from .env file will be used"
    echo ""
    echo "Examples:"
    echo "  # Run with 10 containers, 4 processes each, 200 total clients"
    echo "  $0 -c 10 -p 4 -t 200"
    echo ""
    echo "  # Run a 5-minute test with 50 containers"
    echo "  $0 -c 50 -d 300 -t 1000"
    echo ""
    echo "  # Skip build and use existing image"
    echo "  $0 --skip-build -c 5 -t 100"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--containers)
            CONTAINER_COUNT="$2"
            shift 2
            ;;
        -p|--processes)
            PROCESSES_PER_CONTAINER="$2"
            shift 2
            ;;
        -t|--total-clients)
            CLIENTS_COUNT="$2"
            shift 2
            ;;
        -d|--duration)
            STRESS_DURATION="$2"
            shift 2
            ;;
        -s|--session-id)
            SESSION_ID="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Generate SESSION_ID if not provided
if [ -z "$SESSION_ID" ]; then
    SESSION_ID=$(uuidgen)
    echo "Generated SESSION_ID: $SESSION_ID"
fi

# Load environment variables from .env file
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please run this script from the stress-testing directory."
    exit 1
fi

# Save command line values
CLI_CONTAINER_COUNT=$CONTAINER_COUNT
CLI_PROCESSES_PER_CONTAINER=$PROCESSES_PER_CONTAINER
CLI_CLIENTS_COUNT=$CLIENTS_COUNT
CLI_STRESS_DURATION=$STRESS_DURATION

# Export environment variables from .env file
set -a
source .env
set +a

# Restore command line values (they override .env values)
CONTAINER_COUNT=$CLI_CONTAINER_COUNT
PROCESSES_PER_CONTAINER=$CLI_PROCESSES_PER_CONTAINER
CLIENTS_COUNT=$CLI_CLIENTS_COUNT
STRESS_DURATION=$CLI_STRESS_DURATION

# Validate configuration
if [ $((CONTAINER_COUNT * PROCESSES_PER_CONTAINER)) -gt $CLIENTS_COUNT ]; then
    echo "Error: Container count * processes per container cannot exceed total clients"
    echo "Current: $CONTAINER_COUNT containers * $PROCESSES_PER_CONTAINER processes = $((CONTAINER_COUNT * PROCESSES_PER_CONTAINER)) > $CLIENTS_COUNT clients"
    exit 1
fi

# Calculate clients per container (should be evenly divisible)
if [ $((CLIENTS_COUNT % CONTAINER_COUNT)) -ne 0 ]; then
    echo "Warning: Total clients ($CLIENTS_COUNT) is not evenly divisible by containers ($CONTAINER_COUNT)"
    echo "Some containers may have different numbers of clients"
fi

echo "Starting stress test with configuration:"
echo "  Session ID: $SESSION_ID"
echo "  Containers: $CONTAINER_COUNT"
echo "  Processes per container: $PROCESSES_PER_CONTAINER"
echo "  Total clients: $CLIENTS_COUNT"
echo "  Duration: $STRESS_DURATION seconds"
echo "  Space ID: $SPACE_ID"
echo "  Environment: $RIVER_ENV"
echo "  Image tag: $IMAGE_TAG"
echo ""

# Build Docker image if not skipped
if [ "$SKIP_BUILD" = false ]; then
    echo "Building Docker image..."
    echo "This may take several minutes on first run..."
    
    # Navigate to repository root for Docker build context
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    REPO_ROOT="$SCRIPT_DIR/../.."
    
    cd "$REPO_ROOT"
    
    if docker build -f packages/stress-testing/Dockerfile -t "towns-stress-test:$IMAGE_TAG" . ; then
        echo "Docker image built successfully: towns-stress-test:$IMAGE_TAG"
    else
        echo "Error: Failed to build Docker image"
        exit 1
    fi
    
    # Return to stress-testing directory
    cd "$SCRIPT_DIR"
else
    echo "Skipping Docker build, using existing image: towns-stress-test:$IMAGE_TAG"
fi

echo ""

# Array to store container IDs
declare -a CONTAINER_IDS

# Function to cleanup containers on exit
cleanup() {
    echo ""
    echo "Cleaning up containers..."
    for container_id in "${CONTAINER_IDS[@]}"; do
        docker stop "$container_id" 2>/dev/null || true
        docker rm "$container_id" 2>/dev/null || true
    done
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Start containers
for i in $(seq 0 $((CONTAINER_COUNT - 1))); do
    echo "Starting container $i/$((CONTAINER_COUNT - 1))..."
    
    container_id=$(docker run -d \
        --name "stress-test-$SESSION_ID-$i" \
        -e STRESS_MODE="$STRESS_MODE" \
        -e RIVER_ENV="$RIVER_ENV" \
        -e SPACE_ID="$SPACE_ID" \
        -e ANNOUNCE_CHANNEL_ID="$ANNOUNCE_CHANNEL_ID" \
        -e CHANNEL_IDS="$CHANNEL_IDS" \
        -e RIVER_CHAIN_RPC_URL="$RIVER_CHAIN_RPC_URL" \
        -e BASE_CHAIN_RPC_URL="$BASE_CHAIN_RPC_URL" \
        -e STRESS_DURATION="$STRESS_DURATION" \
        -e PROCESSES_PER_CONTAINER="$PROCESSES_PER_CONTAINER" \
        -e CLIENTS_COUNT="$CLIENTS_COUNT" \
        -e MNEMONIC="$MNEMONIC" \
        -e CONTAINER_INDEX="$i" \
        -e CONTAINER_COUNT="$CONTAINER_COUNT" \
        -e SESSION_ID="$SESSION_ID" \
        -e BASE_CHAIN_ID="$BASE_CHAIN_ID" \
        -e RIVER_CHAIN_ID="$RIVER_CHAIN_ID" \
        "towns-stress-test:$IMAGE_TAG")
    
    CONTAINER_IDS+=("$container_id")
    echo "  Started container: $container_id"
done

echo ""
echo "All containers started. Monitoring logs..."
echo ""

# Function to show logs from all containers
show_logs() {
    for i in "${!CONTAINER_IDS[@]}"; do
        container_id="${CONTAINER_IDS[$i]}"
        echo "=== Container $i logs ==="
        docker logs "$container_id" 2>&1 | tail -20
        echo ""
    done
}

# Monitor containers
start_time=$(date +%s)
while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    # Check if all containers are still running
    running_count=0
    for container_id in "${CONTAINER_IDS[@]}"; do
        if docker ps -q --no-trunc | grep -q "$container_id"; then
            ((running_count++))
        fi
    done
    
    echo "[$elapsed/$STRESS_DURATION seconds] Running containers: $running_count/$CONTAINER_COUNT"
    
    # If no containers are running or we've exceeded the duration, exit
    if [ $running_count -eq 0 ] || [ $elapsed -gt $((STRESS_DURATION + 30)) ]; then
        echo ""
        echo "Test completed or all containers stopped."
        show_logs
        break
    fi
    
    # Show periodic status
    if [ $((elapsed % 30)) -eq 0 ] && [ $elapsed -gt 0 ]; then
        echo ""
        echo "=== Status Update ==="
        show_logs
    fi
    
    sleep 5
done

echo ""
echo "Stress test completed!"
echo "Session ID: $SESSION_ID"
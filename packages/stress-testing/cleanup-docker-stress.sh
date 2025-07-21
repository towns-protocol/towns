#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Cleaning up stress test containers...${NC}"

# Find all containers with the stress-test prefix
CONTAINERS=$(docker ps -a --filter "name=stress-test-" --format "{{.Names}}")

if [ -z "$CONTAINERS" ]; then
    echo -e "${GREEN}No stress test containers found.${NC}"
    exit 0
fi

# Count containers
CONTAINER_COUNT=$(echo "$CONTAINERS" | wc -l | tr -d ' ')
echo -e "Found ${YELLOW}$CONTAINER_COUNT${NC} stress test containers"

# Stop running containers
echo -e "\n${YELLOW}Stopping running containers...${NC}"
RUNNING_CONTAINERS=$(docker ps --filter "name=stress-test-" --format "{{.Names}}")
if [ -n "$RUNNING_CONTAINERS" ]; then
    echo "$RUNNING_CONTAINERS" | xargs -r docker stop
    echo -e "${GREEN}Stopped running containers${NC}"
else
    echo "No running containers to stop"
fi

# Remove all stress test containers
echo -e "\n${YELLOW}Removing all stress test containers...${NC}"
echo "$CONTAINERS" | xargs -r docker rm
echo -e "${GREEN}Removed $CONTAINER_COUNT containers${NC}"

# Optional: Show remaining containers
REMAINING=$(docker ps -a --filter "name=stress-test-" --format "{{.Names}}" | wc -l | tr -d ' ')
if [ "$REMAINING" -eq 0 ]; then
    echo -e "\n${GREEN}✓ All stress test containers cleaned up successfully!${NC}"
else
    echo -e "\n${RED}Warning: $REMAINING stress test containers still remain${NC}"
fi
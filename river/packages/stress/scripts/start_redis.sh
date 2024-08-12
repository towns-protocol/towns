#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

echo "stress/scripts/start_redis.sh"

# Specify the name or ID of the Docker container you want to stop
container_name="stress-redis"

# Check if the container is running
if docker ps --filter "name=$container_name" --format '{{.ID}}' | grep -qE "^[0-9a-f]+$"; then
  # The container is running, so stop it
  
  echo "Container $container_name is already running."
else
  echo "Starting $container_name."

  # write the environment variables to a file so the tests can load it
  FILE="./scripts/.env.storage"
  ENV_VAR="REDIS_HOST=http://localhost:6379"
  echo $ENV_VAR >> $FILE # hard coded port from the docker compose file 
  
  docker-compose -p "stress" -f ./scripts/docker_compose_redis.yml up
fi

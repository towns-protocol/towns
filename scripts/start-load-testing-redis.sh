#!/bin/bash

# Specify the name or ID of the Docker container you want to stop
container_name="bullmq-redis"

# Check if the container is running
if docker ps --filter "name=$container_name" --format '{{.ID}}' | grep -qE "^[0-9a-f]+$"; then
  # The container is running, so stop it
  docker stop "$container_name"
  echo "Container $container_name stopped."
else
  echo "Container $container_name is not running."
fi

docker-compose -p "load_testing" -f ./core/scripts/load-testing-docker-compose.yml up
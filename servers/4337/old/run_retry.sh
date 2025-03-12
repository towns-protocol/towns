#!/bin/sh

#!/bin/bash

# Start NGINX in the background
nginx


max_attempts=10
delay=1
attempt=1
success=false

while [ $attempt -le $max_attempts ]; do
  echo "Attempt $attempt of $max_attempts..."
  yarn run "$@"
  status=$?
  if [ $status -eq 0 ]; then
    echo "Deployment succeeded."
    success=true
    break
  else
    echo "Deployment failed with status $status. Retrying in $delay seconds..."
    attempt=$((attempt+1))
    sleep $delay
  fi
done

if [ "$success" = false ]; then
  echo "Deployment failed after $max_attempts attempts."
  exit 1
fi

# Add any post-success actions or messages here
echo "Post-deployment success message."

exit 0

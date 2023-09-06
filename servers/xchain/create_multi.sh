#!/bin/bash

# Number of instances
N=5

# Base directory for the instances
BASE_DIR="./"

# Loop to create N instances
for (( i=1; i<=N; i++ ))
do
  # Directory for this instance
  INSTANCE_DIR="${BASE_DIR}/instance_${i}"

  # Create the directory structure
  mkdir -p "${INSTANCE_DIR}/bin" "${INSTANCE_DIR}/logs" "${INSTANCE_DIR}/config" "${INSTANCE_DIR}/wallet"

  # Copy node binary
  cp "./bin/node" "${INSTANCE_DIR}/bin"

  # Substitute METRIC_PORT and create config.yaml
  METRICS_PORT=$((8080 + i))

  echo "Creating instance_${i} with METRICS_PORT=${METRICS_PORT}"
  sed "s/<METRICS_PORT>/${METRICS_PORT}/g" config-template.yaml > "${INSTANCE_DIR}/config/config.yaml"
  pushd "${INSTANCE_DIR}"
  # Run each process with 'generate_key' argument
  "./bin/node" genkey
  echo "Created instance_${i} with METRICS_PORT=${METRICS_PORT}"
  popd
done

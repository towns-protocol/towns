#!/bin/bash

set -e
set -u
set -o pipefail

# Default NODE_ENV to development if not set
export NODE_ENV=${NODE_ENV:-development}
echo "Using NODE_ENV=$NODE_ENV"

# Check if DB_HOST is set
if [ -z "${DB_HOST}" ]; then
  echo "DB_HOST is not set. Please set it to the database host."
  exit 1
fi

# Check if DB_PORT is set
if [ -z "${DB_PORT}" ]; then
  echo "DB_PORT is not set. Please set it to the database port."
  exit 1
fi

# Check if DB_USER is set
if [ -z "${DB_USER}" ]; then
  echo "DB_USER is not set. Please set it to the database user."
  exit 1
fi

# Check if DB_PASSWORD is set
if [ -z "${DB_PASSWORD}" ]; then
  echo "DB_PASSWORD is not set. Please set it to the database password."
  exit 1
fi

# Build the pg db url:
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres"

if [ "$NODE_ENV" = "development" ]; then
  echo "Starting Ponder in development mode"
  yarn ponder dev --config "${PONDER_CONFIG}"
else
  echo "Starting Ponder in production mode"
  yarn ponder start --config "${PONDER_CONFIG}"
fi

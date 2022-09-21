#!/usr/bin/env bash

# first we get the current directory, as we'll need to use it later
DENDRITE_DOCKER_COMPOSE_PATH="$(cd "$(dirname "$1")"; pwd)/$(basename "$1")"

# next we compute the dendrite server's path as we need to use a special GO script from within.
# TODO: once we remove dendrite out, we should either pull these scripts in here, or update the reference.
DENDRITE_PATH="$(cd "$(dirname "$1")"; cd ../dendrite; pwd)/$(basename "$1")"

# finally we create the paths of the keyfiles such that they end up in the docker-compose volume.
PRIVATE_KEY_FILE="$DENDRITE_DOCKER_COMPOSE_PATH/volumes/dendrite/config/matrix_key.pem"
TLS_CERT_FILE="$DENDRITE_DOCKER_COMPOSE_PATH/volumes/dendrite/config/server.crt"
TLS_KEY_FILE="$DENDRITE_DOCKER_COMPOSE_PATH/volumes/dendrite/config/server.key"

cd $DENDRITE_PATH
go run ./cmd/generate-keys \
  --private-key=$PRIVATE_KEY_FILE \
  --tls-cert=$TLS_CERT_FILE \
  --tls-key=$TLS_KEY_FILE
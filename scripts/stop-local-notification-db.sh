#!/bin/bash

### run from the notification directory
RUN_DIR=$(git rev-parse --show-toplevel)/servers/notification-service
pushd $RUN_DIR
docker compose down -v db
popd

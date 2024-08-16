#!/bin/bash

RUN_DIR=$(git rev-parse --show-toplevel)/river/packages/stream-metadata
pushd $RUN_DIR

cp ./.env.local.sample .env.local
yarn dev

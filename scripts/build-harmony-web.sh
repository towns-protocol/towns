#!/usr/bin/env bash
set -e
set -v

#
# Build script for render build job "harmony-web" https://dashboard.render.com/
#
# Render limits us to 8gb of memory for build jobs, so we need to set node limit
# to 3gb to avoid OOM errors.
export NODE_OPTIONS="--max-old-space-size=3072 --max_semi_space_size=128 --use-largepages=on"
export VITE_APP_RELEASE_VERSION=$RENDER_GIT_COMMIT

node -e 'import("v8").then( console.table(v8.getHeapStatistics()))'

yarn install
yarn harmonyweb:build
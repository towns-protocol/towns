#!/usr/bin/env bash
set -e
set -v

#
# Build script for render build job "harmony-web" https://dashboard.render.com/
#
# Render limits us to 8gb of memory for build jobs, so we need to set node limit
# to 6gb to avoid OOM errors.
export NODE_OPTIONS="--max-old-space-size=4096"
export VITE_APP_RELEASE_VERSION=$RENDER_GIT_COMMIT
yarn install
yarn workspace use-zion-client build
yarn workspace harmonyweb build
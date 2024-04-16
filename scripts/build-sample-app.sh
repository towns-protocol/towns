#!/usr/bin/env bash
set -e
set -v

#
# Build script for render build job "sample-app" https://dashboard.render.com/
#

export VITE_APP_RELEASE_VERSION=$RENDER_GIT_COMMIT
export NODE_OPTIONS="--max-old-space-size=32768 --max_semi_space_size=128 --use-largepages=on"

export PREVIEW_DOMAIN_SUFFIX="sample-app-preview.towns.com"

source ./scripts/setup-render-preview-environment/run.sh
yarn install
yarn sampleapp:build
#!/usr/bin/env bash
set -e
set -v

#
# Build script for render build job "harmony-web" https://dashboard.render.com/
#
export VITE_APP_RELEASE_VERSION=$RENDER_GIT_COMMIT
yarn install
yarn workspace use-zion-client build
yarn workspace harmonyweb build
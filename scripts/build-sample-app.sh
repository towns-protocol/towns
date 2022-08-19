#!/usr/bin/env bash
set -e
set -v

#
# Build script for render build job "sample-app" https://dashboard.render.com/
#

yarn install
yarn workspace use-zion-client build
yarn workspace sample-app build
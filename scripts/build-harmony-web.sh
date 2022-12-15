#!/usr/bin/env bash
set -e
set -v

#
# Build script for render build job "harmony-web" https://dashboard.render.com/
#
export NODE_OPTIONS=--max_old_space_size=32768
yarn install
yarn workspace use-zion-client build
yarn workspace harmonyweb build
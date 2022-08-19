#!/usr/bin/env bash
set -e
set -v

#
# Build script for render build job "harmony-web" https://dashboard.render.com/
#

yarn install
yarn workspace use-zion-client build
yarn workspace harmonyweb build
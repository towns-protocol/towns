#!/usr/bin/env bash
set -e
set -v

#
# Build script for render build job "towns-governance" https://dashboard.render.com/
#

cd clients/governance-ui 
yarn install
yarn build

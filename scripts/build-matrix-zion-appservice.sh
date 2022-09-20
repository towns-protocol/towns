#!/usr/bin/env bash
set -e
set -v

#
# Build script for servers/matrix-zion-appservice
#

yarn workspace matrix-zion-appservice install
yarn workspace matrix-zion-appservice build

#!/usr/bin/env bash

SCRIPT_DIR=$PWD

source ${SCRIPT_DIR}/servers/dendrite_local_test/vars.env

NODE_DIR="${TEST_DIR}/node0"

cd ${SCRIPT_DIR}/servers/matrix-zion-appservice/bin
node app.js \
  -c "config.yaml" \
  -u "http://localhost" \
  -p "6789" \
  -f "${NODE_DIR}/zion-appservice.yaml"

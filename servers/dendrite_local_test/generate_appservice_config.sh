#!/bin/bash -Eeu

set -e

#
# Deploy the zion appservice.
#

cd  $(dirname "$0")

source vars.env

SCRIPT_DIR=$PWD
NODE_DIR="${TEST_DIR}/node0/"
ZION_APPSERVICE_DIR="${SCRIPT_DIR}/../matrix-zion-appservice"

mkdir -p ${NODE_DIR}

echo "Generate the appservice config"
cp ${ZION_APPSERVICE_DIR}/zion-config-schema.yaml ${ZION_APPSERVICE_DIR}/bin
node ${ZION_APPSERVICE_DIR}/bin/app.js -r -f ${NODE_DIR}/zion-appservice.yaml -c ${ZION_APPSERVICE_DIR}/config.sample.yaml -u http://localhost:6789
cp ${ZION_APPSERVICE_DIR}/config.sample.yaml ${NODE_DIR}/config.yaml

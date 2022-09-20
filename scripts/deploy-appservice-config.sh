#!/bin/bash -Eeu

set -e

#
# Deploy the zion dendrite + appservice configs.
#

SCRIPT_DIR=$PWD

source ${SCRIPT_DIR}/servers/dendrite_local_test/vars.env

NODE_DIR="${TEST_DIR}/node0"

${SCRIPT_DIR}/scripts/build-matrix-zion-appservice.sh
${SCRIPT_DIR}/servers/dendrite_local_test/generate_appservice_config.sh
cp ${SCRIPT_DIR}/servers/dendrite_local_test/dendrite.with_appservice.yaml ${NODE_DIR}

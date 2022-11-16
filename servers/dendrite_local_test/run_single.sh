#!/bin/bash -Eeu

cd $(dirname "$0")

source vars.env

echo "Running from ${TEST_DIR}"

I=$1
DENDRITE_YAML="${2:-dendrite.yaml}"
ENABLE_AUTHZ="${3:-no-authz}"

SCRIPT_DIR=$PWD
NODE_DIR="${TEST_DIR}/node${I}"

if [ ${ENABLE_AUTHZ} == "with-authz" ]
then
  ENABLE_AUTHZ="--enable-authz"
else
  ENABLE_AUTHZ=""
fi

echo "Running node ${I} from ${NODE_DIR}"

cd ${NODE_DIR}
${SCRIPT_DIR}/../dendrite/bin/dendrite-monolith-server \
  --tls-cert server.crt \
  --tls-key server.key \
  --config ${DENDRITE_YAML} \
  --really-enable-open-registration \
  --http-bind-address ":$((8008 + $I))" \
  --https-bind-address ":$((8448 + $I))" \
  ${ENABLE_AUTHZ}

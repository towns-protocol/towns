#!/usr/bin/env bash

WITH_APPSERVICE="${1:-no}"

SCRIPT_DIR=$PWD

LOCAL_TEST_DIR=${SCRIPT_DIR}/servers/dendrite_local_test

pushd ${LOCAL_TEST_DIR}
./build.sh
./deploy.sh
popd

if [ ${WITH_APPSERVICE} == "with-appservice" ]
then
  ${SCRIPT_DIR}/scripts/deploy-appservice-config.sh
  cd ${LOCAL_TEST_DIR}
  ./run_single.sh 0 dendrite.with_appservice.yaml
else
   cd ${LOCAL_TEST_DIR}
  ./run_single.sh 0
fi


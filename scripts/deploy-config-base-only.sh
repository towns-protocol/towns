#!/bin/bash
set -euo pipefail

pushd river/packages/contracts
    mkdir -p ../generated/deployments/${RIVER_ENV}
    cp -r deployments/${RIVER_ENV} ../generated/deployments
popd

# Update the config
pushd river/packages/generated
    yarn make-config
popd

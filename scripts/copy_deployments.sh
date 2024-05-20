#!/bin/bash
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

RIVER_REPO=${RIVER_REPO:-"../river"}

cp -R ${RIVER_REPO}/packages/generated/deployments river/packages/generated && ./river/packages/generated/scripts/make-config.sh

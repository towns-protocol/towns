#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

rm -rf deployments
rsync -av --exclude='*/addresses/facets' ../contracts/deployments/ deployments/

# regenerate the config
./scripts/make-config.sh
#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

rm -rf deployments
rsync -av --exclude='*/addresses/facets' ../packages/contracts/deployments/ deployments/

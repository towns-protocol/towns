#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

rm -rf deployments
cp -r ../../contracts/deployments deployments
find deployments -type f -iname '*facet.json' -delete
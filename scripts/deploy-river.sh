#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

./scripts/wait-for-riverchain.sh
./scripts/deploy-river-registry.sh $@

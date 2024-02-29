#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

# Start contract build in background
pushd contracts
set -a
. .env.localhost
set +a
make build
popd

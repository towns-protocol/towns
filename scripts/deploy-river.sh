#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

./scripts/wait-for-riverchain.sh

#NOTE - river contracts are deployed when running the dev server, see run_impl.sh approx line 48

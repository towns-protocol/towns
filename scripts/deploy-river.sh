#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

./scripts/wait-for-riverchain.sh

# river chain deployed as part of node startup, see run_impl.sh line 54
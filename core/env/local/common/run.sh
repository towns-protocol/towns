#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# This file is copied into the run_files/${RUN_ENV} directory and then is executed from there.
cd 00
../bin/river_node --config ../common.yaml --config ../contracts.env --config ../config.yaml  "$@"

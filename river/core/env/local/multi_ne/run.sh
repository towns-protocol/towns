#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

source ./env.env

../../../run_files/${RUN_ENV}/run.sh "$@"

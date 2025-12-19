#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# No args script so it can be called from VSCode as custom go formatter
./fmt.sh --stdin
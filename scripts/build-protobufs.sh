#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"


pushd "$(git rev-parse --show-toplevel)"
echo "building protobufs"

# typescript: we need to build the protobufs and generate the river/proto package
yarn csb:build
popd

# golang
cd ../core/node
go generate -v -x protocol/gen.go

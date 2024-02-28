#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"


# build and run custom lint
LINT_EXTENSIONS_DIR="./run_files/lint_extensions"

mkdir -p "$LINT_EXTENSIONS_DIR"
pushd "$LINT_EXTENSIONS_DIR" > /dev/null
go build -o lintextensions ../../lint_extensions/lintextensions.go
popd > /dev/null

$LINT_EXTENSIONS_DIR/lintextensions -test=false ./...


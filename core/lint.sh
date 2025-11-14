#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo "golangci-lint"
go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.4.0 run

echo "lint_extensions.sh"
./node/lint_extensions.sh

echo "staticcheck"
go run honnef.co/go/tools/cmd/staticcheck@v0.6.1 ./...

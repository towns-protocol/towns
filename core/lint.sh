#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

./golangci-version-check.sh

echo "golangci-lint"
golangci-lint run

echo "lint_extensions.sh"
./node/lint_extensions.sh

echo "staticcheck"
go run honnef.co/go/tools/cmd/staticcheck@v0.6.1 ./...

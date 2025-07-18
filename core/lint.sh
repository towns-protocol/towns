#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo "golangci-lint"
go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.0.2 run

echo "staticcheck"
go run honnef.co/go/tools/cmd/staticcheck@v0.6.1 ./...

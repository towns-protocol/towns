#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

golangci-lint run

./node/lint_extensions.sh

staticcheck ./...
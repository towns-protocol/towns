#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

golangci-lint run

#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

cd ../node
go run --race ./node/main.go run $@

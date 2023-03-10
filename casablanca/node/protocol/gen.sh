#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

[ -n "$(go env GOBIN)" ] && PATH="$(go env GOBIN):${PATH}"
[ -n "$(go env GOPATH)" ] && PATH="$(go env GOPATH)/bin:${PATH}"

cp ../../packages/proto/protocol.proto .
buf generate --path protocol.proto
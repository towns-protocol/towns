#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

[ -n "$(go env GOBIN)" ] && PATH="$(go env GOBIN):${PATH}"
[ -n "$(go env GOPATH)" ] && PATH="$(go env GOPATH)/bin:${PATH}"

pushd ../../.. > /dev/null
buf generate --template core/node/protocol/buf.gen.yaml --path protocol/protocol.proto --path protocol/internode.proto
popd > /dev/null

cd ../protocol_extensions
go run main.go

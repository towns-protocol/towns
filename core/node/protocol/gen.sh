#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

[ -n "$(go env GOBIN)" ] && PATH="$(go env GOBIN):${PATH}"
[ -n "$(go env GOPATH)" ] && PATH="$(go env GOPATH)/bin:${PATH}"

KEEP_PROTO=false

# Use "-k" to keep protocol.proto to simplify development.
while getopts "k" opt; do
    case $opt in
        k)
        KEEP_PROTO=true
        ;;
        \?)
        echo "Invalid option: -$OPTARG" >&2
        exit 1
        ;;
    esac
done

cp ../../proto/protocol.proto .
buf generate --path protocol.proto --path internode.proto

if [ "$KEEP_PROTO" = false ]; then
    rm protocol.proto
fi

cd ../protocol_extensions
go run main.go

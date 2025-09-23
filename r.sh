#!/bin/bash

go run github.com/ethereum/go-ethereum/cmd/abigen@v1.16.2 \
        --v2 \
        --abi packages/contracts/out/IStreamRegistry.sol/IStreamRegistry.abi.json \
        --pkg "river" \
        --type "StreamRegistryV1" \
        --out "core/contracts/river/stream_registry_v1.go"
#!/bin/bash -ue

cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
protoc --go_out=. -I=../../mls/mls-tools/crates/protocol/proto mls_tools.proto

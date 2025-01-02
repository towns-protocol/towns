#!/bin/bash
set -euo pipefail

mkdir -p ./bin
cargo build --release --manifest-path ./core/mls/mls-tools/crates/mlslib/Cargo.toml
cp ./core/mls/mls-tools/target/release/libmls* ./core

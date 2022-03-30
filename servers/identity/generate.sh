#!/bin/bash
tmp_dir=$(mktemp -d -t ci-$(date +%Y-%m-%d-%H-%M-%S)-XXXXXXXXXX)
 
echo $tmp_dir

pushd ../../contracts/src
solc  --base-path . --include-path ../../node_modules  NodeManager.sol  --abi --bin --combined-json abi,bin |head -1   > $tmp_dir/NodeManager.json
popd
mkdir -p generated
abigen --combined-json=$tmp_dir/NodeManager.json --pkg=generated --out=generated/NodeManager.go
rm -rf $tmp_dir
#!/bin/bash
CHAIN="${1:-localhost}"
FROZEN="${2:-}"
ABI_DIR="packages/generated/${CHAIN}/newabis"
DENDRITE_DIR="servers/dendrite/towns/contracts/towns_${CHAIN}"

forge clean
forge build --extra-output-files metadata --extra-output-files abi

yarn typechain --target=ethers-v5 "packages/contracts/out/**/?(IDiamond|IDiamondCut|ITownArchitect|IProxyManager|IPausable|IEntitlements|IChannel|IRole|ITokenEntitlement|IERC721|Permissions).json" --out-dir "packages/generated/${CHAIN}/newtypings"

mkdir -p $ABI_DIR && cp -a packages/contracts/out/{IDiamond,IDiamondCut,ITownArchitect,IProxyManager,IPausable,IEntitlements,IChannel,IRole,ITokenEntitlement,IERC721,Permissions}.sol/* "packages/generated/${CHAIN}/newabis"

# Copy the json abis to TS files for type inference
for file in $ABI_DIR/*.abi.json; do
  filename=$(basename  "$file" .json)
  echo "export default $(cat $file) as const" > $ABI_DIR/$filename.ts
done

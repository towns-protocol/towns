#!/bin/bash

CHAIN="${1:-localhost}"

# TODO: get team feedback on removing this line for CI purposes

# TODO: should we .gitignore the generated typings?

# read -p "Enter a chain folder name or press enter: (default: localhost)" CHAIN

forge clean
forge build --extra-output-files metadata --extra-output-files abi --force

# Create typings using typechain
yarn typechain --target=ethers-v5 "out/**/?(CouncilNFT|CouncilStaking|ZionSpaceManager|ZionRoleManager|TokenEntitlementModule|UserGrantedEntitlementModule).json" --out-dir "packages/contracts/${CHAIN}/typings"

# Move abis to the packages folder
mkdir -p "packages/contracts/${CHAIN}/abis" && cp -a out/{CouncilNFT,CouncilStaking,ZionSpaceManager,ZionRoleManager,TokenEntitlementModule,UserGrantedEntitlementModule}.sol/* "packages/contracts/${CHAIN}/abis"

# Move typings to the dendrite folder
mkdir -p "servers/dendrite/zion_${CHAIN}" && go run github.com/ethereum/go-ethereum/cmd/abigen@v1.10.25 --abi out/ZionSpaceManager.sol/ZionSpaceManager.abi.json --pkg "zion_${CHAIN}"  --type "zion_space_manager_${CHAIN}" --out "servers/dendrite/zion/contracts/zion_${CHAIN}/zion_space_manager_${CHAIN}.go"

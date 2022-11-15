#!/bin/bash

DEFAULTPARAM="localhost"
read -p "Enter a chain folder name or press enter: (default: localhost)" CHAIN

forge clean
forge build --extra-output-files metadata --extra-output-files abi --force

# Create typings using typechain
yarn typechain --target=ethers-v5 "out/**/?(CouncilNFT|CouncilStaking|ZionSpaceManager|ZionRoleManager|TokenEntitlementModule|UserGrantedEntitlementModule).json" --out-dir "packages/contracts/${CHAIN:-$DEFAULTPARAM}/typings"

# Move abis to the packages folder
mkdir -p "packages/contracts/${CHAIN:-$DEFAULTPARAM}/abis" && cp -a out/{CouncilNFT,CouncilStaking,ZionSpaceManager,ZionRoleManager,TokenEntitlementModule,UserGrantedEntitlementModule}.sol/* "packages/contracts/${CHAIN:-$DEFAULTPARAM}/abis"

# Move typings to the dendrite folder
mkdir -p "servers/dendrite/zion_${CHAIN:-$DEFAULTPARAM}" && go run github.com/ethereum/go-ethereum/cmd/abigen@v1.10.25 --abi out/ZionSpaceManager.sol/ZionSpaceManager.abi.json --pkg "zion_${CHAIN:-$DEFAULTPARAM}"  --type "zion_space_manager_${CHAIN:-$DEFAULTPARAM}" --out "servers/dendrite/zion/contracts/zion_${CHAIN:-$DEFAULTPARAM}/zion_space_manager_${CHAIN:-$DEFAULTPARAM}.go"

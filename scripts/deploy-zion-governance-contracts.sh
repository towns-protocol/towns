#!/usr/bin/env bash
cd contracts/zion-governance
yarn clean
source .env
make deployLocalSpaceManager
make deployLocalCouncilNFT
cp -r ../../packages/contracts/localhost/addresses/ ../../servers/dendrite/zion/contracts/localhost/addresses/
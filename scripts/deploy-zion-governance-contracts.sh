#!/usr/bin/env bash
cd contracts/
yarn clean
source .env
make deployLocalSpaceManager
make deployLocalCouncilNFT
cp -r ../packages/contracts/localhost/addresses/ ../servers/dendrite/zion/contracts/zion_localhost/

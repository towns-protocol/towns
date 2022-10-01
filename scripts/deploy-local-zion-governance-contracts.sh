#!/usr/bin/env bash
cd contracts/zion-governance
yarn clean
source .env.localhost
make deployLocalSpaceManager
make deployLocalCouncilNFT

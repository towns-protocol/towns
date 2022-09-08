#!/usr/bin/env bash
cd contracts/zion-governance
yarn clean
source .env
make deployLocalSpaceManager
make deployLocalCouncilNFT

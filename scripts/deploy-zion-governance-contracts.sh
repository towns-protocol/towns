#!/usr/bin/env bash
cd contracts/zion-governance
forge build
source .env
make deployLocalSpaceManager
make deployLocalCouncilNFT
#!/usr/bin/env bash
cd contracts/zion-governance
forge build
source .env
forge script scripts/foundry/deploy-space-manager.s.sol --rpc-url $LOCAL_RPC_URL --private-key $LOCAL_PRIVATE_KEY --broadcast -vvvv

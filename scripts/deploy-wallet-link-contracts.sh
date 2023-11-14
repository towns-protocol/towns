#!/usr/bin/env bash
cd contracts/
# yarn clean
set -a
. .env.localhost
set +a
make deploy-anvil contract=DeployMultiInit
make deploy-anvil contract=DeployWalletLink

cd ../
cp packages/generated/localhost/addresses/walletLink.json casablanca/node/auth/contracts/localhost_wallet_link.json
cp packages/generated/base_goerli/addresses/walletLink.json casablanca/node/auth/contracts/base_goerli_wallet_link.json

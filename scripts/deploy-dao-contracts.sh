#!/usr/bin/env bash

cd contracts/
yarn clean
source .env.localhost

# TODO: We should add the rest of the DAO contracts when we're ready


# TODO: i'm pattern matching the following line via deploy-zion-governance-contracts.sh.
# is this the right way to do it, or are we overriding things?
# I think this line should be removed from both scripts,
cp -r ../packages/contracts/localhost/addresses/ ../servers/dendrite/zion/contracts/zion_localhost/

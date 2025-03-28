#!/bin/bash
set -euo pipefail

export RIVER_ENV=local_multi

pushd river/contracts
    set -a
    . .env.localhost
    set +a

    # see deploy-contracts.sh
    # Space Architect
    make clear-anvil-deployments context=$RIVER_ENV
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployBaseRegistry
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployProxyBatchDelegation
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTownsBase
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpace
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceOwner
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployUserEntitlement
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTieredLogPricingV2
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTieredLogPricingV3
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployFixedPricing
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceFactory
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployRiverAirdrop
    make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractPostDeploy
    make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractSetDefaultUriLocalhost
    make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractClaimCondition

    # Utils
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployMember
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployMockNFT
    make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployEntitlementGatedExample

    # Create destination directory if it doesn't exist
    mkdir -p ../packages/generated/deployments/${RIVER_ENV}
    
    cp -r deployments/${RIVER_ENV} ../packages/generated/deployments
popd

# Update the config
pushd river/packages/generated
    yarn make-config
popd
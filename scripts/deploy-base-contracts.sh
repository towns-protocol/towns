#!/bin/bash
set -euo pipefail

# Get the absolute path of the script directory and project root
SCRIPT_DIR="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT/packages/contracts"

# Space Architect
make clear-anvil-deployments context=$RIVER_ENV
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployBaseRegistry
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployProxyBatchDelegation
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTownsBase
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpace
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceOwner
make deploy-facet-local context=$RIVER_ENV rpc=base_anvil contract=UserEntitlement
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTieredLogPricingV2
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTieredLogPricingV3
make deploy-facet-local context=$RIVER_ENV rpc=base_anvil contract=FixedPricing
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceFactory
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployRiverAirdrop
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractPostDeploy
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractSetDefaultUriLocalhost
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractClaimCondition

# Utils
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployMember
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployMockNFT
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployEntitlementGatedExample 
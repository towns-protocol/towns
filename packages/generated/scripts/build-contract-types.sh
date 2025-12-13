#!/bin/bash
set -ueo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

# Contracts package is a sibling directory
CONTRACTS_DIR="../contracts"
ABI_DIR="./dev/abis"
TYPINGS_DIR="./dev/typings"

# Run forge build in contracts directory (needs foundry.toml)
(cd "$CONTRACTS_DIR" && forge build)

CONTRACT_INTERFACES="(IDiamond|IDiamondCut|IArchitect|Architect|ILegacyArchitect|MockLegacyArchitect|IProxyManager|IPausable|IEntitlementsManager|EntitlementsManager|IChannel|Channels|IRoles|Roles|IMulticall|IRuleEntitlement|IRuleEntitlementV2|IWalletLink|WalletLink|INodeRegistry|NodeRegistry|IOperatorRegistry|OperatorRegistry|IStreamRegistry|StreamRegistry|OwnableFacet|TokenPausableFacet|UserEntitlement|SpaceOwner|MockERC721A|MembershipFacet|IMembershipMetadata|Member|IBanning|IPricingModules|ICrossChainEntitlement|MockEntitlementGated|IERC721AQueryable|IEntitlementDataQueryable|PlatformRequirementsFacet|IERC721A|INodeOperator|ISpaceDelegation|IEntitlementChecker|IERC5267|ICreateSpace|IDropFacet|DropFacet|ITownsPoints|ITipping|IReview|ITreasury|ISwapRouter|ISwapFacet|IAppRegistry|IAppAccount|ISimpleApp|ITownsApp|Towns|RewardsDistributionV2|MainnetDelegation|GuardianFacet|SubscriptionModuleFacet|IAppInstaller|IAppFactory|IIdentityRegistry|IReputationRegistry)"

# Clean typings to avoid stale factories/interfaces lingering between runs
rm -rf "$TYPINGS_DIR"
bun run typechain --target=ethers-v5 "$CONTRACTS_DIR/out/**/?${CONTRACT_INTERFACES}.json" --out-dir "$TYPINGS_DIR"

# Clean abis to avoid stale abi files lingering between runs
rm -rf "$ABI_DIR"
mkdir -p "$ABI_DIR"
cp -a $CONTRACTS_DIR/out/{Diamond,DiamondCutFacet,Architect,MockLegacyArchitect,ProxyManager,IPausable,EntitlementsManager,Channels,Roles,IMulticall,OwnableFacet,WalletLink,MockWalletLink,NodeRegistry,OperatorRegistry,StreamRegistry,TokenPausableFacet,IRuleEntitlement,UserEntitlement,SpaceOwner,MockERC721A,MembershipFacet,IMembershipMetadata,Member,MockRiverRegistry,IBanning,IPricingModules,ICrossChainEntitlement,MockCrossChainEntitlement,MockEntitlementGated,IERC721AQueryable,IEntitlementDataQueryable,PlatformRequirementsFacet,IERC721A,INodeOperator,ISpaceDelegation,IEntitlementChecker,IEntitlementGated,IERC5267,ICreateSpace,DropFacet,ITownsPoints,ITipping,IReview,ITreasury,ISwapRouter,ISwapFacet,IAppRegistry,IAppAccount,ISimpleApp,ITownsApp,Towns,RewardsDistributionV2,MainnetDelegation,GuardianFacet,SubscriptionModuleFacet,IAppInstaller,IAppFactory,IIdentityRegistry,IReputationRegistry}.sol/*.abi.json "$ABI_DIR"

# Copy the json abis to TS files for type inference
for file in $ABI_DIR/*.abi.json; do
  filename=$(basename "$file" .json)
  echo "export default $(cat $file) as const" > $ABI_DIR/$filename.ts
done

# Generate contract hash for this artifact build
echo "Generating contract hash..."
SRC_HASH=$(git rev-parse HEAD:$CONTRACTS_DIR/src 2>/dev/null || echo "")
BUILD_SCRIPT_HASH=$(git rev-parse HEAD:./scripts/build-contract-types.sh 2>/dev/null || echo "")

if [ -n "$SRC_HASH" ] && [ -n "$BUILD_SCRIPT_HASH" ]; then
  CONTRACTS_HASH="$SRC_HASH:$BUILD_SCRIPT_HASH"
  echo "$CONTRACTS_HASH" > "./dev/.contracts-hash"
  echo "Contract hash: $CONTRACTS_HASH"
else
  echo "Warning: Failed to generate contract hash (not in git repo or src not found)"
fi

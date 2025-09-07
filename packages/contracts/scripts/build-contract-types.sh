 #!/bin/bash
set -ueo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

# Assume contracts and generated are siblings under the same parent directory
PARENT_DIR="$(dirname "$(pwd)")"
ABI_DIR="$PARENT_DIR/generated/dev/abis"
TYPINGS_DIR="$PARENT_DIR/generated/dev/typings"

forge build

CONTRACT_INTERFACES="(IDiamond|IDiamondCut|IArchitect|Architect|ILegacyArchitect|MockLegacyArchitect|IProxyManager|IPausable|IEntitlementsManager|EntitlementsManager|IChannel|Channels|IRoles|Roles|IMulticall|IRuleEntitlement|IRuleEntitlementV2|IWalletLink|WalletLink|INodeRegistry|NodeRegistry|IOperatorRegistry|OperatorRegistry|IStreamRegistry|StreamRegistry|OwnableFacet|TokenPausableFacet|UserEntitlement|SpaceOwner|MockERC721A|MembershipFacet|IMembershipMetadata|Member|IBanning|IPricingModules|ICrossChainEntitlement|MockEntitlementGated|PrepayFacet|IERC721AQueryable|IEntitlementDataQueryable|PlatformRequirementsFacet|IERC721A|INodeOperator|ISpaceDelegation|IEntitlementChecker|IERC5267|ICreateSpace|IDropFacet|DropFacet|ITownsPoints|ITipping|IReview|ITreasury|ISwapRouter|ISwapFacet|IAppRegistry|IAppAccount|SimpleApp|Towns|RewardsDistributionV2|MainnetDelegation|GuardianFacet)"

yarn typechain --target=ethers-v5 "out/**/?${CONTRACT_INTERFACES}.json" --out-dir "$TYPINGS_DIR"

mkdir -p "$ABI_DIR" && cp -a out/{Diamond,DiamondCutFacet,Architect,MockLegacyArchitect,ProxyManager,IPausable,EntitlementsManager,Channels,Roles,IMulticall,OwnableFacet,WalletLink,MockWalletLink,NodeRegistry,OperatorRegistry,StreamRegistry,TokenPausableFacet,IRuleEntitlement,UserEntitlement,SpaceOwner,MockERC721A,MembershipFacet,IMembershipMetadata,Member,MockRiverRegistry,IBanning,IPricingModules,ICrossChainEntitlement,MockCrossChainEntitlement,MockEntitlementGated,PrepayFacet,IERC721AQueryable,IEntitlementDataQueryable,PlatformRequirementsFacet,IERC721A,INodeOperator,ISpaceDelegation,IEntitlementChecker,IEntitlementGated,IERC5267,ICreateSpace,DropFacet,ITownsPoints,ITipping,IReview,ITreasury,ISwapRouter,ISwapFacet,IAppRegistry,IAppAccount,SimpleApp,Towns,RewardsDistributionV2,MainnetDelegation,GuardianFacet}.sol/*.abi.json "$ABI_DIR"

# Copy the json abis to TS files for type inference
for file in $ABI_DIR/*.abi.json; do
  filename=$(basename "$file" .json)
  echo "export default $(cat $file) as const" > $ABI_DIR/$filename.ts
done

# Generate contract hash for this artifact build
echo "Generating contract hash..."
CONTRACTS_HASH=$(git rev-parse HEAD:./src 2>/dev/null || echo "")

if [ -n "$CONTRACTS_HASH" ]; then
  echo "$CONTRACTS_HASH" > "$PARENT_DIR/generated/dev/.contracts-hash"
  echo "Contract hash: $CONTRACTS_HASH"
else
  echo "Warning: Failed to generate contract hash (not in git repo or src not found)"
fi

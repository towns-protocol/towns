 #!/bin/bash
set -ueo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

ABI_DIR="packages/generated/dev/abis"

yarn run -T turbo build --filter=@towns-protocol/contracts

CONTRACT_INTERFACES="(IDiamond|IDiamondCut|IArchitect|Architect|ILegacyArchitect|MockLegacyArchitect|IProxyManager|IPausable|IEntitlementsManager|EntitlementsManager|IChannel|Channels|IRoles|Roles|IMulticall|IRuleEntitlement|IRuleEntitlementV2|IWalletLink|WalletLink|INodeRegistry|NodeRegistry|IOperatorRegistry|OperatorRegistry|IStreamRegistry|StreamRegistry|OwnableFacet|TokenPausableFacet|UserEntitlement|SpaceOwner|MockERC721A|MembershipFacet|IMembershipMetadata|Member|IBanning|IPricingModules|ICrossChainEntitlement|MockEntitlementGated|PrepayFacet|IERC721AQueryable|IEntitlementDataQueryable|PlatformRequirementsFacet|IERC721A|INodeOperator|ISpaceDelegation|IEntitlementChecker|IERC5267|ICreateSpace|IDropFacet|DropFacet|ITownsPoints|ITipping|IReview|ITreasury|ISwapRouter|ISwapFacet|IAppRegistry|IAppAccount|SimpleApp|Towns|RewardsDistributionV2|MainnetDelegation|GuardianFacet)"

yarn typechain --target=ethers-v5 "packages/contracts/out/**/?${CONTRACT_INTERFACES}.json" --out-dir "packages/generated/dev/typings"

mkdir -p $ABI_DIR && cp -a packages/contracts/out/{Diamond,DiamondCutFacet,Architect,MockLegacyArchitect,ProxyManager,IPausable,EntitlementsManager,Channels,Roles,IMulticall,OwnableFacet,WalletLink,MockWalletLink,NodeRegistry,OperatorRegistry,StreamRegistry,TokenPausableFacet,IRuleEntitlement,UserEntitlement,SpaceOwner,MockERC721A,MembershipFacet,IMembershipMetadata,Member,MockRiverRegistry,IBanning,IPricingModules,ICrossChainEntitlement,MockCrossChainEntitlement,MockEntitlementGated,PrepayFacet,IERC721AQueryable,IEntitlementDataQueryable,PlatformRequirementsFacet,IERC721A,INodeOperator,ISpaceDelegation,IEntitlementChecker,IEntitlementGated,IERC5267,ICreateSpace,DropFacet,ITownsPoints,ITipping,IReview,ITreasury,ISwapRouter,ISwapFacet,IAppRegistry,IAppAccount,SimpleApp,Towns,RewardsDistributionV2,MainnetDelegation,GuardianFacet}.sol/* "$ABI_DIR"

# Copy the json abis to TS files for type inference
for file in $ABI_DIR/*.abi.json; do
  filename=$(basename  "$file" .json)
  echo "export default $(cat $file) as const" > $ABI_DIR/$filename.ts
done

./scripts/gen-river-node-bindings.sh

# Remove *.bin and *.json except *.abi.json
find $ABI_DIR -type f \( -name "*.bin" -o -name "*.json" ! -name "*.abi.json" \) -exec rm -f {} +

# Generate contract hash for this artifact build
echo "Generating contract hash..."
CONTRACTS_HASH=$(git rev-parse HEAD:packages/contracts/src)

if [ -n "$CONTRACTS_HASH" ]; then
  echo "$CONTRACTS_HASH" > "packages/generated/dev/.contracts-hash"
  echo "Contract hash: $CONTRACTS_HASH"
else
  echo "Warning: Failed to generate contract hash"
fi

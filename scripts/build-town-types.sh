#!/bin/bash
CHAIN="${1:-localhost}"
FROZEN="${2:-}"
ABI_DIR="packages/generated/${CHAIN}/v3/abis"

DENDRITE_DIR="servers/dendrite/towns/contracts"
DENDRITE_TOWNS_ARCHITECT_DIR="${DENDRITE_DIR}/${CHAIN}_towns_architect"
DENDRITE_TOWNS_CHANNELS_DIR="${DENDRITE_DIR}/${CHAIN}_towns_channels"
DENDRITE_TOWNS_ENTITLEMENTS_DIR="${DENDRITE_DIR}/${CHAIN}_towns_entitlements"
DENDRITE_TOWNS_PAUSABLE_DIR="${DENDRITE_DIR}/${CHAIN}_towns_pausable"
DENDRITE_TOWNS_WALLET_LINK_DIR="${DENDRITE_DIR}/${CHAIN}_towns_wallet_link"

RIVER_DIR="casablanca/node/auth/contracts"
RIVER_TOWNS_ARCHITECT_DIR="${RIVER_DIR}/${CHAIN}_towns_architect"
RIVER_TOWNS_CHANNELS_DIR="${RIVER_DIR}/${CHAIN}_towns_channels"
RIVER_TOWNS_ENTITLEMENTS_DIR="${RIVER_DIR}/${CHAIN}_towns_entitlements"
RIVER_TOWNS_PAUSABLE_DIR="${RIVER_DIR}/${CHAIN}_towns_pausable"

RIVER_TOWNS_DELEGATION_DIR="${RIVER_DIR}/${CHAIN}_towns_delegation"
RIVER_TOWNS_WALLET_LINK_DIR="${RIVER_DIR}/${CHAIN}_towns_wallet_link"

XCHAIN_DIR="servers/xchain/contracts"
XCHAIN_PACKAGE="_xchain"

#forge clean
forge build --extra-output-files metadata --extra-output-files abi

yarn typechain --target=ethers-v5 "contracts/out/**/?(IDiamond|IDiamondCut|ITownArchitect|IProxyManager|IPausable|IEntitlements|IChannel|IRoles|IMulticall|TokenEntitlement|IWalletLink|OwnableFacet|TokenPausableFacet|UserEntitlement|ITownOwner|MockERC721A).json" --out-dir "packages/generated/${CHAIN}/v3/typings"

mkdir -p $ABI_DIR && cp -a contracts/out/{Diamond,DiamondCutFacet,TownArchitect,ProxyManager,Pausable,Entitlements,Channels,Roles,Multicall,OwnableFacet,TokenEntitlement,WalletLink,TokenPausableFacet,UserEntitlement,TownOwner,MockERC721A}.sol/* "$ABI_DIR"

# Copy the json abis to TS files for type inference
for file in $ABI_DIR/*.abi.json; do
  filename=$(basename  "$file" .json)
  echo "export default $(cat $file) as const" > $ABI_DIR/$filename.ts
done

mkdir -p $DENDRITE_DIR $RIVER_DIR $XCHAIN_DIR
mkdir -p $DENDRITE_TOWNS_ARCHITECT_DIR $RIVER_TOWNS_ARCHITECT_DIR
mkdir -p $DENDRITE_TOWNS_CHANNELS_DIR $RIVER_TOWNS_CHANNELS_DIR
mkdir -p $DENDRITE_TOWNS_ENTITLEMENTS_DIR $RIVER_TOWNS_ENTITLEMENTS_DIR
mkdir -p $DENDRITE_TOWNS_PAUSABLE_DIR $RIVER_TOWNS_PAUSABLE_DIR
mkdir -p $DENDRITE_TOWNS_WALLET_LINK_DIR $RIVER_TOWNS_WALLET_LINK_DIR

# Town Architect typings
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/TownArchitect.sol/TownArchitect.abi.json --pkg "${CHAIN}_towns_architect" --type "${CHAIN}_towns_architect" --out "${DENDRITE_TOWNS_ARCHITECT_DIR}/${CHAIN}_towns_architect.go"
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/TownArchitect.sol/TownArchitect.abi.json --pkg "${CHAIN}_towns_architect" --type "${CHAIN}_towns_architect" --out "${RIVER_TOWNS_ARCHITECT_DIR}/${CHAIN}_towns_architect.go"
# Town Channels typings
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/Channels.sol/Channels.abi.json --pkg "${CHAIN}_towns_channels" --type "${CHAIN}_towns_channels" --out "${DENDRITE_TOWNS_CHANNELS_DIR}/${CHAIN}_towns_channels.go"
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/Channels.sol/Channels.abi.json --pkg "${CHAIN}_towns_channels" --type "${CHAIN}_towns_channels" --out "${RIVER_TOWNS_CHANNELS_DIR}/${CHAIN}_towns_channels.go"
# Town Entitlements typings
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/Entitlements.sol/Entitlements.abi.json --pkg "${CHAIN}_towns_entitlements" --type "${CHAIN}_towns_entitlements" --out "${DENDRITE_TOWNS_ENTITLEMENTS_DIR}/${CHAIN}_towns_entitlements.go"
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/Entitlements.sol/Entitlements.abi.json --pkg "${CHAIN}_towns_entitlements" --type "${CHAIN}_towns_entitlements" --out "${RIVER_TOWNS_ENTITLEMENTS_DIR}/${CHAIN}_towns_entitlements.go"
# Town Pausable typings
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/Pausable.sol/Pausable.abi.json --pkg "${CHAIN}_towns_pausable" --type "${CHAIN}_towns_pausable" --out "${DENDRITE_TOWNS_PAUSABLE_DIR}/${CHAIN}_towns_pausable.go"
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/Pausable.sol/Pausable.abi.json --pkg "${CHAIN}_towns_pausable" --type "${CHAIN}_towns_pausable" --out "${RIVER_TOWNS_PAUSABLE_DIR}/${CHAIN}_towns_pausable.go"
# Towns Delegation Registry
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/Delegation.sol/Delegation.abi.json --pkg "${CHAIN}_towns_delegation" --type "${CHAIN}_towns_delegation" --out "${DENDRITE_TOWNS_DELEGATION_DIR}/${CHAIN}_towns_delegation.go"
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/Delegation.sol/Delegation.abi.json --pkg "${CHAIN}_towns_delegation" --type "${CHAIN}_towns_delegation" --out "${RIVER_TOWNS_DELEGATION_DIR}/${CHAIN}_towns_delegation.go"
# XChain Entitlements typings
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/EntitlementChecker.sol/EntitlementChecker.abi.json --pkg "${CHAIN}${XCHAIN_PACKAGE}" --type "${CHAIN}EntitlementChecker" --out "${XCHAIN_DIR}/${CHAIN}_xchain_EntitlementChecker.go"
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/IEntitlementCheckerEvents.sol/IEntitlementCheckerEvents.abi.json --pkg "${CHAIN}${XCHAIN_PACKAGE}" --type "${CHAIN}IEntitlementCheckerEvents" --out "${XCHAIN_DIR}/${CHAIN}_xchain_IEntitlementCheckerEvents.go"
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/EntitlementGated.sol/EntitlementGated.abi.json --pkg "${CHAIN}${XCHAIN_PACKAGE}" --type "${CHAIN}EntitlementGated" --out "${XCHAIN_DIR}/${CHAIN}_xchain_EntitlementGated.go"
# Towns WalletLink Registry
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/WalletLink.sol/WalletLink.abi.json --pkg "${CHAIN}_towns_wallet_link" --type "${CHAIN}_towns_wallet_link" --out "${DENDRITE_TOWNS_WALLET_LINK_DIR}/${CHAIN}_towns_wallet_link.go"
go run github.com/ethereum/go-ethereum/cmd/abigen@v1.12.2 --abi contracts/out/WalletLink.sol/WalletLink.abi.json --pkg "${CHAIN}_towns_wallet_link" --type "${CHAIN}_towns_wallet_link" --out "${RIVER_TOWNS_WALLET_LINK_DIR}/${CHAIN}_towns_wallet_link.go"

# Using the $FROZEN flag and git diff, we can check if this script generates any new files
# under the $ABI_DIR or $DENDRITE_DIR directories.
if [ "$FROZEN" = "--frozen" ]; then
  if git diff --quiet --exit-code $ABI_DIR $DENDRITE_DIR; then
    echo "No new files generated by build-contract-types.sh"
  else
    echo "$(git diff -p $ABI_DIR $DENDRITE_DIR)"
    echo "Error: build-contract-types.sh generated new files with the --frozen flag. Please re-run ./scripts/build-contract-types.sh to re-generate the files and commit the changes."
    exit 1
  fi
fi

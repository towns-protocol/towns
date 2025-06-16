# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Towns Protocol smart contracts package implementing a blockchain-based space/channel management system using:

- **Language**: Solidity ^0.8.23-0.8.29
- **Framework**: Foundry
- **Architecture**: Diamond Pattern (EIP-2535) for upgradeability
- **Networks**: Base (L2), River (L2), Ethereum (L1)

## Essential Commands

### Development

```bash
# Build contracts
yarn build

# Run all tests (with 4096 fuzz runs)
yarn test

# Run specific test file
forge test --match-path test/path/to/Test.sol -vvv

# Run specific test function
forge test --match-test testFunctionName -vvv

# Generate gas snapshots
yarn snapshot

# Lint Solidity files
yarn lint

# Format code
yarn format

# Generate TypeScript types
yarn typings
```

### Deployment

```bash
# Deploy single facet to a testnet for diamond cut through governance
make deploy-facet contract={FacetName} context=gamma rpc=base_sepolia account=account-name password=password sender=sender

# Deploy single facet to mainnet for diamond cut through governance
make deploy-facet-ledger contract=MembershipFacet context=omega rpc=base sender=${sender} verifier=blockscout verifier-url=https://base-sepolia.blockscout.com/api hd_path=${ledger_hd_path}
```

## Architecture

### Diamond Pattern Structure

The project uses Diamond Pattern with facets for upgradeability:

- **Diamond.sol**: Central diamond proxy contract
- **Facets**: Individual feature implementations in `src/spaces/facets/`, `src/base/registry/facets/`
- **Libraries**: Shared storage and logic in `src/diamond/libraries/`

### Key Components

1. **Registry** (`src/base/registry/`): Core delegation and entitlement checking

   - Handles cross-chain delegation between L1 and L2
   - Manages rewards distribution
   - Implements role-based permissions

2. **Spaces** (`src/spaces/`): Space and channel management

   - Space creation and configuration
   - Channel operations
   - Permission hierarchies (owner > moderator > member)

3. **Tokens** (`src/tokens/`): Token management

   - Membership NFTs
   - Token bridging between chains
   - ERC20/ERC721 implementations

4. **Entitlements** (`src/spaces/entitlements/`): Rule-based access control

   - Logical operations (AND, OR, NOT)
   - Token-based rules
   - Cross-chain entitlement checking

5. **Airdrop** (`src/airdrop/`): Distribution mechanisms
   - Points system with streaks
   - Token drops
   - Signer-based authorization

## Testing Approach

- Unit tests in `test/unit/` for individual components
- Integration tests in `test/integration/` for multi-facet interactions
- Fork tests in `test/fork/` for mainnet state testing
- Use `forge test -vvv` for detailed output during debugging

## Key Patterns

1. **Storage**: Uses Diamond storage pattern with library-based storage slots
2. **Upgrades**: Add new facets or upgrade existing ones through DiamondCut
3. **Events**: Emit events for all state changes
4. **Errors**: Use custom errors (not require statements)
5. **Gas Optimization**: Follow patterns in existing code for efficient storage usage

## Environment Variables

- `PRIVATE_KEY`: Deployer private key for testnet deployments
- `BASE_SEPOLIA_RPC_URL`: Base Sepolia RPC endpoint
- `RIVER_TESTNET_RPC_URL`: River testnet RPC endpoint
- `ETHERSCAN_API_KEY`: For contract verification

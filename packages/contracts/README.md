# Towns Contracts

## Overview

This project is a blockchain-based space/channel management system with role-based access control and entitlements. It implements a complex permission system using smart contracts that allows for cross-chain rule validation and user management.

The system also supports cross-chain delegation between Ethereum L1 and Base L2, allowing users to stake tokens on L1 and have delegation benefits on L2. Node operators can receive delegations directly or via spaces, with rewards distributed based on stake amounts and time.

### The system allows for:

- Creation and management of spaces and channels
- Role-based access control with granular permissions
- Cross-chain entitlement validation
- User membership management
- Rule-based entitlements with logical operations
- Staking and rewards distribution for DAO participants and node operators
- Cross-chain delegation and governance mechanisms

## Tech Stack

- Solidity ^0.8.23
- OpenZeppelin Contracts
- Solady Contracts
- Diamond Pattern (EIP-2535) for upgradeable contracts
- Foundry for development and testing
- TypeScript for contract type generation

## Project Structure

- `src/airdrop/` - Token distribution mechanisms (drops, points, streaks, rules)
- `src/base/registry/` - Core registry, delegation, rewards, entitlement checking
  - `/facets/distribution/` - Staking and rewards distribution for DAO participants and node operators
  - `/facets/mainnet/` - Cross-chain delegation handling and message relaying
  - `/facets/delegation/` - Space-to-operator delegation management
  - `/facets/operator/` - Node operator registration and management
- `src/spaces/` - Space management, entitlements, permissions, cross-chain rules
- `src/factory/` - Factory contracts for space creation, deployment, wallet linking
- `src/utils/` - Utility libraries (currency, math, reverts, patterns)
- `src/diamond/` - Diamond pattern implementation, facets, upgradeability
- `src/tokens/` - Token management, membership NFTs, locks, bridging, inflation
- `scripts/diamonds` - Diamond deployment scripts

### Key Contracts

- `RuleEntitlement.sol` - Rule-based entitlements, cross-chain permission validation
- `EntitlementsManager.sol` - Entitlement validation and access control
- `Architect.sol` - Factory for space creation/initialization
- `CreateSpace.sol` - Space instance creation/initialization
- `Roles.sol` - Role-based permissions and hierarchies
- `Towns.sol` - Main ERC20 token (inflation, governance)
- `DropFacet.sol` - Token airdrops, claiming conditions
- `TownsPoints.sol` - Points-based rewards, check-ins, streaks
- `RewardsDistribution.sol` - Manages token staking, delegation proxies, and reward calculations
- `MainnetDelegation.sol` - Handles cross-chain delegation via cross-domain messengers
- `SpaceDelegationFacet.sol` - Manages delegation of spaces to node operators
- `EntitlementChecker.sol` - Cross-chain entitlement validation
- `DiamondCutFacet.sol` - Diamond upgradeability

## Requirements

Install [yarn](https://yarnpkg.com/getting-started/install) via corepack:

```shell
npm install -g corepack
corepack enable
```

Install [Foundry](https://github.com/foundry-rs/foundry):

```shell
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Project Setup

Clone the repo, then:

```shell
yarn
```

**To compile the smart contracts:**

```shell
forge build
```

**To run the solidity unit tests:**

```shell
forge test
```

You can add verbosity to the tests by adding `-vvvv` (1-4 levels) to the command.

## Local Development

**To start a local Ethereum blockchain:**

```shell
anvil
```

It will generate a set of 10 public/private keys with 10k ether each. Save one of these private keys for deployment.
It starts listening on `http://127.0.0.1:8545`.
If you want to interact with anvil via a front end, you will need to add the local network to Metamask with `ChainID=1337`.

**To start a local base blockchain and river blockchain:**

```shell
./scripts/bc-all-start.sh
```

## Deployment

### Local Deployment

**To deploy our contracts to your local base and river instances:**

1. Duplicate `.env.localhost` file in the [contracts](.) folder of the project and rename it to `.env` (this is excluded from git via .gitignore)
2. Run `export RIVER_ENV="local_multi"` from your terminal
3. Execute `./scripts/deploy-contracts.sh` to deploy the entire suite of contracts to your local base-anvil and river-anvil chains

### Diamond Contract Deployment

**To deploy a single diamond base contract to your local anvil instance:**

From within the `contracts/` folder you can run:

```shell
make deploy-base-anvil contract=Deploy[Contract] type=diamonds
```

Replace `[Contract]` with the contract you want to deploy. You can see all the contracts available for deployment in the [diamonds deployments directory](./scripts/deployments/diamonds).

### Facet Deployment

The project supports two methods for deploying facets:

1. **Using custom deployment scripts:**

   ```shell
   make deploy-base-anvil contract=Deploy[Facet] type=facets
   ```

   - Replace `[Facet]` with the name of your facet deployment script found in [./scripts/deployments/facets](./scripts/deployments/facets)
   - This approach uses scripts that inherit from `Deployer` and implement `versionName()` and `__deploy()` functions

2. **Using the standardized `DeployFacet` script:**

   ```shell
   make deploy-facet-local rpc=base_anvil contract=[FacetName]
   ```

   - Replace `[FacetName]` with the actual facet contract name (without "Deploy" prefix)
   - This approach uses the common `DeployFacet.s.sol` script with the `CONTRACT_NAME` environment variable
   - It leverages deterministic CREATE2 addresses and supports batch deployments
   - For more details, see the [DeployFacet documentation](https://github.com/towns-protocol/diamond/blob/main/scripts/README.md)

### Live Network Deployment

**To deploy facets to a live network:**

From within the `contracts/` folder you can run:

```shell
# For custom deployment scripts:
make deploy-base-sepolia contract=Deploy[Contract] type=facets context=[context]

# For standardized DeployFacet script:
make deploy-facet rpc=base_sepolia contract=[FacetName] context=[context]
```

For example, to deploy the WalletLink facet to Base Sepolia with a deployment context of "gamma":

```shell
# Using custom deployment script:
make deploy-base-sepolia contract=DeployWalletLink type=facets context=gamma

# Using standardized DeployFacet script:
make deploy-facet rpc=base_sepolia contract=WalletLink context=gamma
```

### Hardware Wallet Deployments

For hardware wallet deployments, use the corresponding ledger commands:

```shell
# Using custom deployment script:
make deploy-ledger-base-sepolia contract=DeployWalletLink type=facets context=gamma

# Using standardized DeployFacet script:
make deploy-facet-ledger rpc=base_sepolia contract=WalletLink context=gamma
```

You can see all the contracts available for deployment in the [deployments](./scripts/deployments) directory.

## Contributing

For detailed information on contributing to this project, please see our [CONTRIBUTING.md](CONTRIBUTING.md) file. It includes:

- Guidelines for opening issues and pull requests
- Coding standards and best practices
- Diamond Pattern implementation details
- Facet development guidelines

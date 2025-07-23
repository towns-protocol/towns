# CLAUDE.md - Towns Protocol Contracts

## Overview

You are working with the Towns Protocol smart contracts - a complex blockchain-based space/channel management system with role-based access control, entitlements, and cross-chain delegation mechanisms. This codebase implements a sophisticated permission system that allows for cross-chain rule validation, user management, and token distribution.

## Core Functionality

The system provides:

- Creation and management of spaces (communities) and channels
- Role-based access control with granular permissions
- Cross-chain entitlement validation between Ethereum L1 and Base L2
- User membership management with NFT-based membership tokens
- Rule-based entitlements with logical operations (AND/OR)
- Staking and rewards distribution for DAO participants and node operators
- Cross-chain delegation and governance mechanisms
- Token airdrops and points-based reward systems

## Technology Stack

- **Language**: Solidity ^0.8.23
- **Framework**: Foundry for development and testing
- **Architecture**: Diamond Pattern (EIP-2535) for upgradeability
- **Dependencies**: OpenZeppelin Contracts, Solady, PRB Math
- **Testing**: Forge test with fuzz testing
- **Networks**: Ethereum mainnet, Base, River (custom chain), and testnets

## Project Structure

```
src/
├── airdrop/           # Token distribution (drops, points, streaks, rules)
├── base/registry/     # Core registry, delegation, rewards, entitlement checking
│   └── facets/
│       ├── distribution/  # Staking and rewards for DAO participants
│       ├── mainnet/      # Cross-chain delegation handling
│       ├── delegation/   # Space-to-operator delegation
│       └── operator/     # Node operator registration
├── spaces/            # Space management, entitlements, permissions
│   └── facets/       # Diamond pattern facets for spaces
├── factory/          # Factory contracts for space creation
├── utils/            # Utility libraries
├── diamond/          # Diamond pattern implementation
├── tokens/           # Token management, NFTs, bridging
└── crosschain/       # Cross-chain functionality

scripts/
├── deployments/      # Deployment scripts
│   ├── diamonds/     # Diamond deployment scripts
│   └── facets/       # Facet deployment scripts
└── interactions/     # Interaction scripts

test/                 # Comprehensive test suite
```

## Key Contracts

### Core Infrastructure

- `Diamond.sol` - Main diamond proxy implementation
- `Architect.sol` - Factory for space creation/initialization
- `CreateSpace.sol` - Space instance creation/initialization
- `BaseRegistry.sol` - Central registry for base chain operations

### Permissions & Access Control

- `Roles.sol` - Role-based permissions and hierarchies
- `EntitlementsManager.sol` - Entitlement validation and access control
- `RuleEntitlement.sol` - Rule-based entitlements with cross-chain validation
- `EntitlementChecker.sol` - Cross-chain entitlement validation

### Token Management

- `Towns.sol` - Main ERC20 token with inflation mechanism
- `MembershipToken.sol` - NFT-based membership tokens
- `DropFacet.sol` - Token airdrops with claiming conditions
- `TownsPoints.sol` - Points-based rewards, check-ins, streaks

### Cross-chain & Delegation

- `RewardsDistribution.sol` - Token staking, delegation proxies, reward calculations
- `MainnetDelegation.sol` - Cross-chain delegation via cross-domain messengers
- `SpaceDelegationFacet.sol` - Space delegation to node operators

## Development Guidelines

### 1. Architecture Pattern - Diamond (EIP-2535)

All contracts follow the Diamond Pattern for upgradeability. When implementing features:

```solidity
// Storage Library - ALWAYS use diamond storage pattern
library FeatureStorage {
    bytes32 internal constant STORAGE_SLOT =
        keccak256("diamond.facets.feature.storage");

    struct Layout {
        // state variables here
    }

    function getLayout() internal pure returns (Layout storage ds) {
        assembly { ds.slot := STORAGE_SLOT }
    }
}

// Base Contract - internal logic
abstract contract FeatureBase {
    using FeatureStorage for FeatureStorage.Layout;

    function _internalLogic() internal {
        FeatureStorage.Layout storage $ = FeatureStorage.getLayout();
        // implementation
    }
}

// Facet Contract - external interface
contract FeatureFacet is FeatureBase, IFeature {
    function externalFunction() external {
        _internalLogic();
    }
}
```

### 2. Coding Standards

- **Visibility**: Always use explicit visibility modifiers
- **Access Control**: Use modifiers for permission checks
- **Events**: Emit events for state changes
- **Gas Optimization**:
  - Pack storage variables
  - Use `calldata` for external function arrays/strings
  - Cache storage reads
  - Use `unchecked` blocks where safe
  - Prefer `++i` over `i++` in loops
- **Security**:
  - Follow Checks-Effects-Interactions pattern
  - Use reentrancy guards where needed
  - Validate all inputs
  - Use safe math operations
- **Documentation**: NatSpec for all public/external functions

### 3. Testing Requirements

- Write comprehensive unit tests for all functionality
- Use fuzz testing for numeric inputs (default 4096 runs)
- Test permission and access control logic thoroughly
- Test cross-chain functionality with fork tests
- Test upgrade paths for diamond facets

### 4. Common Patterns

**Permission Checks**:

```solidity
modifier onlyOwner() {
    if (!_isOwner(msg.sender)) revert Unauthorized();
    _;
}

modifier hasPermission(string memory permission) {
    if (!_hasPermission(msg.sender, permission)) revert Unauthorized();
    _;
}
```

**Storage Access**:

```solidity
function _getData() internal view returns (uint256) {
  return FeatureStorage.getLayout().data;
}
```

**Event Emission**:

```solidity
event DataUpdated(address indexed user, uint256 newValue);

function updateData(uint256 value) external {
  // checks
  // effects
  emit DataUpdated(msg.sender, value);
  // interactions
}
```

## Build and Test Commands

```bash
# Install dependencies
yarn

# Build contracts
forge build
# or
yarn build

# Run tests
forge test --ffi --nmc Fork --fuzz-runs 4096
# or
yarn test

# Run specific test
forge test --match-test testFunctionName -vvvv

# Gas snapshot
forge snapshot --isolate

# Format code
yarn format

# Lint
yarn lint

# Generate TypeScript types
yarn typings
```

## Deployment

The project uses a sophisticated deployment system with support for multiple networks and deployment contexts (alpha, omega, etc.).

### Local Deployment

```bash
# Start local blockchain
anvil

# Deploy to local
make deploy-base-anvil contract=DeploySpace type=diamonds

# Deploy facet
make deploy-facet-local rpc=base_anvil contract=MembershipFacet
```

### Remote Deployment

```bash
# Deploy to testnet
make deploy-base-sepolia contract=DeploySpace type=diamonds context=alpha

# Deploy with hardware wallet
make deploy-ledger-base-sepolia contract=DeploySpace type=diamonds context=gamma
```

## Environment Variables

Key environment variables needed:

- `LOCAL_PRIVATE_KEY` - For local deployments
- `TESTNET_PRIVATE_KEY` - For testnet deployments
- `BASE_RPC_URL`, `BASE_ANVIL_RPC_URL`, etc. - RPC endpoints
- `BASESCAN_API_KEY` - For contract verification
- `HD_PATH`, `SENDER_ADDRESS` - For hardware wallet deployments

## Common Workflows

### 1. Adding a New Facet

1. Create storage library in `src/[module]/facets/[feature]/[Feature]Storage.sol`
2. Create base contract with internal logic in `[Feature]Base.sol`
3. Create facet contract with external functions in `[Feature]Facet.sol`
4. Create interface in `I[Feature].sol`
5. Add deployment script in `scripts/deployments/facets/Deploy[Feature].s.sol`
6. Write comprehensive tests in `test/[module]/[feature]/[Feature].t.sol`

### 2. Modifying Existing Facets

1. Make changes following the existing pattern
2. If adding storage, ensure no collision with existing slots
3. Update tests to cover new functionality
4. Deploy new facet version and use diamond cut to upgrade

### 3. Cross-chain Integration

1. Use `EntitlementChecker` for cross-chain permission validation
2. Implement `ICrossChainEntitlement` for custom cross-chain rules
3. Use proper chain IDs and cross-domain messenger contracts
4. Test with fork tests against actual deployed contracts

## Security Considerations

1. **Reentrancy**: Always use reentrancy guards for external calls
2. **Access Control**: Verify permissions at every entry point
3. **Input Validation**: Validate all external inputs
4. **Upgrades**: Follow diamond upgrade best practices
5. **Cross-chain**: Validate message authenticity and handle failures

## Debugging Tips

1. Use `-vvvv` flag with forge test for detailed traces
2. Check storage slot collisions if unexpected behavior
3. Verify facet selectors are correctly mapped in diamond
4. Use `forge debug` for step-by-step execution
5. Check events for state changes

## Resources

- [Diamond Standard (EIP-2535)](https://eips.ethereum.org/EIPS/eip-2535)
- [Foundry Documentation](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Solady Contracts](https://vectorized.github.io/solady)

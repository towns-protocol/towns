# Contribution Guidelines

Thank you for your interest in contributing to the Towns Protocol! The contracts in this repository implement a blockchain-based space/channel management system with role-based access control, entitlements, and cross-chain delegation mechanisms. We appreciate any kind of contribution, no matter how small.

If you need to contact the repository maintainers, please reach out on [Towns](https://www.towns.com/)!

## Types of Contributing

There are many ways to contribute:

1. **Opening an issue.** Before opening an issue, please check that there is not an issue already open. If there is, feel free to comment more details, explanations, or examples within the open issue rather than duplicating it.
2. **Resolving an issue.** You can resolve an issue either by showing that it is not an issue or by fixing the issue with code changes, additional tests, etc. Any pull request fixing an issue should reference that issue.
3. **Reviewing open PRs.** You can provide comments, standards guidance, naming suggestions, gas optimizations, or ideas for alternative designs on any open pull request.

## Opening an Issue

When opening an issue, please provide a concise problem statement and check that a similar request is not already open or in progress. For bug reports, you should be able to reproduce the bug through tests or proof of concept implementations. For feature improvements, please explain the use case and how your proposed change would address it.

Feel free to tag the issue as a "good first issue" for any clean-up related issues or small scoped changes to help encourage pull requests from first-time contributors!

## Opening a Pull Request

All pull requests should be opened against the `main` branch. In the pull request, please reference the issue you are fixing.

**For larger, more substantial changes to the code, it is best to open an issue and start a discussion with the maintainers before spending time on the development.**

Before opening a pull request please:

- Check that the code style follows the [standards](#standards) outlined in the [contracts.mdc](.cursor/rules/contracts.mdc) file
- Run the tests and ensure they pass
- Document any new functions, structs, or interfaces following the NatSpec standard
- Add tests! For smaller contributions, they should be tested with unit tests and fuzz tests where possible. For larger contributions, they should be tested with integration tests and invariant tests where applicable
- Make sure all commits are [signed](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)

## Standards

All contributions must follow the standards outlined in our [contracts.mdc](.cursor/rules/contracts.mdc) file. These include:

1. All contracts should follow the Diamond Pattern ([EIP-2535](https://github.com/ethereum/ercs/blob/master/ERCS/erc-2535.md)) for upgradeability
2. Use explicit visibility modifiers for all functions and state variables
3. Implement proper access control using modifiers
4. Follow gas optimization best practices
5. Use events for important state changes
6. Implement proper input validation
7. Follow semantic versioning for contract upgrades
8. Use calldata in external function argument definitions when possible
9. Prefer clear/descriptive names over excessive comments
10. Use the diamond storage pattern for all state variables
11. Use NatSpec for all public/external functions

## Diamond Pattern Implementation & Facet Development

The Towns Protocol uses the Diamond Pattern ([EIP-2535](https://github.com/ethereum/ercs/blob/master/ERCS/erc-2535.md)) for contract upgradeability. When contributing new features or modifying existing ones, follow these guidelines:

### Architecture Overview

A typical facet in this codebase is split into several files for clarity and upgrade safety:

- **Storage Library**: Handles diamond storage slot and layout
- **Base Contract**: Implements internal logic and interacts with storage
- **Facet Contract**: Exposes external/protected functions and inherits the base
- **Interfaces**: Define external APIs

### Implementation Guidelines

1. **Use diamond storage pattern** to avoid collisions between facets
2. **Split implementation** into the component parts (Storage, Base, Facet, Interfaces)
3. **Place business logic** in the base contract
4. **Expose only protected/external calls** in the facet contract
5. **Use meaningful naming conventions** that clearly indicate the role of each component

### Example: Votes Facet Implementation

```solidity
// Storage Library
library VotesStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("diamond.facets.governance.votes.storage");

  struct Layout {
    mapping(address => address) _delegation;
    mapping(address => Checkpoints.Trace224) _delegateCheckpoints;
    Checkpoints.Trace224 _totalCheckpoints;
  }

  function layout() internal pure returns (Layout storage db) {
    assembly {
      db.slot := STORAGE_SLOT
    }
  }
}

// Base Contract
abstract contract VotesBase {
  using VotesStorage for VotesStorage.Layout;
  function _getVotes(address account) internal view returns (uint256) {
    return VotesStorage.layout()._delegateCheckpoints[account].latest();
  }
  // ... more internal logic ...
}

// Facet Contract
abstract contract Votes is VotesBase, IERC5805 {
  function getVotes(address account) public view virtual returns (uint256) {
    return _getVotes(account);
  }
  // ... external functions ...
}
```

## Setup

For project setup, compilation, testing, and deployment instructions, please refer to the [README.md](README.md). This includes:

- Installing dependencies
- Compiling contracts
- Running tests
- Deploying contracts to local and live networks

## Deployment

For details on deploying contracts, please refer to the Deployment section in the [README.md](README.md).

## Code of Conduct

Above all else, please be respectful of the people behind the code. Any kind of aggressive or disrespectful comments, issues, and language will be removed.

Issues and PRs that are obviously spam and unhelpful to the development process will also be closed.

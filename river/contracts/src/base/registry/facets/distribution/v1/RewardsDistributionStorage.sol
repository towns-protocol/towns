// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library RewardsDistributionStorage {
  // keccak256(abi.encode(uint256(keccak256("facets.registry.rewards.distribution.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x3aada9ab9895514d3d0ef2741e3ec98f1d47c16f2d989bcb69404f24fbcef700;

  struct Layout {
    mapping(address operator => uint256) distributionByOperator;
    mapping(address delegator => uint256) distributionByDelegator;
    mapping(address operator => address[]) delegatorsByOperator;
    uint256 periodDistributionAmount;
    uint256 activePeriodLength;
    address withdrawalRecipient;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}

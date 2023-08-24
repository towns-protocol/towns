// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library GuardianStorage {
  bytes32 constant STORAGE_POSITION =
    keccak256("towns.facets.guardian.GuardianStorage");

  struct Layout {
    uint256 defaultCooldown;
    mapping(address => uint256) cooldownByAddress;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_POSITION;
    assembly {
      l.slot := slot
    }
  }
}

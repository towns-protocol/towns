// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library LockStorage {
  bytes32 constant STORAGE_POSITION = keccak256("river.tokens.lock.storage");

  struct Layout {
    uint256 defaultCooldown;
    mapping(address => bool) enabledByAddress;
    mapping(address => uint256) cooldownByAddress;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_POSITION;
    assembly {
      l.slot := slot
    }
  }
}

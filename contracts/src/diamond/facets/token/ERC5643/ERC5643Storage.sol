// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library ERC5643Storage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.contracts.storage.ERC5643");

  struct Layout {
    mapping(uint256 => uint64) expiration;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

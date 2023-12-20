// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library OwnableStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.diamond.facets.ownable.OwnableStorage");

  struct Layout {
    address owner;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

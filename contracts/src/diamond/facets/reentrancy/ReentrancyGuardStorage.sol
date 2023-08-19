// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts

library ReentrancyGuardStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.diamond.facets.reentrancy.ReentrancyGuardStorage");

  struct Layout {
    uint256 status;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

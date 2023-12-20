// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library PausableStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.diamond.facets.pausable.PausableStorage");

  struct Layout {
    bool paused;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

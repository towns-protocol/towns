// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library PausableStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.pausable.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xe17a067c7963a59b6dfd65d33b053fdbea1c56500e2aae4f976d9eda4da9eb00;

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

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts

library InitializableStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("diamond.facets.initializable.InitializableStorage");

  struct Layout {
    uint32 version;
    bool initializing;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}

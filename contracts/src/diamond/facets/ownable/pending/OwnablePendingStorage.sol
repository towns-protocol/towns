// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library OwnablePendingStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.diamond.facets.ownable.pending.OwnablePendingStorage");

  struct Layout {
    address pendingOwner;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

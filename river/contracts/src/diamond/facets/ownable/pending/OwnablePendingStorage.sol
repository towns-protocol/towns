// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library OwnablePendingStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.ownable.pending.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x6c1b261d2ef21579aeb8f6bf0f17e1908e6119044b67c3394f43735174947b00;

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

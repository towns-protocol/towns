// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library ERC20MetadataStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("diamond.facets.token.ERC20MetadataStorage");

  struct Layout {
    string name;
    string symbol;
    uint8 decimals;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

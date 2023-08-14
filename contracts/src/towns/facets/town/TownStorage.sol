// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library TownStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.facets.town.TownStorage");

  struct Layout {
    string networkId;
    uint256 createdAt;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

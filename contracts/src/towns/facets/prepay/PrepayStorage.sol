// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library PrepayStorage {
  bytes32 constant STORAGE_SLOT =
    keccak256("towns.facets.prepay.PrepayStorage");

  struct Layout {
    mapping(address => uint256) supplyByAddress;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

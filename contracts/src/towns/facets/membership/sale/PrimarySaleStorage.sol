// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library PrimarySaleStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.facets.membership.sale.storage");

  struct Layout {
    address primarySaleRecipient;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

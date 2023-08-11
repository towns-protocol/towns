// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library ERC2771RecipientStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("diamond.facets.recipient.ERC2771Recipient");

  struct Layout {
    mapping(address => bool) trustedForwarders;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

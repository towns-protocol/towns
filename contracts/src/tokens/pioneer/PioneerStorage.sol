// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library PioneerStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("tokens.pioneer.PioneerStorage");

  struct Layout {
    uint256 mintReward;
    string baseUri;
    mapping(address => bool) allowed;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

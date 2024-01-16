// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library BanningStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("facets.banning.BanningStorage");

  struct Storage {
    mapping(uint256 => bool) banned;
    mapping(string => mapping(uint256 => bool)) bannedByChannel;
  }

  function layout() internal pure returns (Storage storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}

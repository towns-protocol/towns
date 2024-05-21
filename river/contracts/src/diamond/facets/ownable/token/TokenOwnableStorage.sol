// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library TokenOwnableStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.ownable.token.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xd2f24d4f172e4e84e48e7c4125b6e904c29e5eba33ad4938fee51dd5dbd4b600;

  struct Layout {
    address collection;
    uint256 tokenId;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

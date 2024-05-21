// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library OwnableStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.ownable.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae300;

  struct Layout {
    address owner;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

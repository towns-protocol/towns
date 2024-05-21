// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library ReentrancyGuardStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.reentrancy.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x54f22f54f370bd020e00ee80e1a5099a71652e2ccbcf6a75281e4c70a3e11a00;

  struct Layout {
    uint256 status;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

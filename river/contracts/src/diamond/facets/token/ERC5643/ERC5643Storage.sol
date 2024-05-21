// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library ERC5643Storage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.token.ERC5643.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x4775a23600034fdd9f073b224f794d51a58b35ba663a9602623ba7a5c09cce00;

  struct Layout {
    mapping(uint256 => uint64) expiration;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

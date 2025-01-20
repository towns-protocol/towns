// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library AuthorizedClaimerStorage {
  // keccak256(abi.encode(uint256(keccak256("facets.authorized.claimer.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x5c7ae9c5b9b0882e9774077e2c97d13a2ab9f337fdc777b0f495e367ced70e00;

  struct Layout {
    mapping(address => address) authorizedClaimers;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}

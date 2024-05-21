// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library FixedPricingStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.membership.pricing.fixed.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xd905de679d8ee984e33da0498883a319db2532b35c6b45e3d77ada3832c5b000;

  struct Layout {
    mapping(address => uint256) priceBySpace;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

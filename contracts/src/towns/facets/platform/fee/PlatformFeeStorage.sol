// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts

library PlatformFeeStorage {
  bytes32 internal constant PLATFORM_FEE_STORAGE_POSITION =
    keccak256("towns.facets.platform.fee.storage");

  struct Layout {
    address recipient;
    uint16 basisPoints;
    uint256 flatFee;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 position = PLATFORM_FEE_STORAGE_POSITION;
    assembly {
      l.slot := position
    }
  }
}

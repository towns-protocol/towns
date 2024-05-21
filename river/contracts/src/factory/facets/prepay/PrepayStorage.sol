// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library PrepayStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.prepay.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0x097b4f25b64e012d0cf55f67e9b34fe5d57f15b11b95baa4ddd136b424967c00;

  struct Layout {
    mapping(address => uint256) supplyByAddress;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library GuardianStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.guardian.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_POSITION =
    0x0c89d3aad1b583c77a2e9f9fffa651b386c9c29e300bf2a8e2f3de1bb0100a00;

  struct Layout {
    uint256 defaultCooldown;
    mapping(address => uint256) cooldownByAddress;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_POSITION;
    assembly {
      l.slot := slot
    }
  }
}

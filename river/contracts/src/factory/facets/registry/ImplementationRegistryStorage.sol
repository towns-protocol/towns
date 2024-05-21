// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library ImplementationRegistryStorage {
  // keccak256(abi.encode(uint256(keccak256("factory.facets.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x31d1d65d94f3e9d7ffc7a93cc3bd1ee24d47f432e2c4fc10a5d92f8e2dd98900;

  struct Layout {
    mapping(address => bool) approved;
    mapping(bytes32 => uint32) currentVersion;
    mapping(bytes32 => mapping(uint32 => address)) implementation;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

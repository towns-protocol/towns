// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library ProxyManagerStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.proxy.manager.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x249d779ca269721f3d722925685859148db22a7b52f28bf3e74c7625696a0a00;

  struct Layout {
    address implementation;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

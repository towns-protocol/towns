// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library ManagedProxyStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.managed.proxy.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x9c16cba5b9f2fcbd952b38bec34079e93cbe107475c15fc20705f4e704198a00;

  struct Layout {
    address manager;
    bytes4 managerSelector;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

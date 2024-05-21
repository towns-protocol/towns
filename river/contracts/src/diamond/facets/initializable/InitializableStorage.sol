// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library InitializableStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.initializable.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef52000;

  struct Layout {
    uint32 version;
    bool initializing;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}

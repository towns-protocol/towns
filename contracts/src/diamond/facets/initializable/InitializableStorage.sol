// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts

library InitializableStorage {
  bytes32 internal constant _INITIALIZABLE_SLOT =
    keccak256("towns.contracts.diamond.Initializable");

  struct Layout {
    uint32 version;
    bool initializing;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 position = _INITIALIZABLE_SLOT;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      s.slot := position
    }
  }
}

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library TownProxyStorage {
  // solhint-disable-next-line private-vars-leading-underscore
  bytes32 internal constant SLOT_POSITION =
    keccak256("towns.contracts.storage.TownProxy");

  struct Layout {
    string networkId;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 position = SLOT_POSITION;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      ds.slot := position
    }
  }
}

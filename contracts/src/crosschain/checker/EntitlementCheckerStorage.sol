// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";

// contracts

library EntitlementCheckerStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("crosschain.EntitlementCheckerStorage");

  struct Layout {
    EnumerableSet.AddressSet nodes;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

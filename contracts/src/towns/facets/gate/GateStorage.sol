// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library GateStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.contracts.storage.Gate");

  struct Layout {
    EnumerableSet.AddressSet tokens;
    mapping(address => uint256) quantityByToken;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

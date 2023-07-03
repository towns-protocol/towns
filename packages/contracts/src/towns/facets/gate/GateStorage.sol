// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library GateStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.contracts.storage.Gate");

  struct Gating {
    address token;
    uint256 quantity;
  }

  struct Layout {
    EnumerableSet.AddressSet tokens;
    mapping(address => Gating) allowedTokens;
  }

  function gateStorage() internal pure returns (Layout storage layout) {
    bytes32 position = STORAGE_SLOT;
    assembly {
      layout.slot := position
    }
  }
}

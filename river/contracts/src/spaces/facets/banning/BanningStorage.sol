// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library BanningStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("river.spaces.banning.storage");

  struct Layout {
    EnumerableSet.UintSet bannedIds;
    mapping(uint256 => bool) bannedFromSpace;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}

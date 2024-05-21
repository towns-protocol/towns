// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library BanningStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.banning.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x49daf035076c43671ca9f9fb568d931e51ab7f9098a5a694781b45341112cf00;

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

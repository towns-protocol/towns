// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITownOwnerBase} from "./ITownOwner.sol";

// libraries

// contracts

library TownOwnerStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.facets.owner.TownOwnerStorage");

  struct Layout {
    address factory;
    mapping(uint256 => address) townByTokenId;
    mapping(address => ITownOwnerBase.Town) townByAddress;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

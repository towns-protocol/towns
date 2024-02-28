// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ISpaceOwnerBase} from "./ISpaceOwner.sol";

// libraries

// contracts

library SpaceOwnerStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("river.spaces.facets.owner.storage");

  struct Layout {
    address factory;
    mapping(uint256 => address) spaceByTokenId;
    mapping(address => ISpaceOwnerBase.Space) spaceByAddress;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

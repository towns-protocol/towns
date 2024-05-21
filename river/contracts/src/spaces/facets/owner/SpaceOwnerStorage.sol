// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceOwnerBase} from "./ISpaceOwner.sol";

// libraries

// contracts

library SpaceOwnerStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.owner.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x7fc24c9500f4388b797f8975c0991ad4ffd0338c2cbf5335b2bf5b7fe5747700;

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

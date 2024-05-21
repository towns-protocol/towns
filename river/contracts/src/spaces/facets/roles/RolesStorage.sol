// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";

// contracts

library RolesStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.roles.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd00;

  struct Role {
    string name;
    bool isImmutable;
    StringSet.Set permissions;
    EnumerableSet.AddressSet entitlements;
  }

  struct Layout {
    uint256 roleCount;
    EnumerableSet.UintSet roles;
    mapping(uint256 roleId => Role) roleById;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

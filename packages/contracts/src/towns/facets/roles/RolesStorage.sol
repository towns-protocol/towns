// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";

// contracts

library RolesStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.contracts.storage.Roles");

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
    bytes32 position = STORAGE_SLOT;
    assembly {
      ds.slot := position
    }
  }
}

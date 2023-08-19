// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library MockEntitlementStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.contracts.storage.MockEntitlement");

  struct Entitlement {
    uint256 roleId;
    bytes data;
  }

  struct Layout {
    mapping(bytes32 => Entitlement) entitlementsById;
    mapping(uint256 => EnumerableSet.Bytes32Set) entitlementIdsByRoleId;
    EnumerableSet.Bytes32Set entitlementIds;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

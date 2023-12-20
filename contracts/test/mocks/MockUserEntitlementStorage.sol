// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library MockUserEntitlementStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.contracts.storage.MockEntitlement");

  struct Entitlement {
    uint256 roleId;
    bytes data;
  }

  struct Layout {
    mapping(bytes32 entitlementId => Entitlement) entitlementsById;
    mapping(uint256 roleId => EnumerableSet.Bytes32Set) entitlementIdsByRoleId;
    mapping(string channelId => EnumerableSet.UintSet) roleIdsByChannelId;
    EnumerableSet.Bytes32Set entitlementIds;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

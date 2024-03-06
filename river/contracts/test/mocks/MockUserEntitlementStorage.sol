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
    address[] users;
  }

  struct Layout {
    mapping(uint256 => Entitlement) entitlementsByRoleId;
    mapping(address => uint256[]) roleIdsByUser;
    EnumerableSet.UintSet allEntitlementRoleIds;
    mapping(string channelId => EnumerableSet.UintSet) roleIdsByChannelId;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

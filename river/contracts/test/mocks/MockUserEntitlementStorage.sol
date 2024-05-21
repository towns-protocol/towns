// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library MockUserEntitlementStorage {
  // keccak256(abi.encode(uint256(keccak256("mock.user.entitlement.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x045054bc32f63ca45ac0a6e49d4170a95e9d351982702d2827dead877b98f600;

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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library MockEntitlementStorage {
  // keccak256(abi.encode(uint256(keccak256("mock.entitlement.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xe80852f529593030a811f08d923090f511bc4a2fa15e111008a63168c35a7800;

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

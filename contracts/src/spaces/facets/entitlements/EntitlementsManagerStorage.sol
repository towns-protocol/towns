// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";

// contracts

library EntitlementsManagerStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.contracts.storage.Entitlement");

  struct Entitlement {
    IEntitlement entitlement;
    bool isImmutable;
    bool isCrosschain;
  }

  struct Layout {
    mapping(address => Entitlement) entitlementByAddress;
    EnumerableSet.AddressSet entitlements;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

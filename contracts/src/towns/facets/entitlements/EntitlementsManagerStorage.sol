// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";

// contracts

library EntitlementsManagerStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.contracts.storage.Entitlement");

  struct Entitlement {
    address entitlement;
    bool isImmutable;
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

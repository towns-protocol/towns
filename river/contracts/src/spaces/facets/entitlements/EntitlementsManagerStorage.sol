// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library EntitlementsManagerStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.entitlements.manager.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xa558e822bd359dacbe30f0da89cbfde5f95895b441e13a4864caec1423c93100;

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

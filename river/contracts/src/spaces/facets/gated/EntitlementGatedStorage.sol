// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGatedBase} from "./IEntitlementGated.sol";
import {IEntitlementChecker} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";

// libraries

// contracts

library EntitlementGatedStorage {
  // keccak256(abi.encode(uint256(keccak256("facets.entitlement.gated.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00;

  struct Layout {
    IEntitlementChecker entitlementChecker;
    mapping(bytes32 => IEntitlementGatedBase.Transaction) transactions;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

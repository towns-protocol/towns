// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGatedBase} from "./IEntitlementGated.sol";

// libraries

// contracts

library EntitlementGatedStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("crosschain.EntitlementGatedStorage");

  struct Layout {
    mapping(bytes32 => IEntitlementGatedBase.Transaction) transactions;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

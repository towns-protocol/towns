// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase} from "./IMainnetDelegation.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library MainnetDelegationStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("river.tokens.river.base.delegation.storage");

  struct Layout {
    mapping(address operator => EnumerableSet.AddressSet) delegatorsByOperator;
    mapping(address delegator => IMainnetDelegationBase.Delegation delegation) delegationByDelegator;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}

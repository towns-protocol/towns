// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeOperatorBase} from "./INodeOperator.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library NodeOperatorStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("river.node.operator.storage");

  struct Layout {
    mapping(address => INodeOperatorBase.NodeOperator) operatorByAddress;
    EnumerableSet.AddressSet operators;
    EnumerableSet.AddressSet approvedOperators;
    address spaceOwnerRegistry;
    mapping(address operator => EnumerableSet.AddressSet) spacesByOperator;
    mapping(address space => address operator) operatorBySpace;
    address riverToken;
    uint256 stakeRequirement;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {BaseRegistryErrors} from "./BaseRegistryErrors.sol";

// structs
enum NodeOperatorStatus {
  Exiting,
  Standby,
  Approved,
  Active
}

struct AppStorage {
  // Operator Mappings
  mapping(address => NodeOperatorStatus) statusByOperator;
  // Delegation Mappings
  mapping(address operator => EnumerableSet.AddressSet) spacesByOperator;
  mapping(address space => address operator) operatorBySpace;
  // References
  uint256 stakeRequirement;
  address spaceOwnerRegistry;
  address riverToken;
  address mainnetDelegation;
}

library BaseRegistryStorage {
  function layout() internal pure returns (AppStorage storage s) {
    assembly {
      s.slot := 0
    }
  }
}

abstract contract BaseRegistryModifiers {
  using EnumerableSet for EnumerableSet.AddressSet;

  AppStorage internal ds;

  modifier onlySpaceOwner(address space) {
    if (!_isValidSpaceOwner(space)) {
      revert BaseRegistryErrors.NodeOperator__InvalidSpace();
    }
    _;
  }

  modifier onlyValidOperator(address operator) {
    if (ds.statusByOperator[operator] == NodeOperatorStatus.Exiting) {
      revert BaseRegistryErrors.NodeOperator__NotRegistered();
    }
    _;
  }

  function _isValidSpaceOwner(address space) internal view returns (bool) {
    return IERC173(space).owner() == msg.sender;
  }

  function _isValidOperator(address operator) internal view returns (bool) {
    return ds.statusByOperator[operator] != NodeOperatorStatus.Exiting;
  }
}

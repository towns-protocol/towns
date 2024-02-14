// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeOperatorBase} from "./INodeOperator.sol";

// libraries
import {NodeOperatorStorage} from "./NodeOperatorStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

abstract contract NodeOperatorBase is INodeOperatorBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  function _getOperators() internal view returns (address[] memory) {
    return NodeOperatorStorage.layout().operators.values();
  }

  function _setOperatorStatus(
    address operator,
    NodeOperatorStatus newStatus
  ) internal {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    ds.operatorByAddress[operator] = NodeOperator({
      operator: operator,
      status: newStatus
    });

    if (!ds.operators.contains(operator)) ds.operators.add(operator);

    if (newStatus == NodeOperatorStatus.Approved) {
      ds.approvedOperators.add(operator);
    } else if (newStatus == NodeOperatorStatus.Exiting) {
      ds.approvedOperators.remove(operator);
    }
  }

  function _getOperatorStatus(
    address operator
  ) internal view returns (NodeOperatorStatus) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return ds.operatorByAddress[operator].status;
  }

  function _getOperatorsByStatus(
    NodeOperatorStatus status
  ) internal view returns (address[] memory) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    uint256 operatorLength = ds.operators.length();

    address[] memory operators = new address[](operatorLength);
    uint256 count = 0;

    for (uint256 i = 0; i < operatorLength; ) {
      address operator = ds.operators.at(i);
      if (ds.operatorByAddress[operator].status == status) {
        operators[count] = operator;
        count++;
      }
      unchecked {
        i++;
      }
    }

    // Trim the operators array to the correct size
    assembly {
      mstore(operators, count)
    }

    return operators;
  }

  function _getApprovedOperators() internal view returns (address[] memory) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return ds.approvedOperators.values();
  }

  function _isValidOperator(address operator) internal view returns (bool) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return
      ds.operators.contains(operator) &&
      ds.operatorByAddress[operator].status != NodeOperatorStatus.Exiting;
  }

  function _approvedOperators() internal view returns (address[] memory) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return ds.approvedOperators.values();
  }

  function _setSpaceOwnerRegistry(address registry) internal {
    NodeOperatorStorage.layout().spaceOwnerRegistry = registry;
  }

  function _spaceOwnerRegistry() internal view returns (address) {
    return NodeOperatorStorage.layout().spaceOwnerRegistry;
  }

  // =============================================================
  //                          River Token
  // =============================================================
  function _setRiverToken(address token) internal {
    NodeOperatorStorage.layout().riverToken = token;
  }

  function _riverToken() internal view returns (address) {
    return NodeOperatorStorage.layout().riverToken;
  }

  function _setStakeRequirement(uint256 requirement) internal {
    NodeOperatorStorage.layout().stakeRequirement = requirement;
  }

  function _stakeRequirement() internal view returns (uint256) {
    return NodeOperatorStorage.layout().stakeRequirement;
  }

  // =============================================================
  //                   Space Delegated Operators
  // =============================================================

  function _setSpaceDelegation(address space, address operator) internal {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    ds.operatorBySpace[space] = operator;
    ds.spacesByOperator[operator].add(space);
  }

  function _removeSpaceDelegation(address space) internal {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    address operator = ds.operatorBySpace[space];

    ds.spacesByOperator[operator].remove(space);
    ds.operatorBySpace[space] = address(0);
  }

  function _operatorBySpace(address space) internal view returns (address) {
    return NodeOperatorStorage.layout().operatorBySpace[space];
  }

  function _spacesByOperator(
    address operator
  ) internal view returns (address[] memory) {
    return NodeOperatorStorage.layout().spacesByOperator[operator].values();
  }
}

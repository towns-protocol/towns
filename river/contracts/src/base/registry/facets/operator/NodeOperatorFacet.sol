// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeOperator} from "./INodeOperator.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {NodeOperatorStorage, NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";

// contracts
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";

import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract NodeOperatorFacet is INodeOperator, OwnableBase, ERC721ABase, Facet {
  using EnumerableSet for EnumerableSet.AddressSet;

  function __NodeOperator_init() external onlyInitializing {
    _addInterface(type(INodeOperator).interfaceId);
  }

  // =============================================================
  //                           Registration
  // =============================================================

  /// @inheritdoc INodeOperator
  function registerOperator() external {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    if (ds.operators.contains(msg.sender))
      revert NodeOperator__AlreadyRegistered();

    _mint(msg.sender, 1);

    ds.operators.add(msg.sender);
    ds.statusByOperator[msg.sender] = NodeOperatorStatus.Standby;

    emit OperatorRegistered(msg.sender);
  }

  // =============================================================
  //                           Operator Status
  // =============================================================

  /// @inheritdoc INodeOperator
  function isOperator(address operator) external view returns (bool) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return ds.operators.contains(operator);
  }

  /// @inheritdoc INodeOperator
  function setOperatorStatus(
    address operator,
    NodeOperatorStatus newStatus
  ) external onlyOwner {
    if (operator == address(0)) revert NodeOperator__InvalidAddress();

    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    if (!ds.operators.contains(operator)) revert NodeOperator__NotRegistered();

    NodeOperatorStatus currentStatus = ds.statusByOperator[operator];

    if (currentStatus == newStatus) revert NodeOperator__StatusNotChanged();

    // Check for valid newStatus transitions
    // Exiting -> Standby
    // Standby -> Approved
    // Approved -> Exiting
    if (
      currentStatus == NodeOperatorStatus.Exiting &&
      newStatus != NodeOperatorStatus.Standby
    ) {
      revert NodeOperator__InvalidStatusTransition();
    } else if (
      currentStatus == NodeOperatorStatus.Standby &&
      newStatus != NodeOperatorStatus.Approved
    ) {
      revert NodeOperator__InvalidStatusTransition();
    } else if (
      currentStatus == NodeOperatorStatus.Approved &&
      newStatus != NodeOperatorStatus.Exiting
    ) {
      revert NodeOperator__InvalidStatusTransition();
    }

    ds.statusByOperator[operator] = newStatus;

    emit OperatorStatusChanged(operator, newStatus);
  }

  /// @inheritdoc INodeOperator
  function getOperatorStatus(
    address operator
  ) external view returns (NodeOperatorStatus) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return ds.statusByOperator[operator];
  }

  // =============================================================
  //                           Commission
  // =============================================================
  function setCommissionRate(
    uint256 rate
  ) external onlyValidOperator(msg.sender) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    if (!ds.operators.contains(msg.sender))
      revert NodeOperator__NotRegistered();
    ds.commissionByOperator[msg.sender] = rate;
    emit OperatorCommissionChanged(msg.sender, rate);
  }

  function getCommissionRate(address operator) external view returns (uint256) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return ds.commissionByOperator[operator];
  }

  // =============================================================
  //                           Modifiers
  // =============================================================
  modifier onlyValidOperator(address operator) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    if (ds.statusByOperator[operator] == NodeOperatorStatus.Exiting) {
      revert NodeOperator__NotRegistered();
    }
    _;
  }
}

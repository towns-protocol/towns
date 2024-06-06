// SPDX-License-Identifier: MIT
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
  function registerOperator(address claimer) external {
    if (claimer == address(0)) revert NodeOperator__InvalidAddress();

    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    if (ds.operators.contains(msg.sender))
      revert NodeOperator__AlreadyRegistered();

    _mint(msg.sender, 1);

    ds.operators.add(msg.sender);
    ds.statusByOperator[msg.sender] = NodeOperatorStatus.Standby;
    ds.claimerByOperator[msg.sender] = claimer;
    ds.operatorsByClaimer[claimer].add(msg.sender);

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
    // Approved -> Exiting || Active
    // Active -> Exiting || Approved
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
      (newStatus != NodeOperatorStatus.Exiting &&
        newStatus != NodeOperatorStatus.Active)
    ) {
      revert NodeOperator__InvalidStatusTransition();
    } else if (
      currentStatus == NodeOperatorStatus.Active &&
      (newStatus != NodeOperatorStatus.Exiting &&
        newStatus != NodeOperatorStatus.Approved)
    ) {
      revert NodeOperator__InvalidStatusTransition();
    }
    if (newStatus == NodeOperatorStatus.Active) {
      ds.approvalTimeByOperator[operator] = block.timestamp;
    } else {
      ds.approvalTimeByOperator[operator] = 0;
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
  //                           Operator Info
  // =============================================================

  /// @inheritdoc INodeOperator
  function setClaimAddressForOperator(
    address claimer,
    address operator
  ) external onlyClaimer(msg.sender, operator) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    if (!ds.operators.contains(operator)) revert NodeOperator__NotRegistered();

    address currentClaimer = ds.claimerByOperator[operator];

    if (currentClaimer == claimer) {
      revert NodeOperator__ClaimAddressNotChanged();
    }

    if (ds.operatorsByClaimer[currentClaimer].contains(operator)) {
      ds.operatorsByClaimer[currentClaimer].remove(operator);
    }

    ds.claimerByOperator[operator] = claimer;
    ds.operatorsByClaimer[claimer].add(operator);

    emit OperatorClaimAddressChanged(operator, claimer);
  }

  /// @inheritdoc INodeOperator
  function getClaimAddressForOperator(
    address operator
  ) external view returns (address) {
    return NodeOperatorStorage.layout().claimerByOperator[operator];
  }

  // =============================================================
  //                           Commission
  // =============================================================
  function setCommissionRate(uint256 rateBps) external {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    if (!ds.operators.contains(msg.sender))
      revert NodeOperator__NotRegistered();
    if (rateBps > 10000) revert NodeOperator__InvalidCommissionRate();

    //only allow raising the commission if operator is in standby status
    if (
      rateBps > ds.commissionByOperator[msg.sender] &&
      ds.statusByOperator[msg.sender] != NodeOperatorStatus.Standby
    ) {
      revert NodeOperator__InvalidCommissionRate();
    }

    ds.commissionByOperator[msg.sender] = rateBps;
    emit OperatorCommissionChanged(msg.sender, rateBps);
  }

  function getCommissionRate(address operator) external view returns (uint256) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return ds.commissionByOperator[operator];
  }

  // =============================================================
  //                           Modifiers
  // =============================================================

  // only an existing claimer for that operator can call this function
  modifier onlyClaimer(address claimer, address operator) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    if (!ds.operatorsByClaimer[claimer].contains(operator)) {
      revert NodeOperator__NotClaimer();
    }
    _;
  }
}

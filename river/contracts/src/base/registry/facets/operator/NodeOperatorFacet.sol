// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeOperator} from "./INodeOperator.sol";

// libraries
import {NodeOperatorStatus} from "contracts/src/base/registry/libraries/BaseRegistryStorage.sol";
import {BaseRegistryErrors} from "contracts/src/base/registry/libraries/BaseRegistryErrors.sol";

// contracts
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {BaseRegistryModifiers} from "contracts/src/base/registry/libraries/BaseRegistryStorage.sol";

contract NodeOperatorFacet is
  INodeOperator,
  BaseRegistryModifiers,
  OwnableBase,
  ERC721ABase,
  Facet
{
  function __NodeOperator_init() external onlyInitializing {
    _addInterface(type(INodeOperator).interfaceId);
  }

  // =============================================================
  //                           Registration
  // =============================================================

  /// @inheritdoc INodeOperator
  function registerOperator() external {
    if (_balanceOf(msg.sender) > 0)
      revert BaseRegistryErrors.NodeOperator__AlreadyRegistered();

    _mint(msg.sender, 1);
    ds.statusByOperator[msg.sender] = NodeOperatorStatus.Standby;

    emit OperatorRegistered(msg.sender);
  }

  // =============================================================
  //                           Operator Status
  // =============================================================

  /// @inheritdoc INodeOperator
  function isOperator(address operator) external view returns (bool) {
    return _isValidOperator(operator);
  }

  /// @inheritdoc INodeOperator
  function setOperatorStatus(
    address operator,
    NodeOperatorStatus newStatus
  ) external onlyOwner {
    if (operator == address(0))
      revert BaseRegistryErrors.NodeOperator__InvalidAddress();
    if (_balanceOf(operator) == 0)
      revert BaseRegistryErrors.NodeOperator__NotRegistered();

    NodeOperatorStatus currentStatus = ds.statusByOperator[operator];

    if (currentStatus == newStatus)
      revert BaseRegistryErrors.NodeOperator__StatusNotChanged();

    // Check for valid newStatus transitions
    // Exiting -> Standby
    // Standby -> Approved
    // Approved -> Exiting
    if (
      currentStatus == NodeOperatorStatus.Exiting &&
      newStatus != NodeOperatorStatus.Standby
    ) {
      revert BaseRegistryErrors.NodeOperator__InvalidStatusTransition();
    } else if (
      currentStatus == NodeOperatorStatus.Standby &&
      newStatus != NodeOperatorStatus.Approved
    ) {
      revert BaseRegistryErrors.NodeOperator__InvalidStatusTransition();
    } else if (
      currentStatus == NodeOperatorStatus.Approved &&
      newStatus != NodeOperatorStatus.Exiting
    ) {
      revert BaseRegistryErrors.NodeOperator__InvalidStatusTransition();
    }

    ds.statusByOperator[operator] = newStatus;

    emit OperatorStatusChanged(operator, newStatus);
  }

  /// @inheritdoc INodeOperator
  function getOperatorStatus(
    address operator
  ) external view returns (NodeOperatorStatus) {
    return ds.statusByOperator[operator];
  }

  // =============================================================
  //                           Commission
  // =============================================================
  function setCommissionRate(
    uint256 rate
  ) external onlyValidOperator(msg.sender) {
    if (_balanceOf(msg.sender) == 0)
      revert BaseRegistryErrors.NodeOperator__NotRegistered();
    ds.commissionByOperator[msg.sender] = rate;
    emit OperatorCommissionChanged(msg.sender, rate);
  }

  function getCommissionRate(address operator) external view returns (uint256) {
    return ds.commissionByOperator[operator];
  }
}

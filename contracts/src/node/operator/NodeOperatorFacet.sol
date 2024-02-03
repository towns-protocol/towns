// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeOperator} from "./INodeOperator.sol";

// libraries

// contracts
import {NodeOperatorBase} from "./NodeOperatorBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";

contract NodeOperatorFacet is
  INodeOperator,
  NodeOperatorBase,
  OwnableBase,
  ERC721A
{
  function __NodeOperator_init() external onlyInitializing {
    __NodeOperator_init_unchained();
  }

  function __NodeOperator_init_unchained() internal {
    __ERC721A_init_unchained("Operator", "OPR");
    _addInterface(type(INodeOperator).interfaceId);
  }

  // =============================================================
  //                           Registration
  // =============================================================

  /// @inheritdoc INodeOperator
  function registerOperator(address operator) external {
    if (operator == address(0)) revert NodeOperator__InvalidAddress();
    if (_balanceOf(operator) > 0) revert NodeOperator__AlreadyRegistered();
    _setOperatorStatus(operator, NodeOperatorStatus.Standby);
    _mint(operator, 1);

    emit OperatorRegistered(operator);
  }

  // =============================================================
  //                           Operator Status
  // =============================================================

  function setOperatorStatus(
    address operator,
    NodeOperatorStatus newStatus
  ) external onlyOwner {
    if (operator == address(0)) revert NodeOperator__InvalidAddress();
    if (_balanceOf(operator) == 0) revert NodeOperator__NotRegistered();

    NodeOperatorStatus currentStatus = _operatorStatus(operator);

    if (_operatorStatus(operator) == newStatus)
      revert NodeOperator__StatusNotChanged();

    // Check for valid newStatus transitions
    // Standby -> Approved
    // Approved -> Exiting
    // Exiting -> Standby
    if (
      currentStatus == NodeOperatorStatus.Standby &&
      newStatus != NodeOperatorStatus.Approved
    ) {
      revert NodeOperator__InvalidStatusTransition();
    } else if (
      currentStatus == NodeOperatorStatus.Approved &&
      newStatus != NodeOperatorStatus.Exiting
    ) {
      revert NodeOperator__InvalidStatusTransition();
    } else if (
      currentStatus == NodeOperatorStatus.Exiting &&
      newStatus != NodeOperatorStatus.Standby
    ) {
      revert NodeOperator__InvalidStatusTransition();
    }

    _setOperatorStatus(operator, newStatus);

    emit OperatorStatusChanged(operator, newStatus);
  }

  /// @inheritdoc INodeOperator
  function operatorStatus(
    address operator
  ) external view override returns (NodeOperatorStatus) {
    return _operatorStatus(operator);
  }

  // =============================================================
  //                           Approved Operators
  // =============================================================

  function approvedOperators() external view returns (address[] memory) {
    return _approvedOperators();
  }

  // =============================================================
  //                           Overrides
  // =============================================================
  function _beforeTokenTransfers(
    address from,
    address,
    uint256,
    uint256
  ) internal pure override {
    if (from != address(0)) revert NodeOperator__NotTransferable();
  }
}

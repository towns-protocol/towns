// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeOperator} from "./INodeOperator.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IVotes} from "contracts/src/diamond/facets/governance/votes/IVotes.sol";

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
  function __NodeOperator_init(
    address ownerRegistry,
    uint256 stakeRequirement
  ) external onlyInitializing {
    __NodeOperator_init_unchained(ownerRegistry, stakeRequirement);
  }

  function __NodeOperator_init_unchained(
    address ownerRegistry,
    uint256 stakeRequirement
  ) internal {
    _setSpaceOwnerRegistry(ownerRegistry);
    _setStakeRequirement(stakeRequirement);
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
  function isOperator(address operator) external view returns (bool) {
    return _isValidOperator(operator);
  }

  function setOperatorStatus(
    address operator,
    NodeOperatorStatus newStatus
  ) external onlyOwner {
    if (operator == address(0)) revert NodeOperator__InvalidAddress();
    if (_balanceOf(operator) == 0) revert NodeOperator__NotRegistered();

    NodeOperatorStatus currentStatus = _getOperatorStatus(operator);

    if (_getOperatorStatus(operator) == newStatus)
      revert NodeOperator__StatusNotChanged();

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

    if (newStatus == NodeOperatorStatus.Approved) {
      uint256 currentStake = _calculateStake(operator);
      if (currentStake < _stakeRequirement())
        revert NodeOperator__NotEnoughStake();
    }

    _setOperatorStatus(operator, newStatus);

    emit OperatorStatusChanged(operator, newStatus);
  }

  /// @inheritdoc INodeOperator
  function getOperatorStatus(
    address operator
  ) external view returns (NodeOperatorStatus) {
    return _getOperatorStatus(operator);
  }

  // =============================================================
  //                           Approved Operators
  // =============================================================

  function getOperators() external view returns (address[] memory) {
    return _getOperators();
  }

  function getOperatorsByStatus(
    NodeOperatorStatus status
  ) external view returns (address[] memory) {
    return _getOperatorsByStatus(status);
  }

  function getApprovedOperators() external view returns (address[] memory) {
    return _getApprovedOperators();
  }

  // =============================================================
  //                           Token
  // =============================================================
  function setRiverToken(address newToken) external onlyOwner {
    _setRiverToken(newToken);
    emit OperatorRiverTokenChanged(newToken);
  }

  function riverToken() external view returns (address) {
    return _riverToken();
  }

  // =============================================================
  //                           Stake
  // =============================================================

  function calculateStake(address operator) external view returns (uint256) {
    return _calculateStake(operator);
  }

  function setStakeRequirement(uint256 newRequirement) external onlyOwner {
    _setStakeRequirement(newRequirement);
    emit OperatorStakeRequirementChanged(newRequirement);
  }

  function getStakeRequirement() external view returns (uint256) {
    return _stakeRequirement();
  }

  // =============================================================
  //                           Registry
  // =============================================================
  function setSpaceOwnerRegistry(address newRegistry) external onlyOwner {
    _setSpaceOwnerRegistry(newRegistry);
    emit OperatorSpaceOwnerRegistryChanged(newRegistry);
  }

  // =============================================================
  //                       Space Delegated Operators
  // =============================================================
  function addSpaceDelegation(address space, address operator) external {
    if (space == address(0)) revert NodeOperator__InvalidAddress();
    if (operator == address(0)) revert NodeOperator__InvalidAddress();

    if (_balanceOf(operator) == 0) revert NodeOperator__NotRegistered();

    if (!_isValidSpaceOwner(space)) revert NodeOperator__InvalidSpace();

    if (!_isValidOperator(operator)) revert NodeOperator__InvalidOperator();

    address currentOperator = _operatorBySpace(space);

    if (currentOperator != address(0) && currentOperator == operator)
      revert NodeOperator__AlreadyDelegated(currentOperator);

    _setSpaceDelegation(space, operator);
    emit OperatorSpaceDelegated(space, operator);
  }

  function removeSpaceDelegation(address space) external {
    if (!_isValidSpaceOwner(space)) revert NodeOperator__InvalidSpace();
    _removeSpaceDelegation(space);
    emit OperatorSpaceDelegated(space, address(0));
  }

  function getSpaceDelegation(address space) external view returns (address) {
    return _operatorBySpace(space);
  }

  function getSpaceDelegationsByOperator(
    address operator
  ) external view returns (address[] memory) {
    return _spacesByOperator(operator);
  }

  function _isValidSpaceOwner(address space) internal view returns (bool) {
    return IERC173(space).owner() == msg.sender;
  }

  function _calculateStake(address operator) internal view returns (uint256) {
    uint256 stake = IVotes(_riverToken()).getVotes(operator);

    address[] memory spaces = _spacesByOperator(operator);

    for (uint256 i = 0; i < spaces.length; ) {
      stake += IVotes(_riverToken()).getVotes(spaces[i]);

      unchecked {
        i++;
      }
    }

    return stake;
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

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface INodeOperatorBase {
  enum NodeOperatorStatus {
    Exiting,
    Standby,
    Approved,
    Active
  }

  struct NodeOperator {
    address operator;
    NodeOperatorStatus status;
  }

  // =============================================================
  //                           Errors
  // =============================================================
  error NodeOperator__InvalidAddress();
  error NodeOperator__NotTransferable();
  error NodeOperator__AlreadyRegistered();
  error NodeOperator__StatusNotChanged();
  error NodeOperator__InvalidStatusTransition();
  error NodeOperator__NotRegistered();
  error NodeOperator__InvalidOperator();
  error NodeOperator__InvalidSpace();
  error NodeOperator__AlreadyDelegated(address operator);
  error NodeOperator__NotEnoughStake();

  // =============================================================
  //                           Events
  // =============================================================
  event OperatorRegistered(address indexed operator);
  event OperatorStatusChanged(
    address indexed operator,
    NodeOperatorStatus indexed newStatus
  );
  event OperatorSpaceOwnerRegistryChanged(address indexed registry);
  event OperatorSpaceDelegated(address indexed operator, address indexed space);
  event OperatorRiverTokenChanged(address indexed riverToken);
  event OperatorStakeRequirementChanged(uint256 stakeRequirement);
}

interface INodeOperator is INodeOperatorBase {
  function isOperator(address operator) external view returns (bool);

  /*
   * @notice  Registers an operator.
   * @param   operator Address of the operator that will receive the operator token.
   */
  function registerOperator(address operator) external;

  /*
   * @notice  Returns the status of an operator.
   * @param   operator Address of the operator.
   * @return  The status of the operator.
   */
  function getOperatorStatus(
    address operator
  ) external view returns (INodeOperatorBase.NodeOperatorStatus);

  /*
   * @notice  Sets the token that will be used to validate the operator stake
   * @param   token The address of the token.
   */
  function setRiverToken(address token) external;
}

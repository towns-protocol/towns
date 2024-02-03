// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface INodeOperatorBase {
  enum NodeOperatorStatus {
    Standby,
    Approved,
    Active,
    Exiting
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

  // =============================================================
  //                           Events
  // =============================================================
  event OperatorRegistered(address indexed operator);
  event OperatorStatusChanged(
    address indexed operator,
    NodeOperatorStatus indexed newStatus
  );
}

interface INodeOperator is INodeOperatorBase {
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
  function operatorStatus(
    address operator
  ) external view returns (INodeOperatorBase.NodeOperatorStatus);
}

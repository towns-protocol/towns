// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {NodeOperatorStatus} from "contracts/src/base/registry/libraries/BaseRegistryStorage.sol";

interface INodeOperator {
  // =============================================================
  //                           Events
  // =============================================================
  event OperatorRegistered(address indexed operator);
  event OperatorStatusChanged(
    address indexed operator,
    NodeOperatorStatus indexed newStatus
  );

  // =============================================================
  //                           Registration
  // =============================================================
  /*
   * @notice  Registers an operator.
   * @param   operator Address of the operator that will receive the operator token.
   */
  function registerOperator(address operator) external;

  /*
   * @notice  Returns whether an operator is registered.
   * @param   operator Address of the operator.
   */
  function isOperator(address operator) external view returns (bool);

  /*
   * @notice  Returns the status of an operator.
   * @param   operator Address of the operator.
   * @return  The status of the operator.
   */
  function getOperatorStatus(
    address operator
  ) external view returns (NodeOperatorStatus);

  /*
   * @notice  Sets the status of an operator.
   * @param   operator Address of the operator.
   */
  function setOperatorStatus(
    address operator,
    NodeOperatorStatus newStatus
  ) external;
}

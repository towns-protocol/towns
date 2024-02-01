// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface INodeOperatorBase {
  error NodeOperator__InvalidAddress();
  error NodeOperator__NotTransferable();
  error NodeOperator__AlreadyOperator();
}

interface INodeOperator is INodeOperatorBase {
  /*
   * @notice  Registers an operator.
   * @param   operator Address of the operator that will receive the operator token.
   */
  function registerOperator(address operator) external;
}

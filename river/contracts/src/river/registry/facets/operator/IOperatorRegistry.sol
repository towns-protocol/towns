// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IOperatorRegistry {
  // =============================================================
  //                           Events
  // =============================================================
  event OperatorAdded(address indexed operatorAddress);

  event OperatorRemoved(address indexed operatorAddress);

  // =============================================================
  //                           Operators
  // =============================================================
  function approveOperator(address operator) external;

  function isOperator(address operator) external view returns (bool);

  function removeOperator(address operator) external;
}

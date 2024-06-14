// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IEntitlementCheckerBase {
  error EntitlementChecker_NodeAlreadyRegistered();
  error EntitlementChecker_NodeNotRegistered();
  error EntitlementChecker_InsufficientNumberOfNodes();
  error EntitlementChecker_InvalidNodeOperator();
  error EntitlementChecker_InvalidOperator();
  error EntitlementChecker_OperatorNotActive();

  // Events
  event NodeRegistered(address indexed nodeAddress);
  event NodeUnregistered(address indexed nodeAddress);

  event EntitlementCheckRequested(
    address callerAddress,
    address contractAddress,
    bytes32 transactionId,
    uint256 roleId,
    address[] selectedNodes
  );
}

interface IEntitlementChecker is IEntitlementCheckerBase {
  function registerNode(address node) external;

  function unregisterNode(address node) external;

  function isValidNode(address node) external view returns (bool);

  function getNodeCount() external view returns (uint256);

  function getNodeAtIndex(uint256 index) external view returns (address);

  function getRandomNodes(
    uint256 count
  ) external view returns (address[] memory);

  function requestEntitlementCheck(
    address callerAddress,
    bytes32 transactionId,
    uint256 roleId,
    address[] memory nodes
  ) external;

  function getNodesByOperator(
    address operator
  ) external view returns (address[] memory);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IEntitlementCheckerBase {
  error EntitlementChecker_NodeAlreadyRegistered();
  error EntitlementChecker_NodeNotRegistered();
  error EntitlementChecker_InsufficientNumberOfNodes();

  // Events
  event NodeRegistered(address indexed nodeAddress);
  event NodeUnregistered(address indexed nodeAddress);

  event EntitlementCheckRequested(
    address indexed callerAddress,
    bytes32 transactionId,
    address[] selectedNodes,
    address contractAddress
  );
}

interface IEntitlementChecker is IEntitlementCheckerBase {
  function registerNode() external;

  function unregisterNode() external;

  function nodeCount() external view returns (uint256);

  function getRandomNodes(
    uint requestedNodeCount,
    address requestingContract
  ) external view returns (address[] memory);

  function emitEntitlementCheckRequested(
    bytes32 transactionId,
    address[] memory selectedNodes
  ) external;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IEntitlementCheckerBase {
  error EntitlementChecker_NodeAlreadyRegistered();
  error EntitlementChecker_NodeNotRegistered();
  error EntitlementChecker_InsufficientNumberOfNodes();
  error EntitlementChecker_InvalidNodeOperator();
  error EntitlementChecker_InvalidOperator();
  error EntitlementChecker_OperatorNotActive();
  error EntitlementChecker_NoPendingRequests();
  error EntitlementChecker_InsufficientFunds();
  error EntitlementChecker_NoRefundsAvailable();

  // Events
  event NodeRegistered(address indexed nodeAddress);
  event NodeUnregistered(address indexed nodeAddress);

  /// @notice Event emitted when an entitlement check is requested
  event EntitlementCheckRequested(
    address callerAddress,
    address contractAddress,
    bytes32 transactionId,
    uint256 roleId,
    address[] selectedNodes
  );

  event EntitlementCheckRequestedV2(
    address walletAddress,
    address spaceAddress,
    address resolverAddress,
    bytes32 transactionId,
    uint256 roleId,
    address[] selectedNodes
  );
}

interface IEntitlementChecker is IEntitlementCheckerBase {
  /// @notice Register a new node in the system
  /// @param node The address of the node to register
  function registerNode(address node) external;

  /// @notice Unregister an existing node from the system
  /// @param node The address of the node to unregister
  function unregisterNode(address node) external;

  /// @notice Check if a node address is registered and valid
  /// @param node The address of the node to check
  /// @return bool True if the node is valid, false otherwise
  function isValidNode(address node) external view returns (bool);

  /// @notice Get the total number of registered nodes
  /// @return uint256 The count of registered nodes
  function getNodeCount() external view returns (uint256);

  /// @notice Get the node address at a specific index
  /// @param index The index of the node to retrieve
  /// @return address The address of the node at the given index
  function getNodeAtIndex(uint256 index) external view returns (address);

  /// @notice Get a random selection of registered nodes
  /// @param count The number of random nodes to return
  /// @return address[] Array of randomly selected node addresses
  function getRandomNodes(
    uint256 count
  ) external view returns (address[] memory);

  /// @notice Request an entitlement check for a transaction
  /// @param callerAddress The address initiating the check
  /// @param transactionId The unique identifier of the transaction
  /// @param roleId The role ID to check entitlements against
  /// @param nodes Array of node addresses that will perform the check
  function requestEntitlementCheck(
    address callerAddress,
    bytes32 transactionId,
    uint256 roleId,
    address[] memory nodes
  ) external;

  /// @notice Request an entitlement check with additional data (V2)
  /// @param walletAddress The wallet address to check entitlements for
  /// @param transactionId The unique identifier of the transaction
  /// @param requestId The unique identifier for this specific request
  /// @param extraData Additional data required for the check
  function requestEntitlementCheckV2(
    address walletAddress,
    bytes32 transactionId,
    uint256 requestId,
    bytes memory extraData
  ) external payable;

  /// @notice Get all nodes registered to a specific operator
  /// @param operator The address of the operator
  /// @return address[] Array of node addresses registered to the operator
  function getNodesByOperator(
    address operator
  ) external view returns (address[] memory);
}

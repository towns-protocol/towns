// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IEntitlementCheckerBase {
    /// @notice CheckType enum for unified entitlement check dispatch
    /// @dev To encode data for each type:
    ///   switch (checkType) {
    ///     case CheckType.V1:
    ///       data = abi.encode(receiver, transactionId, roleId, nodes);
    ///     case CheckType.V2:
    ///       data = abi.encode(receiver, transactionId, requestId, extraData);
    ///       // where extraData = abi.encode(sender)
    ///     case CheckType.V3:
    ///       data = abi.encode(receiver, transactionId, requestId, currency, amount, sender);
    ///   }
    enum CheckType {
        V1, // Legacy check with explicit nodes
        V2, // ETH escrow (uses msg.value, currency is always NATIVE_TOKEN)
        V3 // ETH or ERC20 escrow (uses currency + amount)
    }

    // Events
    event NodeRegistered(address indexed nodeAddress);
    event NodeUnregistered(address indexed nodeAddress);

    /// @notice Event emitted when an entitlement check is requested
    event EntitlementCheckRequested(
        address receiver,
        address space,
        bytes32 transactionId,
        uint256 roleId,
        address[] selectedNodes
    );

    event EntitlementCheckRequestedV2(
        address receiver,
        address space,
        address resolver,
        bytes32 transactionId,
        uint256 roleId,
        address[] selectedNodes
    );

    error EntitlementChecker_InvalidCheckType();
    error EntitlementChecker_NodeAlreadyRegistered();
    error EntitlementChecker_NodeNotRegistered();
    error EntitlementChecker_InsufficientNumberOfNodes();
    error EntitlementChecker_InvalidNodeOperator();
    error EntitlementChecker_InvalidOperator();
    error EntitlementChecker_OperatorNotActive();
    error EntitlementChecker_NoPendingRequests();
    error EntitlementChecker_InsufficientFunds();
    error EntitlementChecker_NoRefundsAvailable();
    error EntitlementChecker_InvalidValue();
    error EntitlementChecker_DuplicateRequestId();
}

interface IEntitlementChecker is IEntitlementCheckerBase {
    /// @notice Register a new node in the system
    /// @param node The address of the node to register
    function registerNode(address node) external;

    /// @notice Unregister an existing node from the system
    /// @param node The address of the node to unregister
    function unregisterNode(address node) external;

    /// @notice Request an entitlement check for a transaction
    /// @param receiver The address to check entitlements for (membership recipient)
    /// @param transactionId The unique identifier of the transaction
    /// @param roleId The role ID to check entitlements against
    /// @param nodes Array of node addresses that will perform the check
    function requestEntitlementCheck(
        address receiver,
        bytes32 transactionId,
        uint256 roleId,
        address[] memory nodes
    ) external;

    /// @notice Request an entitlement check with additional data (V2)
    /// @param receiver The address to check entitlements for (membership recipient)
    /// @param transactionId The unique identifier of the transaction
    /// @param requestId The unique identifier for this specific request
    /// @param extraData Additional data required for the check
    function requestEntitlementCheckV2(
        address receiver,
        bytes32 transactionId,
        uint256 requestId,
        bytes memory extraData
    ) external payable;

    /// @notice Unified entitlement check request with enum-based dispatch
    /// @param checkType The type of check to perform (V1, V2, or V3)
    /// @param data Encoded parameters specific to the check type (see CheckType enum docs)
    function requestEntitlementCheck(CheckType checkType, bytes calldata data) external payable;

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
    function getRandomNodes(uint256 count) external view returns (address[] memory);

    /// @notice Get all nodes registered to a specific operator
    /// @param operator The address of the operator
    /// @return address[] Array of node addresses registered to the operator
    function getNodesByOperator(address operator) external view returns (address[] memory);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IEntitlementCheckerBase} from "src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IEntitlementGatedBase} from "src/spaces/facets/gated/IEntitlementGated.sol";

// libraries

// contracts

/// @dev Struct to hold voting context and avoid stack too deep
struct VotingContext {
    bytes32 transactionId;
    address caller;
    uint256 value;
    bool completed;
}

/// @dev Struct to hold vote counting results
struct VoteResults {
    uint256 passed;
    uint256 failed;
    uint256 totalNodes;
    IEntitlementGatedBase.NodeVoteStatus finalStatus;
}

interface IXChainBase {
    error Unauthorized();
    error TransactionCheckAlreadyCompleted();
    error RefundNotYetAvailable();
    error InvalidValue();
    error VotingInProgress();

    /// @notice Emitted when a refund is processed
    /// @param senderAddress The address that received the refund
    /// @param transactionId The transaction ID that was refunded
    /// @param amount The amount refunded
    event RefundProcessed(
        address indexed senderAddress,
        bytes32 indexed transactionId,
        uint256 amount
    );
}

interface IXChain is IXChainBase, IEntitlementGatedBase, IEntitlementCheckerBase {
    /// @notice Checks if a specific entitlement check request has been completed
    /// @param transactionId The unique identifier of the transaction
    /// @param requestId The ID of the specific check request
    /// @return bool True if the check is completed, false otherwise
    function isCheckCompleted(
        bytes32 transactionId,
        uint256 requestId
    ) external view returns (bool);

    /// @notice Allows protocol to provide a refund for a timed-out entitlement check
    /// @dev Will revert if the contract has insufficient funds
    /// @param transactionId The unique identifier of the transaction being checked
    function requestXChainRefund(bytes32 transactionId) external;

    /// @notice Posts the result of an entitlement check from a node
    /// @param transactionId The unique identifier of the transaction being checked
    /// @param roleId The ID of the role being checked
    /// @param result The vote result from the node (PASSED, FAILED, or NOT_VOTED)
    function postEntitlementCheckResult(
        bytes32 transactionId,
        uint256 roleId,
        NodeVoteStatus result
    ) external;
}

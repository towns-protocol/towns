// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRuleEntitlement} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";

interface IEntitlementGatedBase {
    enum NodeVoteStatus {
        NOT_VOTED,
        PASSED,
        FAILED
    }

    struct NodeVote {
        address node;
        NodeVoteStatus vote;
    }

    struct Transaction {
        bool finalized;
        address clientAddress;
        mapping(uint256 => NodeVote[]) nodeVotesArray;
        mapping(uint256 => bool) isCompleted;
        IRuleEntitlement entitlement;
        uint256[] roleIds;
    }

    error EntitlementGated_InvalidAddress();
    error EntitlementGated_TransactionCheckAlreadyRegistered();
    error EntitlementGated_TransactionCheckAlreadyCompleted();
    error EntitlementGated_TransactionNotRegistered();
    error EntitlementGated_NodeNotFound();
    error EntitlementGated_NodeAlreadyVoted();
    error EntitlementGated_OnlyEntitlementChecker();
    error EntitlementGated_InvalidEntitlement();
    error EntitlementGated_RequestIdNotFound();
    error EntitlementGated_InvalidValue();
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event EntitlementCheckResultPosted(bytes32 indexed transactionId, NodeVoteStatus result);
}

interface IEntitlementGated is IEntitlementGatedBase {
    /// @notice Called by the xchain node to post the result of the entitlement check
    /// @param transactionId The unique identifier for the transaction
    /// @param roleId The role ID for the entitlement check
    /// @param result The result of the entitlement check (PASSED or FAILED)
    function postEntitlementCheckResult(
        bytes32 transactionId,
        uint256 roleId,
        NodeVoteStatus result
    ) external;

    /// @notice Post the result of the entitlement check for a specific role
    /// @dev Only the entitlement checker can call this function
    /// @param transactionId The unique identifier for the transaction
    /// @param roleId The role ID for the entitlement check
    /// @param result The result of the entitlement check (PASSED or FAILED)
    function postEntitlementCheckResultV2(
        bytes32 transactionId,
        uint256 roleId,
        NodeVoteStatus result
    ) external payable;

    /// @notice Get the rule data for a specific transaction and role
    /// @dev Deprecated: Use EntitlementDataQueryable.getCrossChainEntitlementData instead
    /// @param transactionId The unique identifier for the transaction
    /// @param roleId The role ID for the entitlement check
    /// @return The rule data for the transaction and role
    function getRuleData(
        bytes32 transactionId,
        uint256 roleId
    ) external view returns (IRuleEntitlement.RuleData memory);
}

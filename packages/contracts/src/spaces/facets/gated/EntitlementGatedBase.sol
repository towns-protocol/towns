// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGatedBase} from "./IEntitlementGated.sol";

import {IEntitlementChecker} from "src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IImplementationRegistry} from "src/factory/facets/registry/IImplementationRegistry.sol";
import {IRuleEntitlement} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";

// libraries
import {EntitlementGatedStorage} from "./EntitlementGatedStorage.sol";
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

abstract contract EntitlementGatedBase is IEntitlementGatedBase {
    using CustomRevert for bytes4;

    modifier onlyEntitlementChecker() {
        if (msg.sender != address(EntitlementGatedStorage.layout().entitlementChecker)) {
            CustomRevert.revertWith(EntitlementGated_OnlyEntitlementChecker.selector);
        }
        _;
    }

    function _setEntitlementChecker(IEntitlementChecker entitlementChecker) internal {
        EntitlementGatedStorage.layout().entitlementChecker = entitlementChecker;
    }

    function _requestEntitlementCheck(
        address callerAddress,
        bytes32 transactionId,
        IRuleEntitlement entitlement,
        uint256 roleId
    ) internal {
        if (callerAddress == address(0)) {
            CustomRevert.revertWith(EntitlementGated_InvalidAddress.selector);
        }

        EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage.layout();
        Transaction storage transaction = ds.transactions[transactionId];
        if (transaction.finalized) {
            uint256 _length = transaction.roleIds.length;
            for (uint256 i; i < _length; ++i) {
                if (transaction.roleIds[i] == roleId) {
                    revert EntitlementGated_TransactionCheckAlreadyRegistered();
                }
            }
        }

        // if the entitlement checker has not been set, set it
        if (address(ds.entitlementChecker) == address(0)) {
            _setFallbackEntitlementChecker();
        }

        address[] memory selectedNodes = ds.entitlementChecker.getRandomNodes(5);

        if (!transaction.finalized) {
            transaction.finalized = true;
            transaction.entitlement = entitlement;
            transaction.clientAddress = callerAddress;
        }

        transaction.roleIds.push(roleId);

        uint256 length = selectedNodes.length;
        NodeVote[] storage nodeVotesForRole = transaction.nodeVotesArray[roleId];
        for (uint256 i; i < length; ++i) {
            nodeVotesForRole.push(
                NodeVote({node: selectedNodes[i], vote: NodeVoteStatus.NOT_VOTED})
            );
        }

        ds.entitlementChecker.requestEntitlementCheck(
            callerAddress,
            transactionId,
            roleId,
            selectedNodes
        );
    }

    function _postEntitlementCheckResult(
        bytes32 transactionId,
        uint256 roleId,
        NodeVoteStatus result
    ) internal {
        EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage.layout();
        Transaction storage transaction = ds.transactions[transactionId];

        if (transaction.clientAddress == address(0) || transaction.finalized == false) {
            revert EntitlementGated_TransactionNotRegistered();
        }

        if (transaction.isCompleted[roleId]) {
            revert EntitlementGated_TransactionCheckAlreadyCompleted();
        }

        // Find node in the array and update the vote, revert if node was not found.
        bool found;

        // count the votes
        uint256 passed = 0;
        uint256 failed = 0;

        NodeVote[] storage nodeVotesForRole = transaction.nodeVotesArray[roleId];
        uint256 transactionNodesLength = nodeVotesForRole.length;

        for (uint256 i; i < transactionNodesLength; ++i) {
            NodeVote storage currentVote = nodeVotesForRole[i];

            // Update vote if not yet voted
            if (currentVote.node == msg.sender) {
                if (currentVote.vote != NodeVoteStatus.NOT_VOTED) {
                    revert EntitlementGated_NodeAlreadyVoted();
                }
                currentVote.vote = result;
                found = true;
            }

            unchecked {
                NodeVoteStatus currentStatus = currentVote.vote;
                // Count votes
                if (currentStatus == NodeVoteStatus.PASSED) {
                    ++passed;
                } else if (currentStatus == NodeVoteStatus.FAILED) {
                    ++failed;
                }
            }
        }

        if (!found) {
            revert EntitlementGated_NodeNotFound();
        }

        if (passed > transactionNodesLength / 2 || failed > transactionNodesLength / 2) {
            transaction.isCompleted[roleId] = true;
            NodeVoteStatus finalStatusForRole = passed > failed
                ? NodeVoteStatus.PASSED
                : NodeVoteStatus.FAILED;

            bool allRoleIdsCompleted = _checkAllRoleIdsCompleted(transactionId);

            if (finalStatusForRole == NodeVoteStatus.PASSED || allRoleIdsCompleted) {
                _onEntitlementCheckResultPosted(transactionId, finalStatusForRole);
                emit EntitlementCheckResultPosted(transactionId, finalStatusForRole);
            }

            if (allRoleIdsCompleted) {
                _removeTransaction(transactionId);
            }
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           V2                               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Requests a V2 entitlement check with optimized validation and execution
    /// @param walletAddress The wallet address to check entitlements for
    /// @param senderAddress The original sender address (encoded in extraData)
    /// @param transactionId The unique transaction identifier
    /// @param entitlement The entitlement contract to use for checking
    /// @param requestId The specific request identifier
    /// @param value The amount of ETH to send with the request (if any)
    function _requestEntitlementCheckV2(
        address walletAddress,
        address senderAddress,
        bytes32 transactionId,
        IRuleEntitlement entitlement,
        uint256 requestId,
        uint256 value
    ) internal {
        // Validate all inputs upfront
        _validateEntitlementCheckInputs(walletAddress, entitlement, value);

        // Setup transaction state
        EntitlementGatedStorage.Layout storage $ = EntitlementGatedStorage.layout();
        _setupTransaction($.transactions[transactionId], entitlement);

        // Execute the entitlement check request
        _executeEntitlementCheckRequest(
            $.entitlementChecker,
            walletAddress,
            transactionId,
            requestId,
            value,
            abi.encode(senderAddress)
        );
    }

    /// @notice Validates inputs for entitlement check request
    /// @param walletAddress The wallet address being checked
    /// @param entitlement The entitlement contract
    /// @param value The ETH value being sent
    function _validateEntitlementCheckInputs(
        address walletAddress,
        IRuleEntitlement entitlement,
        uint256 value
    ) private view {
        if (value > msg.value) {
            EntitlementGated_InvalidValue.selector.revertWith();
        }
        if (walletAddress == address(0)) {
            EntitlementGated_InvalidAddress.selector.revertWith();
        }
        if (address(entitlement) == address(0)) {
            EntitlementGated_InvalidEntitlement.selector.revertWith();
        }
    }

    /// @notice Sets up transaction state for entitlement checking
    /// @param transaction Storage reference to the transaction
    /// @param entitlement The entitlement contract to associate
    function _setupTransaction(
        Transaction storage transaction,
        IRuleEntitlement entitlement
    ) private {
        transaction.finalized = true;
        transaction.entitlement = entitlement;
    }

    /// @notice Executes the entitlement check request with optimized call pattern
    /// @param checker The entitlement checker contract
    /// @param walletAddress The wallet address to check
    /// @param transactionId The transaction identifier
    /// @param requestId The request identifier
    /// @param value The ETH value to send
    /// @param extraData Encoded additional data
    function _executeEntitlementCheckRequest(
        IEntitlementChecker checker,
        address walletAddress,
        bytes32 transactionId,
        uint256 requestId,
        uint256 value,
        bytes memory extraData
    ) private {
        if (value > 0) {
            checker.requestEntitlementCheckV2{value: value}(
                walletAddress,
                transactionId,
                requestId,
                extraData
            );
        } else {
            checker.requestEntitlementCheckV2(walletAddress, transactionId, requestId, extraData);
        }
    }

    function _postEntitlementCheckResultV2(
        bytes32 transactionId,
        uint256,
        NodeVoteStatus result
    ) internal {
        EntitlementGatedStorage.Layout storage $ = EntitlementGatedStorage.layout();
        Transaction storage transaction = $.transactions[transactionId];

        if (!transaction.finalized) {
            EntitlementGated_TransactionNotRegistered.selector.revertWith();
        }

        emit EntitlementCheckResultPosted(transactionId, result);
        _onEntitlementCheckResultPosted(transactionId, result);
        _removeTransaction(transactionId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Helpers                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _checkAllRoleIdsCompleted(bytes32 transactionId) internal view returns (bool) {
        EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage.layout();

        Transaction storage transaction = ds.transactions[transactionId];
        uint256 roleIdsLength = transaction.roleIds.length;
        for (uint256 i; i < roleIdsLength; ++i) {
            if (!transaction.isCompleted[transaction.roleIds[i]]) {
                return false;
            }
        }
        return true;
    }

    function _removeTransaction(bytes32 transactionId) internal {
        EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage.layout();

        Transaction storage transaction = ds.transactions[transactionId];
        uint256 length = transaction.roleIds.length;
        for (uint256 i; i < length; ++i) {
            delete transaction.nodeVotesArray[transaction.roleIds[i]];
        }
        delete transaction.roleIds;
        delete ds.transactions[transactionId];
    }

    function _getRuleData(
        bytes32 transactionId,
        uint256 roleId
    ) internal view returns (IRuleEntitlement.RuleData memory) {
        EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage.layout();

        Transaction storage transaction = ds.transactions[transactionId];

        if (!transaction.finalized) {
            revert EntitlementGated_TransactionNotRegistered();
        }

        IRuleEntitlement re = IRuleEntitlement(address(transaction.entitlement));
        return re.getRuleData(roleId);
    }

    function _onEntitlementCheckResultPosted(
        bytes32 transactionId,
        NodeVoteStatus result
    ) internal virtual {}

    // TODO: This should be removed in the future when we wipe data
    function _setFallbackEntitlementChecker() internal {
        EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage.layout();
        address entitlementChecker = IImplementationRegistry(
            MembershipStorage.layout().spaceFactory
        ).getLatestImplementation("SpaceOperator");
        ds.entitlementChecker = IEntitlementChecker(entitlementChecker);
    }
}

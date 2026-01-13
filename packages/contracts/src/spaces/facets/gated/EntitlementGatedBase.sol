// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementChecker, IEntitlementCheckerBase} from "../../../base/registry/facets/checker/IEntitlementChecker.sol";
import {IImplementationRegistry} from "../../../factory/facets/registry/IImplementationRegistry.sol";
import {IRuleEntitlement} from "../../entitlements/rule/IRuleEntitlement.sol";
import {IEntitlementGatedBase} from "./IEntitlementGated.sol";

// libraries
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {MembershipStorage} from "../membership/MembershipStorage.sol";
import {EntitlementGatedStorage} from "./EntitlementGatedStorage.sol";

abstract contract EntitlementGatedBase is IEntitlementGatedBase {
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    modifier onlyEntitlementChecker() {
        if (msg.sender != address(EntitlementGatedStorage.layout().entitlementChecker)) {
            EntitlementGated_OnlyEntitlementChecker.selector.revertWith();
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
        if (callerAddress == address(0)) EntitlementGated_InvalidAddress.selector.revertWith();

        EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage.layout();
        Transaction storage transaction = ds.transactions[transactionId];
        if (transaction.finalized) {
            uint256 _length = transaction.roleIds.length;
            for (uint256 i; i < _length; ++i) {
                if (transaction.roleIds[i] == roleId) {
                    EntitlementGated_TransactionCheckAlreadyRegistered.selector.revertWith();
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

    /// @notice Requests a crosschain entitlement check with payment escrow
    /// @dev Stores entitlement reference for RuleData queries, escrows payment with
    /// EntitlementChecker, and emits event for off-chain nodes to process.
    function _requestEntitlementCheck(
        address walletAddress,
        address senderAddress,
        bytes32 transactionId,
        IRuleEntitlement entitlement,
        uint256 requestId,
        address currency,
        uint256 amount
    ) internal {
        if (walletAddress == address(0)) {
            EntitlementGated_InvalidAddress.selector.revertWith();
        }
        if (address(entitlement) == address(0)) {
            EntitlementGated_InvalidEntitlement.selector.revertWith();
        }

        EntitlementGatedStorage.Layout storage $ = EntitlementGatedStorage.layout();
        Transaction storage transaction = $.transactions[transactionId];
        // Only set on first call; subsequent calls for other roleIds reuse existing state
        if (!transaction.finalized) {
            transaction.finalized = true;
            transaction.entitlement = entitlement;
        }

        IEntitlementChecker checker = $.entitlementChecker;
        bytes memory data = abi.encode(
            walletAddress,
            transactionId,
            requestId,
            currency,
            amount,
            senderAddress
        );

        if (currency == CurrencyTransfer.NATIVE_TOKEN) {
            checker.requestEntitlementCheck{value: amount}(
                IEntitlementCheckerBase.CheckType.V3,
                data
            );
        } else {
            if (amount != 0) currency.safeApproveWithRetry(address(checker), amount);
            checker.requestEntitlementCheck(IEntitlementCheckerBase.CheckType.V3, data);
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
